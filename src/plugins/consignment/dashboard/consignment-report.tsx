import {
  Alert,
  AlertDescription,
  api,
  cn,
  ResultOf,
  useChannel,
  useLocalFormat,
  VendureImage,
} from "@vendure/dashboard";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CircleDollarSign,
  PackageX,
  TriangleAlert,
  TrendingDown,
} from "lucide-react";

import { graphql } from "@/gql";
import { ClientDataTable, SummaryStatCard } from "~/components/dashboard";
import { getTranslatedName } from "./shared";

const GET_REPORT = graphql(`
  query ConsignmentReport($storeId: ID!) {
    consignmentReport(storeId: $storeId) {
      quotationId
      productVariantId
      productNameTranslations {
        languageCode
        name
      }
      variantNameTranslations {
        languageCode
        name
      }
      sku
      featuredAsset {
        id
        name
        preview
        source
        width
        height
      }
      consignmentPrice
      intakeQty
      soldQty
      returnedQty
      debtQty
    }
  }
`);

const GET_INTAKE_SUMMARY = graphql(`
  query ConsignmentReportIntakeSummary($storeId: ID!) {
    consignmentIntakes(storeId: $storeId) {
      id
      total
    }
  }
`);

const GET_PAYMENT_SUMMARY = graphql(`
  query ConsignmentReportPaymentSummary($storeId: ID!) {
    consignmentPayments(storeId: $storeId) {
      id
      subtotal
      discount
      total
      paymentStatus
    }
  }
`);

const GET_RETURNED_SUMMARY = graphql(`
  query ConsignmentReportReturnedSummary($storeId: ID!) {
    consignmentReturns(storeId: $storeId) {
      id
      total
    }
  }
`);

type ReportRow = ResultOf<typeof GET_REPORT>["consignmentReport"][number];
export function ConsignmentReportPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { activeChannel } = useChannel();
  const { storeId } = props;
  const defaultCurrency = activeChannel?.defaultCurrencyCode ?? "USD";
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [paymentSummary, setPaymentSummary] = useState({
    subtotal: 0,
    discount: 0,
    total: 0,
  });
  const [returnSummary, setReturnSummary] = useState(0);
  const [intakeSummary, setIntakeSummary] = useState(0);

  const columns = useMemo<ColumnDef<ReportRow>[]>(
    () => [
      {
        id: "image",
        header: "",
        enableSorting: false,
        cell: (info) =>
          info.row.original.featuredAsset ? (
            <VendureImage
              className="h-12 w-12 rounded object-cover"
              asset={info.row.original.featuredAsset}
              preset="thumb"
            />
          ) : (
            <span>—</span>
          ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue() as string}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "productNameTranslations",
        header: "Product",
        cell: (info) => (
          <div>
            <div className="font-medium text-sm">
              {getTranslatedName(info.row.original.productNameTranslations)}
            </div>
            {getTranslatedName(info.row.original.variantNameTranslations) && (
              <div className="text-xs text-muted-foreground">
                {getTranslatedName(info.row.original.variantNameTranslations)}
              </div>
            )}
          </div>
        ),
        sortingFn: (rowA, rowB) =>
          getTranslatedName(rowA.original.productNameTranslations)
            .toLowerCase()
            .localeCompare(
              getTranslatedName(
                rowB.original.productNameTranslations,
              ).toLowerCase(),
            ),
      },
      {
        accessorKey: "consignmentPrice",
        header: "Quoted",
        cell: (info) =>
          formatCurrency(info.getValue() as number, defaultCurrency),
        sortingFn: "basic",
      },
      {
        accessorKey: "intakeQty",
        header: "Intake Qty",
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "soldQty",
        header: "Sold Qty",
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "returnedQty",
        header: "Returned Qty",
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "debtQty",
        header: "Debt Qty",
        cell: (info) => {
          const debt = info.getValue() as number;
          return (
            <div
              className={cn(
                "text-right tabular-nums font-semibold",
                debt < 0 ? "text-red-600" : "",
              )}
            >
              {debt}
            </div>
          );
        },
        sortingFn: "basic",
      },
    ],
    [formatCurrency, defaultCurrency],
  );

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      setPendingPaymentCount(0);
      setPaymentSummary({ subtotal: 0, discount: 0, total: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([
      api.query(GET_REPORT, { storeId }),
      api.query(GET_INTAKE_SUMMARY, { storeId }),
      api.query(GET_PAYMENT_SUMMARY, { storeId }),
      api.query(GET_RETURNED_SUMMARY, { storeId }),
    ])
      .then(([reportResult, intakeResult, paymentResult, returnResult]) => {
        setRows(reportResult?.consignmentReport ?? []);

        const payments = paymentResult?.consignmentPayments ?? [];
        const nextPendingPaymentCount = payments.filter(
          (payment) => (payment.paymentStatus ?? "") !== "Completed",
        ).length;
        setPendingPaymentCount(nextPendingPaymentCount);
        const nextPaymentSummary = payments.reduce(
          (acc, payment) => ({
            subtotal: acc.subtotal + (payment.subtotal ?? 0),
            discount: acc.discount + (payment.discount ?? 0),
            total: acc.total + (payment.total ?? 0),
          }),
          { subtotal: 0, discount: 0, total: 0 },
        );
        setPaymentSummary(nextPaymentSummary);
        const nextIntakeSummary = intakeResult?.consignmentIntakes.reduce(
          (acc, intake) => acc + (intake.total ?? 0),
          0,
        );
        setIntakeSummary(nextIntakeSummary ?? 0);
        const nextReturnSummary = returnResult?.consignmentReturns.reduce(
          (acc, ret) => acc + (ret.total ?? 0),
          0,
        );
        setReturnSummary(nextReturnSummary ?? 0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [storeId]);

  const debtSummary =
    intakeSummary - (paymentSummary.total ?? 0) - returnSummary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <SummaryStatCard
            title="∑ Intake"
            icon={<BadgeDollarSign className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(intakeSummary, defaultCurrency)}
            description="Total value received from store"
          />
        </div>
        <div>
          <SummaryStatCard
            title="∑ Paid"
            icon={
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            }
            value={formatCurrency(paymentSummary.subtotal, defaultCurrency)}
            footer={
              <p className="text-xs text-muted-foreground">
                Discount in payments:{" "}
                {formatCurrency(paymentSummary.discount, defaultCurrency)}
              </p>
            }
          />
        </div>
        <div>
          <SummaryStatCard
            title="∑ Returned"
            icon={<PackageX className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(returnSummary, defaultCurrency)}
            description="Value of items returned to store"
          />
        </div>
        <div>
          <SummaryStatCard
            title="∑ Debt"
            icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(debtSummary, defaultCurrency)}
            description="Intake - paid - returned"
          />
        </div>
      </div>

      {pendingPaymentCount > 0 ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            There are {pendingPaymentCount} payment
            {pendingPaymentCount > 1 ? "s" : ""} not marked as completed.
          </AlertDescription>
        </Alert>
      ) : null}

      <ClientDataTable
        columns={columns}
        data={rows}
        isLoading={loading}
        initialSorting={[{ id: "intakeQty", desc: true }]}
      />
    </div>
  );
}
