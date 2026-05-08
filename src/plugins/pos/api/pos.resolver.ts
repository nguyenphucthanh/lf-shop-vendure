import { Args, Mutation, Resolver } from "@nestjs/graphql";
import {
  Allow,
  Ctx,
  Order,
  OrderService,
  Permission,
  RequestContext,
  Transaction,
  UserInputError,
} from "@vendure/core";

const POS_MANUAL_DISCOUNT_SKU = "pos-manual-discount";
const POS_MANUAL_DISCOUNT_DESCRIPTION = "POS custom discount";

@Resolver()
export class PosResolver {
  constructor(private orderService: OrderService) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateOrder)
  async setPosManualDiscount(
    @Ctx() ctx: RequestContext,
    @Args("orderId") orderId: string,
    @Args("amount") amount: number,
    @Args("description", { nullable: true }) descriptionInput?: string | null,
  ): Promise<Order> {
    const order = await this.orderService.findOne(ctx, orderId, [
      "lines",
      "surcharges",
    ]);
    if (!order) {
      throw new UserInputError("Order not found");
    }

    if (order.state !== "Draft") {
      throw new UserInputError(
        "POS manual discount can only be applied to draft orders",
      );
    }

    const normalizedAmount = Math.max(0, Math.round(Math.abs(amount)));

    for (const surcharge of order.surcharges) {
      if (surcharge.sku === POS_MANUAL_DISCOUNT_SKU) {
        await this.orderService.removeSurchargeFromOrder(
          ctx,
          order.id,
          surcharge.id,
        );
      }
    }

    const refreshedOrder = await this.orderService.findOne(ctx, order.id, [
      "lines",
      "surcharges",
    ]);
    if (!refreshedOrder) {
      throw new UserInputError("Order not found after updating surcharge");
    }

    if (normalizedAmount === 0) {
      return refreshedOrder;
    }

    if (normalizedAmount > refreshedOrder.totalWithTax) {
      throw new UserInputError("Discount amount exceeds order total");
    }

    const description = descriptionInput?.trim();

    await this.orderService.addSurchargeToOrder(ctx, refreshedOrder.id, {
      description:
        description && description.length > 0
          ? description
          : POS_MANUAL_DISCOUNT_DESCRIPTION,
      sku: POS_MANUAL_DISCOUNT_SKU,
      listPrice: -normalizedAmount,
      listPriceIncludesTax: true,
      taxLines: [],
    });

    const finalOrder = await this.orderService.findOne(ctx, refreshedOrder.id, [
      "lines",
      "surcharges",
    ]);
    if (!finalOrder) {
      throw new UserInputError("Order not found after applying discount");
    }
    return finalOrder;
  }
}
