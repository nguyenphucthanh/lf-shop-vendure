import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import { RequestContext, TransactionalConnection } from "@vendure/core";

import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentPaymentItem } from "../entities/consignment-payment-item.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";

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
  intakeValue: number;
  paidQty: number;
  paidValue: number;
  returnedQty: number;
  returnedValue: number;
  debtQty: number;
  debtValue: number;
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
    const paymentItemRepo = this.connection.getRepository(
      ctx,
      ConsignmentPaymentItem,
    );
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
      const featuredAsset = variant?.featuredAsset as any;
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

      const intakeAgg = await intakeItemRepo
        .createQueryBuilder("ii")
        .innerJoin("ii.intake", "intake")
        .where("intake.storeId = :storeId", { storeId })
        .andWhere("ii.quotationId = :qid", { qid: quotation.id })
        .select("COALESCE(SUM(ii.quantity), 0)", "qty")
        .addSelect("COALESCE(SUM(ii.subtotal), 0)", "value")
        .getRawOne();

      const paidAgg = await paymentItemRepo
        .createQueryBuilder("pi")
        .innerJoin("pi.payment", "payment")
        .where("payment.storeId = :storeId", { storeId })
        .andWhere("pi.quotationId = :qid", { qid: quotation.id })
        .select("COALESCE(SUM(pi.quantity), 0)", "qty")
        .addSelect("COALESCE(SUM(pi.subtotal), 0)", "value")
        .getRawOne();

      const returnAgg = await returnItemRepo
        .createQueryBuilder("ri")
        .innerJoin("ri.consignmentReturn", "ret")
        .where("ret.storeId = :storeId", { storeId })
        .andWhere("ri.quotationId = :qid", { qid: quotation.id })
        .select("COALESCE(SUM(ri.quantity), 0)", "qty")
        .addSelect("COALESCE(SUM(ri.subtotal), 0)", "value")
        .getRawOne();

      const intakeQty = Number(intakeAgg?.qty ?? 0);
      const intakeValue = Number(intakeAgg?.value ?? 0);
      const paidQty = Number(paidAgg?.qty ?? 0);
      const paidValue = Number(paidAgg?.value ?? 0);
      const returnedQty = Number(returnAgg?.qty ?? 0);
      const returnedValue = Number(returnAgg?.value ?? 0);

      rows.push({
        quotationId: quotation.id,
        productVariantId: variant?.id ?? "",
        productNameTranslations,
        variantNameTranslations,
        sku: variant?.sku ?? "",
        featuredAsset: reportFeaturedAsset,
        consignmentPrice: quotation.consignmentPrice,
        intakeQty,
        intakeValue,
        paidQty,
        paidValue,
        returnedQty,
        returnedValue,
        debtQty: intakeQty - paidQty - returnedQty,
        debtValue: intakeValue - paidValue - returnedValue,
      });
    }

    return rows;
  }
}
