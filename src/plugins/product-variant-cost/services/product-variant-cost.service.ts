import { CurrencyCode } from "@vendure/common/lib/generated-types";
import { ID } from "@vendure/common/lib/shared-types";
import { Injectable, BadRequestException } from "@nestjs/common";
import { Between } from "typeorm";
import {
  Channel,
  Order,
  RequestContext,
  TransactionalConnection,
} from "@vendure/core";

import { ProductVariantCost } from "../entities/product-variant-cost.entity";

interface OrderLineCustomFields {
  costSnapshot?: number | null;
  costCurrencyCodeSnapshot?: string | null;
}

function isOrderLineCustomFields(obj: unknown): obj is OrderLineCustomFields {
  return obj != null && typeof obj === "object";
}

function getCostSnapshot(customFields: unknown): number {
  if (
    isOrderLineCustomFields(customFields) &&
    typeof customFields.costSnapshot === "number"
  ) {
    return customFields.costSnapshot;
  }
  return 0;
}

function getCostCurrencyCodeSnapshot(customFields: unknown): string | null {
  if (
    isOrderLineCustomFields(customFields) &&
    typeof customFields.costCurrencyCodeSnapshot === "string"
  ) {
    return customFields.costCurrencyCodeSnapshot;
  }
  return null;
}

