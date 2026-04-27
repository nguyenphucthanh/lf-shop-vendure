import { CurrencyCode } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { Injectable } from '@nestjs/common';
import { Between } from 'typeorm';
import { Channel, Order, OrderLine, RequestContext, TransactionalConnection } from '@vendure/core';

import { ProductVariantCost } from '../entities/product-variant-cost.entity';

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
        const directMatch = await this.findOne(ctx, input.variantId, input.channelId, input.orderCurrencyCode);
        if (directMatch) {
            return directMatch;
        }

        const channel = await this.connection.getRepository(ctx, Channel).findOne({
            where: { id: input.channelId },
            select: ['id', 'defaultCurrencyCode'],
        });

        if (!channel || channel.defaultCurrencyCode === input.orderCurrencyCode) {
            return undefined;
        }

        const fallback = await this.findOne(ctx, input.variantId, input.channelId, channel.defaultCurrencyCode);
        return fallback ?? undefined;
    }

    async getForVariant(ctx: RequestContext, variantId: ID): Promise<ProductVariantCost[]> {
        return this.connection.getRepository(ctx, ProductVariantCost).find({
            where: { variantId },
            order: { currencyCode: 'ASC' },
        });
    }

    async upsert(
        ctx: RequestContext,
        input: { variantId: ID; channelId: ID; currencyCode: string; cost: number },
    ): Promise<ProductVariantCost> {
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

    async getSalesMarginReport(
        ctx: RequestContext,
        from: Date,
        to: Date,
    ) {
        const orders = await this.connection.getRepository(ctx, Order).find({
            where: {
                orderPlacedAt: Between(from, to),
            },
            relations: ['lines', 'lines.productVariant'],
            order: { orderPlacedAt: 'DESC' },
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
                const costSnapshot = (line.customFields as any)?.costSnapshot ?? 0;
                const unitPrice = line.unitPriceWithTax;
                const lineTotal = line.linePriceWithTax;
                const unitCost = costSnapshot;
                const lineCost = unitCost * line.quantity;
                const margin = lineTotal - lineCost;

                totalRevenue += lineTotal;
                totalCost += lineCost;

                rows.push({
                    orderId: String(order.id),
                    orderCode: order.code,
                    orderDate: order.orderPlacedAt ?? order.createdAt,
                    productName: line.productVariant?.name ?? '',
                    variantName: line.productVariant?.name ?? '',
                    sku: line.productVariant?.sku ?? '',
                    quantity: line.quantity,
                    unitPrice,
                    lineTotal,
                    unitCost,
                    lineCost,
                    margin,
                    currencyCode: (line.customFields as any)?.costCurrencyCodeSnapshot ?? currencyCode,
                });
            }
        }

        const totalMargin = totalRevenue - totalCost;
        const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

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
