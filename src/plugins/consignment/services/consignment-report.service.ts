import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext, TransactionalConnection } from '@vendure/core';

import { ConsignmentIntakeItem } from '../entities/consignment-intake-item.entity';
import { ConsignmentPaymentItem } from '../entities/consignment-payment-item.entity';
import { ConsignmentReturnItem } from '../entities/consignment-return-item.entity';
import { ConsignmentQuotation } from '../entities/consignment-quotation.entity';

export interface ConsignmentReportRow {
    quotationId: ID;
    productVariantId: ID;
    productName: string;
    variantName: string;
    sku: string;
    imageUrl: string | null;
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

    async getReport(ctx: RequestContext, storeId: ID): Promise<ConsignmentReportRow[]> {
        const quotationRepo = this.connection.getRepository(ctx, ConsignmentQuotation);
        const intakeItemRepo = this.connection.getRepository(ctx, ConsignmentIntakeItem);
        const paymentItemRepo = this.connection.getRepository(ctx, ConsignmentPaymentItem);
        const returnItemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);

        const quotations = await quotationRepo.find({
            where: { storeId },
            relations: ['productVariant', 'productVariant.featuredAsset', 'productVariant.translations'],
        });

        const rows: ConsignmentReportRow[] = [];

        for (const quotation of quotations) {
            const variant = quotation.productVariant;

            const intakeAgg = await intakeItemRepo
                .createQueryBuilder('ii')
                .innerJoin('ii.intake', 'intake')
                .where('intake.storeId = :storeId', { storeId })
                .andWhere('ii.quotationId = :qid', { qid: quotation.id })
                .select('COALESCE(SUM(ii.quantity), 0)', 'qty')
                .addSelect('COALESCE(SUM(ii.subtotal), 0)', 'value')
                .getRawOne();

            const paidAgg = await paymentItemRepo
                .createQueryBuilder('pi')
                .innerJoin('pi.payment', 'payment')
                .where('payment.storeId = :storeId', { storeId })
                .andWhere('pi.quotationId = :qid', { qid: quotation.id })
                .select('COALESCE(SUM(pi.quantity), 0)', 'qty')
                .addSelect('COALESCE(SUM(pi.subtotal), 0)', 'value')
                .getRawOne();

            const returnAgg = await returnItemRepo
                .createQueryBuilder('ri')
                .innerJoin('ri.consignmentReturn', 'ret')
                .where('ret.storeId = :storeId', { storeId })
                .andWhere('ri.quotationId = :qid', { qid: quotation.id })
                .select('COALESCE(SUM(ri.quantity), 0)', 'qty')
                .addSelect('COALESCE(SUM(ri.subtotal), 0)', 'value')
                .getRawOne();

            const intakeQty = Number(intakeAgg?.qty ?? 0);
            const intakeValue = Number(intakeAgg?.value ?? 0);
            const paidQty = Number(paidAgg?.qty ?? 0);
            const paidValue = Number(paidAgg?.value ?? 0);
            const returnedQty = Number(returnAgg?.qty ?? 0);
            const returnedValue = Number(returnAgg?.value ?? 0);

            rows.push({
                quotationId: quotation.id,
                productVariantId: variant?.id ?? '',
                productName: (variant as any)?.name ?? '',
                variantName: (variant as any)?.name ?? '',
                sku: variant?.sku ?? '',
                imageUrl: (variant?.featuredAsset as any)?.preview ?? null,
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