function getNonEmptyString(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function getEntityName(entity: unknown): string | undefined {
  if (entity == null || typeof entity !== "object") {
    return undefined;
  }

  const maybeName = (entity as { name?: unknown }).name;
  if (typeof maybeName === "string") {
    const trimmed = maybeName.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  const maybeTranslations = (entity as { translations?: unknown }).translations;
  if (!Array.isArray(maybeTranslations)) {
    return undefined;
  }

  for (const translation of maybeTranslations) {
    if (translation != null && typeof translation === "object") {
      const translatedName = (translation as { name?: unknown }).name;
      if (typeof translatedName === "string") {
        const trimmed = translatedName.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
  }

  return undefined;
}

@Injectable()
export class ProductVariantCostService {
  constructor(private connection: TransactionalConnection) {}

  async resolveCostForOrderLine(
    ctx: RequestContext,
    input: {
      variantId: ID;
      channelId: ID;
      orderCurrencyCode: CurrencyCode;
    },
  ): Promise<ProductVariantCost | undefined> {
    const directMatch = await this.findOne(
      ctx,
      input.variantId,
      input.channelId,
      input.orderCurrencyCode,
    );
    if (directMatch) {
      return directMatch;
    }

    const channel = await this.connection.getRepository(ctx, Channel).findOne({
      where: { id: input.channelId },
      select: ["id", "defaultCurrencyCode"],
    });

    if (!channel || channel.defaultCurrencyCode === input.orderCurrencyCode) {
      return undefined;
    }

    const fallback = await this.findOne(
      ctx,
      input.variantId,
      input.channelId,
      channel.defaultCurrencyCode,
    );
    return fallback ?? undefined;
  }

  async getForVariant(
    ctx: RequestContext,
    variantId: ID,
  ): Promise<ProductVariantCost[]> {
    return this.connection.getRepository(ctx, ProductVariantCost).find({
      where: { variantId },
      order: { currencyCode: "ASC" },
    });
  }

  async upsert(
    ctx: RequestContext,
    input: { variantId: ID; channelId: ID; currencyCode: string; cost: number },
  ): Promise<ProductVariantCost> {
    // Validate inputs
    if (!input.variantId || !input.channelId || !input.currencyCode) {
      throw new BadRequestException(
        "variantId, channelId, and currencyCode are required",
      );
    }

    if (
      typeof input.cost !== "number" ||
      input.cost < 0 ||
      !Number.isInteger(input.cost)
    ) {
      throw new BadRequestException("cost must be a non-negative integer");
    }

    // Validate currency code is a valid CurrencyCode
    const validCurrencyCodes = Object.values(CurrencyCode);
    if (!validCurrencyCodes.includes(input.currencyCode as CurrencyCode)) {
      throw new BadRequestException(
        `Invalid currency code: ${input.currencyCode}`,
      );
    }

    const repo = this.connection.getRepository(ctx, ProductVariantCost);
    let record = await repo.findOne({
      where: {
        variantId: input.variantId,
        channelId: input.channelId,
        currencyCode: input.currencyCode as CurrencyCode,
      },
    });
    if (record) {
      record.cost = input.cost;
    } else {
      record = repo.create({
        variantId: input.variantId,
        channelId: input.channelId,
        currencyCode: input.currencyCode as CurrencyCode,
        cost: input.cost,
      });
    }
    return repo.save(record);
  }

  async deleteCost(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ProductVariantCost);
    const record = await repo.findOne({ where: { id } });
    if (!record) {
      return false;
    }
    await repo.remove(record);
    return true;
  }

  private findOne(
    ctx: RequestContext,
    variantId: ID,
    channelId: ID,
    currencyCode: CurrencyCode,
  ): Promise<ProductVariantCost | null> {
    return this.connection.getRepository(ctx, ProductVariantCost).findOne({
      where: {
        variantId,
        channelId,
        currencyCode,
      },
    });
  }

  async getSalesMarginReport(ctx: RequestContext, from: Date, to: Date) {
    if (!ctx.channel?.defaultCurrencyCode) {
      throw new BadRequestException("Channel currency not configured");
    }

    const orders = await this.connection.getRepository(ctx, Order).find({
      where: {
        orderPlacedAt: Between(from, to),
      },
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.translations",
        "lines.productVariant.product",
        "lines.productVariant.product.translations",
      ],
      order: { orderPlacedAt: "DESC" },
    });

    const currencyCode = ctx.channel.defaultCurrencyCode;

    const rows: Array<{
      orderId: string;
      orderCode: string;
      orderDate: Date;
      productName: string;
      variantName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      unitCost: number;
      lineCost: number;
      margin: number;
      currencyCode: string;
    }> = [];

    let totalRevenue = 0;
    let totalCost = 0;
    const orderCodes = new Set<string>();

    for (const order of orders) {
      orderCodes.add(order.code);
      for (const line of order.lines) {
        // Use type guard functions instead of unsafe `any` casts
        const costSnapshot = getCostSnapshot(line.customFields);
        const costCurrencyCode =
          getCostCurrencyCodeSnapshot(line.customFields) ?? currencyCode;

        // Validate required relations are loaded
        if (!line.productVariant) {
          throw new Error(
            `OrderLine ${line.id} missing productVariant relation`,
          );
        }

        const unitPrice = line.unitPriceWithTax;
        const lineTotal = line.linePriceWithTax;
        const unitCost = costSnapshot;
        const lineCost = unitCost * line.quantity;
        const margin = lineTotal - lineCost;
        const resolvedVariantName = getEntityName(line.productVariant);
        const resolvedProductName = getEntityName(line.productVariant.product);
        const variantName =
          getNonEmptyString(resolvedVariantName, line.productVariant.sku) ??
          "Unknown variant";
        const productName =
          getNonEmptyString(
            resolvedProductName,
            resolvedVariantName,
            line.productVariant.sku,
          ) ?? "Unknown product";

        totalRevenue += lineTotal;
        totalCost += lineCost;

        rows.push({
          orderId: String(order.id),
          orderCode: order.code,
          orderDate: order.orderPlacedAt ?? order.createdAt,
          productName,
          variantName,
          sku: line.productVariant.sku,
          quantity: line.quantity,
          unitPrice,
          lineTotal,
          unitCost,
          lineCost,
          margin,
          currencyCode: costCurrencyCode,
        });
      }
    }

    const totalMargin = totalRevenue - totalCost;
    const marginPercent =
      totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      rows,
      summary: {
        totalRevenue,
        totalCost,
        totalMargin,
        marginPercent: Math.round(marginPercent * 100) / 100,
        orderCount: orderCodes.size,
        currencyCode,
      },
    };
  }

  async getSalesByProductVariantReport(
    ctx: RequestContext,
    from: Date,
    to: Date,
  ) {
    if (!ctx.channel?.defaultCurrencyCode) {
      throw new BadRequestException("Channel currency not configured");
    }

    const orders = await this.connection.getRepository(ctx, Order).find({
      where: {
        orderPlacedAt: Between(from, to),
      },
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.translations",
        "lines.productVariant.facetValues",
        "lines.productVariant.facetValues.translations",
        "lines.productVariant.product",
        "lines.productVariant.product.translations",
        "lines.productVariant.product.featuredAsset",
      ],
      order: { orderPlacedAt: "DESC" },
    });

    const currencyCode = ctx.channel.defaultCurrencyCode;

    // Aggregate by variant
    const byVariant = new Map<
      string,
      {
        productId: string | null;
        productFeaturedAssetUrl: string | null;
        variantId: string;
        productName: string;
        variantName: string;
        sku: string;
        totalQuantity: number;
        subtotal: number;
        currencyCode: string;
        facetNames: Set<string>;
      }
    >();

    let totalQuantity = 0;
    let totalRevenue = 0;

    for (const order of orders) {
      for (const line of order.lines) {
        // Validate required relations are loaded
        if (!line.productVariant) {
          throw new Error(
            `OrderLine ${line.id} missing productVariant relation`,
          );
        }

        const variantId = String(line.productVariant.id);
        const productId = line.productVariant.product
          ? String(line.productVariant.product.id)
          : null;
        const productFeaturedAssetUrl =
          line.productVariant.product?.featuredAsset?.preview ?? null;
        const resolvedVariantName = getEntityName(line.productVariant);
        const resolvedProductName = getEntityName(line.productVariant.product);
        const variantName =
          getNonEmptyString(resolvedVariantName, line.productVariant.sku) ??
          "Unknown variant";
        const productName =
          getNonEmptyString(
            resolvedProductName,
            resolvedVariantName,
            line.productVariant.sku,
          ) ?? "Unknown product";
        const sku = line.productVariant.sku;
        const lineTotal = line.linePriceWithTax;

        // Extract facet value names from variant
        const facetNames = new Set<string>();
        for (const facetValue of line.productVariant.facetValues ?? []) {
          const facetName = getEntityName(facetValue);
          if (facetName) {
            facetNames.add(facetName);
          }
        }

        const key = variantId;
        const existing = byVariant.get(key);

        if (existing) {
          existing.totalQuantity += line.quantity;
          existing.subtotal += lineTotal;
          // Merge facet names
          for (const facetName of facetNames) {
            existing.facetNames.add(facetName);
          }
        } else {
          byVariant.set(key, {
            productId,
            productFeaturedAssetUrl,
            variantId,
            productName,
            variantName,
            sku,
            totalQuantity: line.quantity,
            subtotal: lineTotal,
            currencyCode,
            facetNames,
          });
        }

        totalQuantity += line.quantity;
        totalRevenue += lineTotal;
      }
    }

    const rows = Array.from(byVariant.values()).map((row) => ({
      ...row,
      facetNames: Array.from(row.facetNames).sort(),
    }));

    return {
      rows,
      summary: {
        totalVariants: rows.length,
        totalQuantity,
        totalRevenue,
        currencyCode,
      },
    };
  }

  async getSalesByCustomerReport(ctx: RequestContext, from: Date, to: Date) {
    if (!ctx.channel?.defaultCurrencyCode) {
      throw new BadRequestException("Channel currency not configured");
    }

    const orders = await this.connection.getRepository(ctx, Order).find({
      where: {
        orderPlacedAt: Between(from, to),
      },
      relations: ["customer", "lines"],
      order: { orderPlacedAt: "DESC" },
    });

    const currencyCode = ctx.channel.defaultCurrencyCode;

    // Aggregate by customer
    const byCustomer = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        customerEmail: string;
        totalOrders: number;
        totalValue: number;
        currencyCode: string;
      }
    >();

    for (const order of orders) {
      if (!order.customer) {
        continue;
      }

      const customerId = String(order.customer.id);
      const customerName =
        `${order.customer.firstName} ${order.customer.lastName}`.trim() ||
        "Unknown customer";
      const customerEmail = order.customer.emailAddress || "";
      const orderTotal = order.totalWithTax;

      const key = customerId;
      const existing = byCustomer.get(key);

      if (existing) {
        existing.totalOrders += 1;
        existing.totalValue += orderTotal;
      } else {
        byCustomer.set(key, {
          customerId,
          customerName,
          customerEmail,
          totalOrders: 1,
          totalValue: orderTotal,
          currencyCode,
        });
      }
    }

    const rows = Array.from(byCustomer.values()).sort(
      (a, b) => b.totalValue - a.totalValue,
    );

    return rows;
  }

  async getCustomerSalesDetail(ctx: RequestContext, customerId: ID) {
    if (!ctx.channel?.defaultCurrencyCode) {
      throw new BadRequestException("Channel currency not configured");
    }

    const orders = await this.connection.getRepository(ctx, Order).find({
      where: {
        customerId,
      },
      relations: ["customer"],
      order: { orderPlacedAt: "DESC" },
    });

    if (orders.length === 0) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }

    const customer = orders[0]?.customer;
    if (!customer) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }

    const currencyCode = ctx.channel.defaultCurrencyCode;
    let totalOrdersOverall = 0;
    let totalValueOverall = 0;

    for (const order of orders) {
      totalOrdersOverall += 1;
      totalValueOverall += order.totalWithTax;
    }

    // Get latest 3 orders
    const latestOrders = orders.slice(0, 3).map((order) => ({
      id: String(order.id),
      code: order.code,
      orderDate: order.orderPlacedAt ?? order.createdAt,
      total: order.totalWithTax,
      currencyCode,
    }));

    const customerName =
      `${customer.firstName} ${customer.lastName}`.trim() || "Unknown customer";

    return {
      customerId: String(customer.id),
      customerName,
      customerEmail: customer.emailAddress || "",
      totalOrdersOverall,
      totalValueOverall,
      latestOrders,
      currencyCode,
    };
  }

  async getAppliedPromotionsAndSurchargesReport(
    ctx: RequestContext,
    from: Date,
    to: Date,
  ) {
    if (!ctx.channel?.defaultCurrencyCode) {
      throw new BadRequestException("Channel currency not configured");
    }

    const orders = await this.connection.getRepository(ctx, Order).find({
      where: {
        orderPlacedAt: Between(from, to),
      },
      relations: ["lines", "promotions", "surcharges"],
      order: { orderPlacedAt: "DESC" },
    });

    const currencyCode = ctx.channel.defaultCurrencyCode;

    const byPromotion = new Map<
      string,
      {
        promotionName: string;
        code: string;
        totalApplied: number;
        subtotal: number;
        currencyCode: string;
      }
    >();

    let totalUsedPromotions = 0;
    let totalPromotionValue = 0;
    let totalSurcharges = 0;
    let totalSurchargeValue = 0;

    for (const order of orders) {
      totalSurcharges += order.surcharges?.length ?? 0;
      for (const surcharge of order.surcharges ?? []) {
        totalSurchargeValue += surcharge.price;
      }

      const promotionNameById = new Map<string, string>();
      for (const promotion of order.promotions ?? []) {
        promotionNameById.set(String(promotion.id), promotion.name);
      }

      const fallbackCode = (order.couponCodes ?? [])[0] ?? "";
      const orderLevelDiscounts = order.discounts ?? [];
      const lineLevelDiscounts = order.lines.flatMap(
        (line) => line.discounts ?? [],
      );
      const discountsToProcess =
        orderLevelDiscounts.length > 0
          ? orderLevelDiscounts
          : lineLevelDiscounts;

      for (const discount of discountsToProcess) {
        const sourceRaw = discount.adjustmentSource ?? "";
        const source = sourceRaw.toLowerCase();
        const discountType =
          typeof discount.type === "string" ? discount.type.toLowerCase() : "";

        if (!source.includes("promotion") && discountType !== "promotion") {
          continue;
        }

        const promotionPrefix = "promotion:";
        const promotionPrefixIndex = source.indexOf(promotionPrefix);
        const promotionId =
          promotionPrefixIndex >= 0
            ? sourceRaw
                .slice(promotionPrefixIndex + promotionPrefix.length)
                .split(":")[0]
            : "";
        const promotionName =
          promotionNameById.get(promotionId) ??
          getNonEmptyString(discount.description, "Promotion") ??
          "Promotion";

        const amount = Math.abs(discount.amount);
        const key = `${promotionName}::${fallbackCode}`;
        const existing = byPromotion.get(key);

        if (existing) {
          existing.totalApplied += 1;
          existing.subtotal += amount;
        } else {
          byPromotion.set(key, {
            promotionName,
            code: fallbackCode,
            totalApplied: 1,
            subtotal: amount,
            currencyCode,
          });
        }

        totalUsedPromotions += 1;
        totalPromotionValue += amount;
      }
    }

    const rows = Array.from(byPromotion.values()).sort(
      (a, b) => b.subtotal - a.subtotal,
    );

    return {
      rows,
      summary: {
        totalUsedPromotions,
        totalPromotionValue,
        totalSurcharges,
        totalSurchargeValue,
        currencyCode,
      },
    };
  }
}
