import { defineDashboardExtension } from "@vendure/dashboard";
import { BoxesIcon } from "lucide-react";

import { ConsignmentReportPage } from "./consignment-report";
import { IntakeDetailPage } from "./intake-detail";
import { IntakeListPage } from "./intake-list";
import { PaymentDetailPage } from "./payment-detail";
import { PaymentListPage } from "./payment-list";
import { QuotationDetailPage } from "./quotation-detail";
import { QuotationListPage } from "./quotation-list";
import { ReturnDetailPage } from "./return-detail";
import { ReturnListPage } from "./return-list";

defineDashboardExtension({
  navSections: [
    {
      id: "consignment",
      title: "Consignment",
      icon: BoxesIcon,
      placement: "top",
      order: 360,
    },
  ],
  routes: [
    {
      path: "/consignment/quotations",
      component: () => <QuotationListPage />,
      navMenuItem: {
        sectionId: "consignment",
        id: "consignment-quotations",
        title: "Quotations",
        order: 100,
      },
    },
    {
      path: "/consignment/quotations/$id",
      component: (route) => <QuotationDetailPage route={route} />,
    },
    {
      path: "/consignment/intakes",
      component: () => <IntakeListPage />,
      navMenuItem: {
        sectionId: "consignment",
        id: "consignment-intakes",
        title: "Intakes",
        order: 200,
      },
    },
    {
      path: "/consignment/intakes/$id",
      component: (route) => <IntakeDetailPage route={route} />,
    },
    {
      path: "/consignment/payments",
      component: () => <PaymentListPage />,
      navMenuItem: {
        sectionId: "consignment",
        id: "consignment-payments",
        title: "Payments",
        order: 300,
      },
    },
    {
      path: "/consignment/payments/$id",
      component: (route) => <PaymentDetailPage route={route} />,
    },
    {
      path: "/consignment/returns",
      component: () => <ReturnListPage />,
      navMenuItem: {
        sectionId: "consignment",
        id: "consignment-returns",
        title: "Returns",
        order: 400,
      },
    },
    {
      path: "/consignment/returns/$id",
      component: (route) => <ReturnDetailPage route={route} />,
    },
    {
      path: "/consignment/report",
      component: () => <ConsignmentReportPage />,
      navMenuItem: {
        sectionId: "consignment",
        id: "consignment-report",
        title: "Report",
        order: 500,
      },
    },
  ],
});
