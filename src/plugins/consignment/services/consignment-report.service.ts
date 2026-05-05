import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import { RequestContext, TransactionalConnection } from "@vendure/core";

import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentSoldItem } from "../entities/consignment-sold-item.entity";
import { ConsignmentPayment } from "../entities/consignment-payment.entity";

export interface ConsignmentReportRow {
  quotationId: ID;
  productVariantId: ID;
  productNameTranslations: Array<{ languageCode: string; name: string }>;
  variantNameTranslations: Array<{ languageCode: string; name: string }>;
  sku: string;
  featuredAsset: {
    id: ID;
    preview: string;
    source: string;
    width: number;
    height: number;
    name: string;
  } | null;
  consignmentPrice: number;
  intakeQty: number;
  soldQty: number;
  returnedQty: number;
  debtQty: number;
}

interface QuantityAggregateRow {
  quotationId: ID;
  qty: string;
}

interface VariantAggregateRow {
  productVariantId: string | number;
  qty: string;
}

type AssetSnapshot = {
  id: ID;
  preview: string;
  source: string;
  width: number;
  height: number;
  name: string;
};

type TranslationEntry = { languageCode: string; name: string };

export interface ConsignmentTotalReportVariantRow {
  productVariantId: ID;
  productNameTranslations: TranslationEntry[];
  variantNameTranslations: TranslationEntry[];
  sku: string;
  featuredAsset: AssetSnapshot | null;
  totalIntakeQty: number;
  totalSoldQty: number;
  totalReturnedQty: number;
}

export interface ConsignmentTotalReportSummary {
  totalStores: number;
  totalCollectedPayments: number;
  totalIntakeItems: number;
}

export interface ConsignmentTotalReportResult {
  summary: ConsignmentTotalReportSummary;
  rows: ConsignmentTotalReportVariantRow[];
}

@Injectable()
export class ConsignmentReportService {
  constructor(private connection: TransactionalConnection) {}

