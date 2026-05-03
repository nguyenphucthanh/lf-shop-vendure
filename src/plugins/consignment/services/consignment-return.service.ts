import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext, TransactionalConnection, UserInputError } from '@vendure/core';

import { ConsignmentReturn } from '../entities/consignment-return.entity';
import { ConsignmentReturnItem } from '../entities/consignment-return-item.entity';
import { ConsignmentQuotation } from '../entities/consignment-quotation.entity';
import { ConsignmentIntakeItem } from '../entities/consignment-intake-item.entity';
import { ConsignmentPaymentItem } from '../entities/consignment-payment-item.entity';

export interface ReturnItemInput {
    quotationId: ID;
    quantity: number;
    consignmentPriceSnapshot?: number;
}

export interface CreateReturnInput {
    storeId: ID;
    returnedDate: Date;
    reason?: string | null;
    items: ReturnItemInput[];
}

export interface UpdateReturnInput extends Partial<Omit<CreateReturnInput, 'storeId'>> {
    id: ID;
}

@Injectable()
export class ConsignmentReturnService {
    constructor(private connection: TransactionalConnection) {}

    async findAll(ctx: RequestContext, storeId: ID): Promise<ConsignmentReturn[]> {
        return this.connection.getRepository(ctx, ConsignmentReturn).find({
            where: { storeId },
            relations: ['items', 'items.quotation', 'items.quotation.productVariant'],
            order: { returnedDate: 'DESC' },
        });
    }

    async findOne(ctx: RequestContext, id: ID): Promise<ConsignmentReturn | null> {
        return this.connection.getRepository(ctx, ConsignmentReturn).findOne({
            where: { id },
            relations: ['store', 'items', 'items.quotation', 'items.quotation.productVariant'],
        });
    }

    private async validateQuantityConstraint(
        ctx: RequestContext,
        storeId: ID,
        items: ReturnItemInput[],
        excludeReturnId?: ID,
    ): Promise<void> {
        const intakeItemRepo = this.connection.getRepository(ctx, ConsignmentIntakeItem);
        const paymentItemRepo = this.connection.getRepository(ctx, ConsignmentPaymentItem);
        const returnItemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);

        for (const item of items) {
            const intakeQty = await intakeItemRepo
                .createQueryBuilder('ii')
                .innerJoin('ii.intake', 'intake')
                .where('intake.storeId = :storeId', { storeId })
                .andWhere('ii.quotationId = :quotationId', { quotationId: item.quotationId })
                .select('COALESCE(SUM(ii.quantity), 0)', 'total')
                .getRawOne()
                .then(r => Number(r?.total ?? 0));

            const paidQty = await paymentItemRepo
                .createQueryBuilder('pi')
                .innerJoin('pi.payment', 'payment')
                .where('payment.storeId = :storeId', { storeId })
                .andWhere('pi.quotationId = :quotationId', { quotationId: item.quotationId })
                .select('COALESCE(SUM(pi.quantity), 0)', 'total')
                .getRawOne()
                .then(r => Number(r?.total ?? 0));

            const returnedQtyQuery = returnItemRepo
                .createQueryBuilder('ri')
                .innerJoin('ri.consignmentReturn', 'ret')
                .where('ret.storeId = :storeId', { storeId })
                .andWhere('ri.quotationId = :quotationId', { quotationId: item.quotationId });
            if (excludeReturnId) {
                returnedQtyQuery.andWhere('ret.id != :excludeReturnId', { excludeReturnId });
            }
            const returnedQty = await returnedQtyQuery
                .select('COALESCE(SUM(ri.quantity), 0)', 'total')
                .getRawOne()
                .then(r => Number(r?.total ?? 0));

            const available = intakeQty - paidQty - returnedQty;
            if (item.quantity > available) {
                throw new UserInputError(
                    `Quotation ${item.quotationId}: requested return quantity ${item.quantity} exceeds available ${available}.`,
                );
            }
        }
    }

    async create(ctx: RequestContext, input: CreateReturnInput): Promise<ConsignmentReturn> {
        await this.validateQuantityConstraint(ctx, input.storeId, input.items);

        const repo = this.connection.getRepository(ctx, ConsignmentReturn);
        const itemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);
        const quotationRepo = this.connection.getRepository(ctx, ConsignmentQuotation);

        const ret = repo.create({
            storeId: input.storeId,
            returnedDate: input.returnedDate,
            reason: input.reason ?? null,
            total: 0,
        });
        const saved = await repo.save(ret);

        let total = 0;
        for (const itemInput of input.items) {
            const quotation = await quotationRepo.findOne({ where: { id: itemInput.quotationId }, relations: ['productVariant'] });
            if (!quotation) throw new UserInputError(`Quotation ${itemInput.quotationId} not found`);
            const consignmentPriceSnapshot = itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
            const itemSubtotal = consignmentPriceSnapshot * itemInput.quantity;
            await itemRepo.save(itemRepo.create({
                consignmentReturnId: saved.id,
                quotationId: quotation.id,
                productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
                consignmentPriceSnapshot,
                quantity: itemInput.quantity,
                subtotal: itemSubtotal,
            }));
            total += itemSubtotal;
        }

        saved.total = total;
        await repo.save(saved);
        return (await this.findOne(ctx, saved.id))!;
    }

    async update(ctx: RequestContext, input: UpdateReturnInput): Promise<ConsignmentReturn> {
        const repo = this.connection.getRepository(ctx, ConsignmentReturn);
        const itemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);
        const quotationRepo = this.connection.getRepository(ctx, ConsignmentQuotation);

        const ret = await this.connection.getEntityOrThrow(ctx, ConsignmentReturn, input.id);

        if (input.items !== undefined) {
            await this.validateQuantityConstraint(ctx, ret.storeId, input.items, ret.id);
            await itemRepo.delete({ consignmentReturnId: ret.id });
            let total = 0;
            for (const itemInput of input.items) {
                const quotation = await quotationRepo.findOne({ where: { id: itemInput.quotationId }, relations: ['productVariant'] });
                if (!quotation) throw new UserInputError(`Quotation ${itemInput.quotationId} not found`);
                const consignmentPriceSnapshot = itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
                const itemSubtotal = consignmentPriceSnapshot * itemInput.quantity;
                await itemRepo.save(itemRepo.create({
                    consignmentReturnId: ret.id,
                    quotationId: quotation.id,
                    productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
                    consignmentPriceSnapshot,
                    quantity: itemInput.quantity,
                    subtotal: itemSubtotal,
                }));
                total += itemSubtotal;
            }
            ret.total = total;
        }

        if (input.returnedDate !== undefined) ret.returnedDate = input.returnedDate;
        if (input.reason !== undefined) ret.reason = input.reason ?? null;

        await repo.save(ret);
        return (await this.findOne(ctx, ret.id))!;
    }

    async delete(ctx: RequestContext, id: ID): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, ConsignmentReturn);
        const ret = await repo.findOne({ where: { id } });
        if (!ret) return false;
        await repo.remove(ret);
        return true;
    }
}
