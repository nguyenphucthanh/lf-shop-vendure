import { defineDashboardExtension } from "@vendure/dashboard";
import { BarChartIcon } from "lucide-react";

import { CreateOrderButton } from "./components/create-order-button";
import { DoNotUpdateStockBlock } from "./components/do-not-update-stock-block";
import { SalesMarginReport } from "./components/sales-margin-report";
import { VariantCostBlock } from "./components/variant-cost-block";

defineDashboardExtension({
  toolbarItems: [
    {
      id: "create-order",
      component: CreateOrderButton,
      position: { itemId: "alerts", order: "before" },
      requiresPermission: "CreateOrder",
    },
  ],
  navSections: [
    {
      id: "reports",
      title: "Reports",
      icon: BarChartIcon,
      placement: "top",
      order: 350,
    },
  ],
  routes: [
    {
      path: "/sales-margin",
      component: () => <SalesMarginReport />,
      navMenuItem: {
        sectionId: "reports",
        id: "sales-margin",
        title: "Sales Margin",
      },
    },
  ],
  pageBlocks: [
    {
      // pageId: 'product-variant-detail',
      id: "variant-cost-block",
      component: VariantCostBlock,
      location: {
        pageId: "product-variant-detail",
        position: {
          blockId: "price-and-tax",
          order: "after",
        },
        column: "main",
      },
    },
    {
      id: "do-not-update-stock",
      title: "Stock Settings",
      component: DoNotUpdateStockBlock,
      location: {
        pageId: "draft-order-detail",
        position: {
          blockId: "draft-order-status",
          order: "after",
        },
        column: "main",
      },
    },
  ],
});
