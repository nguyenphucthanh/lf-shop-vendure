import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext, TransactionalConnection, UserInputError } from '@vendure/core';
import { DataSource } from 'typeorm';

import { ConsignmentPayment, PaymentMethod, PaymentStatus } from '../entities/consignment-payment.entity';
import { ConsignmentPaymentItem } from '../entities/consignment-payment-item.entity';
import { ConsignmentQuotation } from '../entities/consignment-quotation.entity';
import { ConsignmentIntakeItem } from '../entities/consignment-intake-item.entity';
import { ConsignmentReturnItem } from '../entities/consignment-return-item.entity';

export interface PaymentItemInput {
    quotationId: ID;
    quantity: number;
    consignmentPriceSnapshot?: number;
}

export interface CreatePaymentInput {
    storeId: ID;
    paymentDate: Date;
    paymentPolicy?: string | null;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    discount?: number;
    paidAmount?: number;
    items: PaymentItemInput[];
}

export interface UpdatePaymentInput extends Partial<Omit<CreatePaymentInput, 'storeId'>> {
    id: ID;
}

@Injectable()
export class ConsignmentPaymentService {
    constructor(private connection: TransactionalConnection) {}

    async findAll(ctx: RequestContext, storeId: ID): Promise<ConsignmentPayment[]> {
        return this.connection.getRepository(ctx, ConsignmentPayment).find({
            where: { storeId },
            relations: ['items', 'items.quotation', 'items.quotation.productVariant'],
            order: { paymentDate: 'DESC' },
        });
    }

    async findOne(ctx: RequestContext, id: ID): Promise<ConsignmentPayment | null> {
        return this.connection.getRepository(ctx, ConsignmentPayment).findOne({
            where: { id },
            relations: ['store', 'items', 'items.quotation', 'items.quotation.productVariant'],
        });
    }

