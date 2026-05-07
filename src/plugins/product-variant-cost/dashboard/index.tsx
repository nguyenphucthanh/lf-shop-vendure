import { defineDashboardExtension } from "@vendure/dashboard";
import { BarChartIcon } from "lucide-react";

import { SalesMarginReport } from "./components/sales-margin-report";
import { VariantCostBlock } from "./components/variant-cost-block";

defineDashboardExtension({
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
  ],
});
