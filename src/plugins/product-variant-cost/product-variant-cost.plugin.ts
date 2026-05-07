import { PluginCommonModule, VendurePlugin } from "@vendure/core";

import { adminApiExtensions } from "./api/api-extensions";
import { ProductVariantCostAdminResolver } from "./api/product-variant-cost.resolver";
import { ProductVariantCost } from "./entities/product-variant-cost.entity";
import { CostSnapshotService } from "./services/cost-snapshot.service";
import { ProductVariantCostService } from "./services/product-variant-cost.service";

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ProductVariantCost],
  providers: [ProductVariantCostService, CostSnapshotService],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [ProductVariantCostAdminResolver],
  },
  dashboard: "./dashboard/index.tsx",
  compatibility: "^3.0.0",
})
export class ProductVariantCostPlugin {}
