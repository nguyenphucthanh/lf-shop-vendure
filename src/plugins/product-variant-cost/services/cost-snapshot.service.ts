import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import {
    EventBus,
    ID,
    Order,
    OrderLine,
    OrderPlacedEvent,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';

import { ProductVariantCostService } from './product-variant-cost.service';

interface OrderLineCustomFields {
    costSnapshot?: number | null;
    costCurrencyCodeSnapshot?: string | null;
}

function isOrderLineCustomFields(obj: unknown): obj is OrderLineCustomFields {
    return obj != null && typeof obj === 'object';
}

function hasCostSnapshot(customFields: unknown): boolean {
    if (isOrderLineCustomFields(customFields)) {
        return customFields.costSnapshot != null;
    }
    return false;
}

@Injectable()
export class CostSnapshotService implements OnApplicationBootstrap {
    private logger = new Logger(CostSnapshotService.name);

    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private productVariantCostService: ProductVariantCostService,
    ) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(OrderPlacedEvent).subscribe(event => {
            void this.snapshotOrderLineCosts(event.ctx, event.order.id).catch(error => {
                this.logger.error(
                    `Failed to snapshot costs for order ${event.order.id}: ${error.message}`,
                    error.stack,
                );
            });
        });
    }

    private async snapshotOrderLineCosts(ctx: RequestContext, orderId: ID): Promise<void> {
        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { id: orderId },
            relations: ['lines'],
        });

        if (!order) {
            return;
        }

        // Batch all costs instead of querying per line (N+1 prevention)
        const linesToSnapshot = order.lines.filter(line => !hasCostSnapshot(line.customFields));
        if (linesToSnapshot.length === 0) {
            return;
        }

        const costMap = new Map<string, any>();
        for (const line of linesToSnapshot) {
            const channelId = line.sellerChannelId ?? ctx.channelId;
            const key = `${line.productVariantId}:${channelId}:${order.currencyCode}`;
            
            if (!costMap.has(key)) {
                const cost = await this.productVariantCostService.resolveCostForOrderLine(ctx, {
                    variantId: line.productVariantId,
                    channelId,
                    orderCurrencyCode: order.currencyCode,
                });
                costMap.set(key, cost);
            }
        }

        const linesToUpdate: OrderLine[] = [];
        for (const line of linesToSnapshot) {
            const channelId = line.sellerChannelId ?? ctx.channelId;
            const key = `${line.productVariantId}:${channelId}:${order.currencyCode}`;
            const cost = costMap.get(key);

            if (!cost) {
                continue;
            }

            line.customFields = {
                ...(line.customFields ?? {}),
                costSnapshot: cost.cost,
                costCurrencyCodeSnapshot: cost.currencyCode,
            };
            linesToUpdate.push(line);
        }

        if (linesToUpdate.length > 0) {
            await this.connection.getRepository(ctx, OrderLine).save(linesToUpdate);
        }
    }
}
