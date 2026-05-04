import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import { ProductVariant, ProductVariantPrice, RequestContext, TransactionalConnection } from '@vendure/core';

import { ConsignmentQuotation } from '../entities/consignment-quotation.entity';

export interface UpsertQuotationInput {
    storeId: ID;
    productVariantId: ID;
    consignmentPrice: number;
    note?: string | null;
}

@Injectable()
export class ConsignmentQuotationService {
    constructor(private connection: TransactionalConnection) {}

    async findAll(ctx: RequestContext, storeId: ID): Promise<ConsignmentQuotation[]> {
        return this.connection.getRepository(ctx, ConsignmentQuotation).find({
            where: { storeId },
            relations: ['productVariant', 'productVariant.translations', 'productVariant.featuredAsset'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(ctx: RequestContext, id: ID): Promise<ConsignmentQuotation | null> {
        return this.connection.getRepository(ctx, ConsignmentQuotation).findOne({
            where: { id },
            relations: ['productVariant', 'productVariant.translations', 'productVariant.featuredAsset', 'store'],
        });
    }

    async create(ctx: RequestContext, input: UpsertQuotationInput): Promise<ConsignmentQuotation> {
        const repo = this.connection.getRepository(ctx, ConsignmentQuotation);
        const priceRepo = this.connection.getRepository(ctx, ProductVariantPrice);
        await this.connection.getEntityOrThrow(ctx, ProductVariant, input.productVariantId);

        // ProductVariant.currencyCode is a hydrated field and may be undefined when loading the entity directly.
        // Read from ProductVariantPrice for the active channel to persist a stable currency snapshot.
        const channelPrice = await priceRepo.findOne({
            where: {
                variant: { id: input.productVariantId },
                channelId: ctx.channelId,
                currencyCode: ctx.currencyCode,
            },
        });
        const fallbackChannelPrice =
            channelPrice ??
            (await priceRepo.findOne({
                where: {
                    variant: { id: input.productVariantId },
                    channelId: ctx.channelId,
                },
            }));

        const currency = fallbackChannelPrice?.currencyCode ?? ctx.channel.defaultCurrencyCode;

        const quotation = repo.create({
            storeId: input.storeId,
            productVariantId: input.productVariantId,
            consignmentPrice: input.consignmentPrice,
            currency,
            note: input.note ?? null,
        });
        return repo.save(quotation);
    }

    async update(ctx: RequestContext, id: ID, input: Partial<UpsertQuotationInput>): Promise<ConsignmentQuotation> {
        const repo = this.connection.getRepository(ctx, ConsignmentQuotation);
        const quotation = await this.connection.getEntityOrThrow(ctx, ConsignmentQuotation, id);
        if (input.consignmentPrice !== undefined) quotation.consignmentPrice = input.consignmentPrice;
        if (input.note !== undefined) quotation.note = input.note ?? null;
        return repo.save(quotation);
    }

    async delete(ctx: RequestContext, id: ID): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, ConsignmentQuotation);
        const quotation = await repo.findOne({ where: { id } });
        if (!quotation) return false;
        await repo.remove(quotation);
        return true;
    }
}