  async getReport(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentReportRow[]> {
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );
    const intakeItemRepo = this.connection.getRepository(
      ctx,
      ConsignmentIntakeItem,
    );
    const soldItemRepo = this.connection.getRepository(ctx, ConsignmentSoldItem);
    const returnItemRepo = this.connection.getRepository(
      ctx,
      ConsignmentReturnItem,
    );

    const quotations = await quotationRepo.find({
      where: { storeId },
      relations: [
        "productVariant",
        "productVariant.product",
        "productVariant.product.translations",
        "productVariant.translations",
        "productVariant.featuredAsset",
      ],
    });

    if (quotations.length === 0) {
      return [];
    }

    const quotationIds = quotations.map((quotation) => quotation.id);

    const intakeByQuotation = await this.loadQuantityByQuotation(
      intakeItemRepo,
      "ii",
      "ii.intake",
      "intake",
      storeId,
      quotationIds,
    );

    const soldRows = (await soldItemRepo
      .createQueryBuilder("si")
      .innerJoin("si.sold", "sold")
      .where("sold.storeId = :storeId", { storeId })
      .andWhere("si.quotationId IN (:...quotationIds)", {
        quotationIds,
      })
      .select("si.quotationId", "quotationId")
      .addSelect("COALESCE(SUM(si.quantity), 0)", "qty")
      .groupBy("si.quotationId")
      .getRawMany()) as QuantityAggregateRow[];

    const soldByQuotation = new Map<string, number>();
    for (const row of soldRows) {
      soldByQuotation.set(String(row.quotationId), Number(row.qty ?? 0));
    }

    const returnedByQuotation = await this.loadQuantityByQuotation(
      returnItemRepo,
      "ri",
      "ri.consignmentReturn",
      "ret",
      storeId,
      quotationIds,
    );

    const rows: ConsignmentReportRow[] = [];

    for (const quotation of quotations) {
      const variant = quotation.productVariant;
      const product = variant?.product;

      // Collect product name translations
      const productNameTranslations: Array<{
        languageCode: string;
        name: string;
      }> = [];
      if (product?.name) {
        // Vendure returns name in current language context, add it with empty languageCode as fallback
        productNameTranslations.push({
          languageCode: "",
          name: product.name as any,
        });
      }
      if (Array.isArray(product?.translations)) {
        for (const translation of product.translations) {
          productNameTranslations.push({
            languageCode: translation.languageCode,
            name: translation.name as any,
          });
        }
      }

      // Collect variant name translations
      const variantNameTranslations: Array<{
        languageCode: string;
        name: string;
      }> = [];
      if (variant?.name) {
        // Vendure returns name in current language context, add it with empty languageCode as fallback
        variantNameTranslations.push({
          languageCode: "",
          name: variant.name as any,
        });
      }
      if (Array.isArray(variant?.translations)) {
        for (const translation of variant.translations) {
          variantNameTranslations.push({
            languageCode: translation.languageCode,
            name: translation.name as any,
          });
        }
      }

      // Return full featured asset for frontend rendering with VendureImage
      const featuredAsset = variant?.featuredAsset;
      const reportFeaturedAsset = featuredAsset
        ? {
            id: featuredAsset.id,
            preview: featuredAsset.preview,
            source: featuredAsset.source,
            width: featuredAsset.width,
            height: featuredAsset.height,
            name: featuredAsset.name,
          }
        : null;

      const intakeQty = intakeByQuotation.get(String(quotation.id)) ?? 0;
      const soldQty = soldByQuotation.get(String(quotation.id)) ?? 0;
      const returnedQty = returnedByQuotation.get(String(quotation.id)) ?? 0;

      rows.push({
        quotationId: quotation.id,
        productVariantId: variant?.id ?? "",
        productNameTranslations,
        variantNameTranslations,
        sku: variant?.sku ?? "",
        featuredAsset: reportFeaturedAsset,
        consignmentPrice: quotation.consignmentPrice,
        intakeQty,
        soldQty,
        returnedQty,
        debtQty: intakeQty - soldQty - returnedQty,
      });
    }

    return rows;
  }

  async getTotalReport(ctx: RequestContext): Promise<ConsignmentTotalReportResult> {
    const quotationRepo = this.connection.getRepository(ctx, ConsignmentQuotation);
    const intakeItemRepo = this.connection.getRepository(ctx, ConsignmentIntakeItem);
    const soldItemRepo = this.connection.getRepository(ctx, ConsignmentSoldItem);
    const returnItemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);
    const paymentRepo = this.connection.getRepository(ctx, ConsignmentPayment);

    // Run all independent aggregate queries + quotation fetch in parallel
    const [
      storeCountRaw,
      collectedRaw,
      intakeQtyRaw,
      quotations,
      intakeMap,
      soldMap,
      returnedMap,
    ] = await Promise.all([
      quotationRepo
        .createQueryBuilder("q")
        .select("COUNT(DISTINCT q.storeId)", "count")
        .getRawOne() as Promise<{ count: string }>,
      paymentRepo
        .createQueryBuilder("p")
        .where("p.paymentStatus = :status", { status: "Completed" })
        .select("COALESCE(SUM(p.total), 0)", "total")
        .getRawOne() as Promise<{ total: string }>,
      intakeItemRepo
        .createQueryBuilder("ii")
        .select("COALESCE(SUM(ii.quantity), 0)", "qty")
        .getRawOne() as Promise<{ qty: string }>,
      quotationRepo.find({
        relations: [
          "productVariant",
          "productVariant.product",
          "productVariant.product.translations",
          "productVariant.translations",
          "productVariant.featuredAsset",
        ],
        order: { createdAt: "ASC" },
      }),
      this.loadQuantityByVariant(intakeItemRepo, "ii"),
      this.loadQuantityByVariant(soldItemRepo, "si"),
      this.loadQuantityByVariant(returnItemRepo, "ri"),
    ]);