    /**
     * Validates that the total paid + returned quantity for a given quotation
     * does not exceed the total intake quantity, excluding a specific payment being updated.
     */
    private async validateQuantityConstraint(
        ctx: RequestContext,
        storeId: ID,
        items: PaymentItemInput[],
        excludePaymentId?: ID,
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

            const paidQtyQuery = paymentItemRepo
                .createQueryBuilder('pi')
                .innerJoin('pi.payment', 'payment')
                .where('payment.storeId = :storeId', { storeId })
                .andWhere('pi.quotationId = :quotationId', { quotationId: item.quotationId });
            if (excludePaymentId) {
                paidQtyQuery.andWhere('payment.id != :excludePaymentId', { excludePaymentId });
            }
            const paidQty = await paidQtyQuery
                .select('COALESCE(SUM(pi.quantity), 0)', 'total')
                .getRawOne()
                .then(r => Number(r?.total ?? 0));

            const returnedQty = await returnItemRepo
                .createQueryBuilder('ri')
                .innerJoin('ri.consignmentReturn', 'ret')
                .where('ret.storeId = :storeId', { storeId })
                .andWhere('ri.quotationId = :quotationId', { quotationId: item.quotationId })
                .select('COALESCE(SUM(ri.quantity), 0)', 'total')
                .getRawOne()
                .then(r => Number(r?.total ?? 0));

            const available = intakeQty - paidQty - returnedQty;
            if (item.quantity > available) {
                throw new UserInputError(
                    `Quotation ${item.quotationId}: requested quantity ${item.quantity} exceeds available ${available} (intake: ${intakeQty}, paid: ${paidQty}, returned: ${returnedQty}).`,
                );
            }
        }
    }

    async create(ctx: RequestContext, input: CreatePaymentInput): Promise<ConsignmentPayment> {
        await this.validateQuantityConstraint(ctx, input.storeId, input.items);

        const repo = this.connection.getRepository(ctx, ConsignmentPayment);
        const itemRepo = this.connection.getRepository(ctx, ConsignmentPaymentItem);
        const quotationRepo = this.connection.getRepository(ctx, ConsignmentQuotation);

        const payment = repo.create({
            storeId: input.storeId,
            paymentDate: input.paymentDate,
            paymentPolicy: input.paymentPolicy ?? null,
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus,
            subtotal: 0,
            discount: input.discount ?? 0,
            total: 0,
            paidAmount: 0,
            remainingAmount: 0,
        });
        const saved = await repo.save(payment);

        let subtotal = 0;
        for (const itemInput of input.items) {
            const quotation = await quotationRepo.findOne({ where: { id: itemInput.quotationId }, relations: ['productVariant'] });
            if (!quotation) throw new UserInputError(`Quotation ${itemInput.quotationId} not found`);
            const consignmentPriceSnapshot = itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
            const itemSubtotal = consignmentPriceSnapshot * itemInput.quantity;
            await itemRepo.save(itemRepo.create({
                paymentId: saved.id,
                quotationId: quotation.id,
                productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
                consignmentPriceSnapshot,
                quantity: itemInput.quantity,
                subtotal: itemSubtotal,
            }));
            subtotal += itemSubtotal;
        }

        const total = subtotal - saved.discount;
        const paidAmount = input.paidAmount ?? total;
        saved.subtotal = subtotal;
        saved.total = total;
        saved.paidAmount = paidAmount;
        saved.remainingAmount = total - paidAmount;
        await repo.save(saved);

        return (await this.findOne(ctx, saved.id))!;
    }

    async update(ctx: RequestContext, input: UpdatePaymentInput): Promise<ConsignmentPayment> {
        const repo = this.connection.getRepository(ctx, ConsignmentPayment);
        const itemRepo = this.connection.getRepository(ctx, ConsignmentPaymentItem);
        const quotationRepo = this.connection.getRepository(ctx, ConsignmentQuotation);

        const payment = await this.connection.getEntityOrThrow(ctx, ConsignmentPayment, input.id);

        if (input.items !== undefined) {
            await this.validateQuantityConstraint(ctx, payment.storeId, input.items, payment.id);
            await itemRepo.delete({ paymentId: payment.id });
            let subtotal = 0;
            for (const itemInput of input.items) {
                const quotation = await quotationRepo.findOne({ where: { id: itemInput.quotationId }, relations: ['productVariant'] });
                if (!quotation) throw new UserInputError(`Quotation ${itemInput.quotationId} not found`);
                const consignmentPriceSnapshot = itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
                const itemSubtotal = consignmentPriceSnapshot * itemInput.quantity;
                await itemRepo.save(itemRepo.create({
                    paymentId: payment.id,
                    quotationId: quotation.id,
                    productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
                    consignmentPriceSnapshot,
                    quantity: itemInput.quantity,
                    subtotal: itemSubtotal,
                }));
                subtotal += itemSubtotal;
            }
            payment.subtotal = subtotal;
        }

        if (input.paymentDate !== undefined) payment.paymentDate = input.paymentDate;
        if (input.paymentPolicy !== undefined) payment.paymentPolicy = input.paymentPolicy ?? null;
        if (input.paymentMethod !== undefined) payment.paymentMethod = input.paymentMethod;
        if (input.paymentStatus !== undefined) payment.paymentStatus = input.paymentStatus;
        if (input.discount !== undefined) payment.discount = input.discount;

        const total = payment.subtotal - payment.discount;
        payment.total = total;
        const paidAmount = input.paidAmount ?? payment.paidAmount;
        payment.paidAmount = paidAmount;
        payment.remainingAmount = total - paidAmount;

        await repo.save(payment);
        return (await this.findOne(ctx, payment.id))!;
    }

    async delete(ctx: RequestContext, id: ID): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, ConsignmentPayment);
        const payment = await repo.findOne({ where: { id } });
        if (!payment) return false;
        await repo.remove(payment);
        return true;
    }
}
