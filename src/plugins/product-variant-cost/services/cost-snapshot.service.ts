import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
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

@Injectable()
export class CostSnapshotService implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private productVariantCostService: ProductVariantCostService,
    ) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(OrderPlacedEvent).subscribe(event => {
            void this.snapshotOrderLineCosts(event.ctx, event.order.id);
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

        const linesToUpdate: OrderLine[] = [];

        for (const line of order.lines) {
            const customFields = (line.customFields ?? {}) as {
                costSnapshot?: number | null;
                costCurrencyCodeSnapshot?: string | null;
            };
            const existingSnapshot = customFields.costSnapshot;
            if (existingSnapshot != null) {
                continue;
            }

            const channelId = line.sellerChannelId ?? ctx.channelId;
            const cost = await this.productVariantCostService.resolveCostForOrderLine(ctx, {
                variantId: line.productVariantId,
                channelId,
                orderCurrencyCode: order.currencyCode,
            });

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