    const totalStores = Number(storeCountRaw?.count ?? 0);
    const totalCollectedPayments = Number(collectedRaw?.total ?? 0);
    const totalIntakeItems = Number(intakeQtyRaw?.qty ?? 0);

    // Deduplicate by productVariantId; quotations are ordered by createdAt so the
    // oldest quotation's variant info is used consistently across loads.
    const seenVariantIds = new Set<string>();
    const rows: ConsignmentTotalReportVariantRow[] = [];

    for (const quotation of quotations) {
      const variantId = String(quotation.productVariantId);
      if (seenVariantIds.has(variantId)) continue;
      seenVariantIds.add(variantId);

      const variant = quotation.productVariant;
      const product = variant?.product;

      const productNameTranslations: TranslationEntry[] = [];
      if (product?.name) {
        productNameTranslations.push({ languageCode: "", name: String(product.name) });
      }
      if (Array.isArray(product?.translations)) {
        for (const t of product.translations) {
          productNameTranslations.push({ languageCode: t.languageCode, name: String(t.name) });
        }
      }

      const variantNameTranslations: TranslationEntry[] = [];
      if (variant?.name) {
        variantNameTranslations.push({ languageCode: "", name: String(variant.name) });
      }
      if (Array.isArray(variant?.translations)) {
        for (const t of variant.translations) {
          variantNameTranslations.push({ languageCode: t.languageCode, name: String(t.name) });
        }
      }

      const featuredAsset = variant?.featuredAsset;
      rows.push({
        productVariantId: variantId,
        productNameTranslations,
        variantNameTranslations,
        sku: variant?.sku ?? "",
        featuredAsset: featuredAsset
          ? { id: featuredAsset.id, preview: featuredAsset.preview, source: featuredAsset.source, width: featuredAsset.width, height: featuredAsset.height, name: featuredAsset.name }
          : null,
        totalIntakeQty: intakeMap.get(variantId) ?? 0,
        totalSoldQty: soldMap.get(variantId) ?? 0,
        totalReturnedQty: returnedMap.get(variantId) ?? 0,
      });
    }

    return {
      summary: { totalStores, totalCollectedPayments, totalIntakeItems },
      rows,
    };
  }

  private async loadQuantityByQuotation(
    repository: ReturnType<TransactionalConnection["getRepository"]>,
    rootAlias: string,
    relationPath: string,
    relationAlias: string,
    storeId: ID,
    quotationIds: ID[],
  ): Promise<Map<string, number>> {
    const rows = (await repository
      .createQueryBuilder(rootAlias)
      .innerJoin(relationPath, relationAlias)
      .where(`${relationAlias}.storeId = :storeId`, { storeId })
      .andWhere(`${rootAlias}.quotationId IN (:...quotationIds)`, {
        quotationIds,
      })
      .select(`${rootAlias}.quotationId`, "quotationId")
      .addSelect(`COALESCE(SUM(${rootAlias}.quantity), 0)`, "qty")
      .groupBy(`${rootAlias}.quotationId`)
      .getRawMany()) as QuantityAggregateRow[];

    const byQuotation = new Map<string, number>();
    for (const row of rows) {
      byQuotation.set(String(row.quotationId), Number(row.qty ?? 0));
    }
    return byQuotation;
  }

  /** Aggregates item quantity across ALL stores, grouped by the quotation's productVariantId. */
  private async loadQuantityByVariant(
    repository: ReturnType<TransactionalConnection["getRepository"]>,
    alias: string,
  ): Promise<Map<string, number>> {
    const rows = (await repository
      .createQueryBuilder(alias)
      .innerJoin(`${alias}.quotation`, "q")
      .select("q.productVariantId", "productVariantId")
      .addSelect(`COALESCE(SUM(${alias}.quantity), 0)`, "qty")
      .groupBy("q.productVariantId")
      .getRawMany()) as VariantAggregateRow[];

    const byVariant = new Map<string, number>();
    for (const row of rows) {
      byVariant.set(String(row.productVariantId), Number(row.qty ?? 0));
    }
    return byVariant;
  }
}
