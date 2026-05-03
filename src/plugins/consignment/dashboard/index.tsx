import { defineDashboardExtension, z } from "@vendure/dashboard";
import { BoxesIcon } from "lucide-react";

import { ConsignmentShell } from "./consignment-shell";
import { ConsignmentReportPage } from "./consignment-report";
import { IntakeDetailPage } from "./intake-detail";
import { IntakeListPage } from "./intake-list";
import { PaymentDetailPage } from "./payment-detail";
import { PaymentListPage } from "./payment-list";
import { QuotationDetailPage } from "./quotation-detail";
import { QuotationListPage } from "./quotation-list";
import { ReturnDetailPage } from "./return-detail";
import { ReturnListPage } from "./return-list";
const commonStoreSearchSchema = z.object({
  storeId: z.union([z.string(), z.number()]).optional(),
});

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
      path: "/consignment",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="quotations"
          renderContent={(storeId) => <QuotationListPage storeId={storeId} />}
        />
      ),
      validateSearch: commonStoreSearchSchema,
      navMenuItem: {
        sectionId: "consignment",
        id: "consignment",
        title: "Consignment",
        order: 100,
      },
    },
    {
      path: "/consignment/quotations",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="quotations"
          renderContent={(storeId) => <QuotationListPage storeId={storeId} />}
        />
      ),
      validateSearch: commonStoreSearchSchema,
    },
    {
      path: "/consignment/quotations/$id",
      component: (route) => <QuotationDetailPage route={route} />,
    },
    {
      path: "/consignment/intakes",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="intakes"
          renderContent={(storeId) => <IntakeListPage storeId={storeId} />}
        />
      ),
      validateSearch: commonStoreSearchSchema,
    },
    {
      path: "/consignment/intakes/$id",
      component: (route) => <IntakeDetailPage route={route} />,
    },
    {
      path: "/consignment/payments",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="payments"
          renderContent={(storeId) => <PaymentListPage storeId={storeId} />}
        />
      ),
      validateSearch: commonStoreSearchSchema,
    },
    {
      path: "/consignment/payments/$id",
      component: (route) => <PaymentDetailPage route={route} />,
    },
    {
      path: "/consignment/returns",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="returns"
          renderContent={(storeId) => <ReturnListPage storeId={storeId} />}
        />
      ),
      validateSearch: commonStoreSearchSchema,
    },
    {
      path: "/consignment/returns/$id",
      component: (route) => <ReturnDetailPage route={route} />,
    },
    {
      path: "/consignment/report",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="report"
          renderContent={(storeId) => (
            <ConsignmentReportPage storeId={storeId} />
          )}
        />
      ),
      validateSearch: commonStoreSearchSchema,
    },
  ],
});
