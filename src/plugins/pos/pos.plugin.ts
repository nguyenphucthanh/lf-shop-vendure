import { PluginCommonModule, VendurePlugin } from "@vendure/core";

import { adminApiExtensions } from "./api/api-extensions";
import { PosResolver } from "./api/pos.resolver";

@VendurePlugin({
  imports: [PluginCommonModule],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [PosResolver],
  },
  dashboard: "./dashboard/index.tsx",
  compatibility: "^3.0.0",
})
export class PosPlugin {}
