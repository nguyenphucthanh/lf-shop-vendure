import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  Allow,
  Ctx,
  Permission,
  RequestContext,
  Transaction,
} from "@vendure/core";

import { ProductVariantCostService } from "../services/product-variant-cost.service";

@Resolver()
export class ProductVariantCostAdminResolver {
  constructor(private costService: ProductVariantCostService) {}

  @Query()
  @Allow(Permission.ReadCatalog)
  async productVariantCosts(
    @Ctx() ctx: RequestContext,
    @Args("variantId") variantId: string,
  ) {
    return this.costService.getForVariant(ctx, variantId);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateCatalog)
  async upsertProductVariantCost(
    @Ctx() ctx: RequestContext,
    @Args("input")
    input: {
      variantId: string;
      channelId: string;
      currencyCode: string;
      cost: number;
    },
  ) {
    return this.costService.upsert(ctx, input);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateCatalog)
  async deleteProductVariantCost(
    @Ctx() ctx: RequestContext,
    @Args("id") id: string,
  ) {
    return this.costService.deleteCost(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadOrder)
  async salesMarginReport(
    @Ctx() ctx: RequestContext,
    @Args("from") from: string,
    @Args("to") to: string,
  ) {
    return this.costService.getSalesMarginReport(
      ctx,
      new Date(from),
      new Date(to),
    );
  }
}
