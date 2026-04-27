import { DefaultStockAllocationStrategy, Order, OrderState, RequestContext } from '@vendure/core';

/**
 * Custom stock allocation strategy that skips stock allocation
 * when the Order has `doNotUpdateStock` custom field set to true.
 */
export class ConditionalStockAllocationStrategy extends DefaultStockAllocationStrategy {
    shouldAllocateStock(
        ctx: RequestContext,
        fromState: OrderState,
        toState: OrderState,
        order: Order,
    ): boolean | Promise<boolean> {
        if ((order.customFields as any)?.doNotUpdateStock === true) {
            return false;
        }
        return super.shouldAllocateStock(ctx, fromState, toState, order);
    }
}
