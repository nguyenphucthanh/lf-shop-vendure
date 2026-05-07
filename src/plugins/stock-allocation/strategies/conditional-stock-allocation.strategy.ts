import { Logger } from "@nestjs/common";
import {
  DefaultStockAllocationStrategy,
  Order,
  OrderState,
  RequestContext,
} from "@vendure/core";

function hasDoNotUpdateStockFlag(
  obj: unknown,
): obj is { doNotUpdateStock: boolean } {
  return (
    obj != null &&
    typeof obj === "object" &&
    "doNotUpdateStock" in obj &&
    obj.doNotUpdateStock === true
  );
}

/**
 * Custom stock allocation strategy that conditionally skips stock allocation
 * based on the Order's `doNotUpdateStock` custom field.
 *
 * Use this strategy when you have orders (e.g., consignments) that should not
 * automatically update product stock when transitioning states.
 *
 * Requires: Order entity must have a `doNotUpdateStock` boolean custom field.
 *
 * Returns: false (skip allocation) if doNotUpdateStock === true
 *          otherwise delegates to DefaultStockAllocationStrategy
 */
export class ConditionalStockAllocationStrategy extends DefaultStockAllocationStrategy {
  private logger = new Logger(ConditionalStockAllocationStrategy.name);

  shouldAllocateStock(
    ctx: RequestContext,
    fromState: OrderState,
    toState: OrderState,
    order: Order,
  ): boolean | Promise<boolean> {
    const skipAllocation = hasDoNotUpdateStockFlag(order.customFields);

    if (skipAllocation) {
      this.logger.debug(
        `Skipping stock allocation for order ${order.code} (doNotUpdateStock=true)`,
      );
      return false;
    }

    return super.shouldAllocateStock(ctx, fromState, toState, order);
  }
}
