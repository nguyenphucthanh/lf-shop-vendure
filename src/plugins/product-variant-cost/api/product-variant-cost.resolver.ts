import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext, Transaction } from '@vendure/core';

import { ProductVariantCostService } from '../services/product-variant-cost.service';

@Resolver()
export class ProductVariantCostAdminResolver {
    constructor(private costService: ProductVariantCostService) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    async productVariantCosts(
        @Ctx() ctx: RequestContext,
        @Args() args: { variantId: string },
    ) {
        return this.costService.getForVariant(ctx, args.variantId);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async upsertProductVariantCost(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: { variantId: string; channelId: string; currencyCode: string; cost: number } },
    ) {
        return this.costService.upsert(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async deleteProductVariantCost(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: string },
    ) {
        return this.costService.deleteCost(ctx, args.id);
    }

    @Query()
    @Allow(Permission.ReadOrder)
    async salesMarginReport(
        @Ctx() ctx: RequestContext,
        @Args() args: { from: string; to: string },
    ) {
        return this.costService.getSalesMarginReport(ctx, new Date(args.from), new Date(args.to));
    }
}
