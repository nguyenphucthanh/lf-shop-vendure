import { defineDashboardExtension, z, api } from "@vendure/dashboard";
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
import { SoldDetailPage } from "./sold-detail";
import { SoldListPage } from "./sold-list";
import {
  INTAKE_BY_ID,
  PAYMENT_BY_ID,
  QUOTATION_BY_ID,
  RETURN_BY_ID,
  SOLD_BY_ID,
} from "./shared";
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
      loader: async ({ params, location }) => {
        const searchString = location.search || "";
        const searchParams = new URLSearchParams(searchString);
        let storeId = searchParams.get("storeId") ?? "";
        if (params.id !== "new" && !storeId) {
          const quotation = await api.query(QUOTATION_BY_ID, { id: params.id });
          storeId = quotation?.consignmentQuotation?.storeId ?? "";
        }
        return {
          breadcrumb: [
            {
              label: "Quotations",
              path: `/consignment/quotations?storeId=${storeId}`,
            },
            { label: params.id === "new" ? "New" : "Edit" },
          ],
        };
      },
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
      loader: async ({ params, location }) => {
        const searchString = location.search || "";
        const searchParams = new URLSearchParams(searchString);
        let storeId = searchParams.get("storeId") ?? "";
        if (params.id !== "new" && !storeId) {
          const intake = await api.query(INTAKE_BY_ID, { id: params.id });
          storeId = intake?.consignmentIntake?.storeId ?? "";
        }
        return {
          breadcrumb: [
            {
              label: "Intakes",
              path: `/consignment/intakes?storeId=${storeId}`,
            },
            { label: params.id === "new" ? "New" : "Edit" },
          ],
        };
      },
    },
    {
      path: "/consignment/solds",
      component: (route) => (
        <ConsignmentShell
          route={route}
          activeTab="solds"
          renderContent={(storeId) => <SoldListPage storeId={storeId} />}
        />
      ),
      validateSearch: commonStoreSearchSchema,
    },
    {
      path: "/consignment/solds/$id",
      component: (route) => <SoldDetailPage route={route} />,
      loader: async ({ params, location }) => {
        const searchString = location.search || "";
        const searchParams = new URLSearchParams(searchString);
        let storeId = searchParams.get("storeId") ?? "";
        if (params.id !== "new" && !storeId) {
          const sold = await api.query(SOLD_BY_ID, { id: params.id });
          storeId = sold?.consignmentSold?.storeId ?? "";
        }
        return {
          breadcrumb: [
            {
              label: "Sold",
              path: `/consignment/solds?storeId=${storeId}`,
            },
            { label: params.id === "new" ? "New" : "Edit" },
          ],
        };
      },
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
      loader: async ({ params, location }) => {
        const searchString = location.search || "";
        const searchParams = new URLSearchParams(searchString);
        let storeId = searchParams.get("storeId") ?? "";
        if (params.id !== "new" && !storeId) {
          const payment = await api.query(PAYMENT_BY_ID, { id: params.id });
          storeId = payment?.consignmentPayment?.storeId ?? "";
        }
        return {
          breadcrumb: [
            {
              label: "Payments",
              path: `/consignment/payments?storeId=${storeId}`,
            },
            { label: params.id === "new" ? "New" : "Edit" },
          ],
        };
      },
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
      loader: async ({ params, location }) => {
        const searchString = location.search || "";
        const searchParams = new URLSearchParams(searchString);
        let storeId = searchParams.get("storeId") ?? "";
        if (params.id !== "new" && !storeId) {
          const returnData = await api.query(RETURN_BY_ID, { id: params.id });
          storeId = returnData?.consignmentReturn?.storeId ?? "";
        }
        return {
          breadcrumb: [
            {
              label: "Returns",
              path: `/consignment/returns?storeId=${storeId}`,
            },
            { label: params.id === "new" ? "New" : "Edit" },
          ],
        };
      },
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
