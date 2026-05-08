import { defineDashboardExtension } from "@vendure/dashboard";
import { BarChartIcon } from "lucide-react";

import { SalesMarginReport } from "./components/sales-margin-report";
import { SalesByProductVariantReport } from "./components/sales-by-product-variant-report";
import { SalesByCustomerReport } from "./components/sales-by-customer-report";
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
    {
      path: "/sales-by-product-variant",
      component: () => <SalesByProductVariantReport />,
      navMenuItem: {
        sectionId: "reports",
        id: "sales-by-product-variant",
        title: "Sales by Product Variant",
      },
    },
    {
      path: "/sales-by-customer",
      component: () => <SalesByCustomerReport />,
      navMenuItem: {
        sectionId: "reports",
        id: "sales-by-customer",
        title: "Sales by Customer",
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
