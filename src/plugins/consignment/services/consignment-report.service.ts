import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import { RequestContext, TransactionalConnection } from "@vendure/core";

import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentSoldItem } from "../entities/consignment-sold-item.entity";

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

    const soldByQuotation = new Map<ID, number>();
    for (const row of soldRows) {
      soldByQuotation.set(row.quotationId, Number(row.qty ?? 0));
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

      const intakeQty = intakeByQuotation.get(quotation.id) ?? 0;
      const soldQty = soldByQuotation.get(quotation.id) ?? 0;
      const returnedQty = returnedByQuotation.get(quotation.id) ?? 0;

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

  private async loadQuantityByQuotation(
    repository: ReturnType<TransactionalConnection["getRepository"]>,
    rootAlias: string,
    relationPath: string,
    relationAlias: string,
    storeId: ID,
    quotationIds: ID[],
  ): Promise<Map<ID, number>> {
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

    const byQuotation = new Map<ID, number>();
    for (const row of rows) {
      byQuotation.set(row.quotationId, Number(row.qty ?? 0));
    }
    return byQuotation;
  }
}
