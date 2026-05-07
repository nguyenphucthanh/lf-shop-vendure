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
        "lines.productVariant.product",
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
        const variantName =
          getNonEmptyString(
            line.productVariant.name,
            line.productVariant.sku,
          ) ?? "Unknown variant";
        const productName =
          getNonEmptyString(
            line.productVariant.product?.name,
            variantName,
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
}
