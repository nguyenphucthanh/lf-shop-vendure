import {
  api,
  Button,
  Link,
  ResultOf,
  useChannel,
  useLocalFormat,
} from "@vendure/dashboard";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { ClientDataTable } from "~/components/dashboard";

const LIST_PAYMENTS = graphql(`
  query ConsignmentPaymentList($storeId: ID!) {
    consignmentPayments(storeId: $storeId) {
      id
      paymentDate
      paymentPolicy
      paymentMethod
      paymentStatus
      subtotal
      discount
      total
      sold {
        id
        soldDate
        items {
          id
          quotation {
            productVariantSku
            productVariantName
          }
        }
      }
    }
  }
`);

type PaymentRow = ResultOf<typeof LIST_PAYMENTS>["consignmentPayments"][number];

export function PaymentListPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { activeChannel } = useChannel();
  const { storeId } = props;
  const defaultCurrency = activeChannel?.defaultCurrencyCode ?? "USD";
  const [rows, setRows] = useState<PaymentRow[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    let active = true;
    void api.query(LIST_PAYMENTS, { storeId }).then((result) => {
      if (!active) return;
      setRows(result?.consignmentPayments ?? []);
    });
    return () => {
      active = false;
    };
  }, [storeId]);

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        accessorKey: "paymentDate",
        header: "Date",
        cell: (info) => String(info.getValue()).slice(0, 10),
        sortingFn: "alphanumeric",
      },
      {
        id: "linkedSold",
        header: "Linked Sold",
        enableSorting: false,
        cell: (info) => {
          const sold = info.row.original.sold;
          return sold?.id
            ? `${String(sold.soldDate).slice(0, 10)} - ${sold.items?.length ?? 0} items`
            : "Not linked";
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "paymentStatus",
        header: "Status",
        cell: (info) => {
          const status = info.getValue() as string | null | undefined;
          const normalized = (status ?? "").toLowerCase();
          const className =
            normalized === "pending"
              ? "font-semibold text-orange-600"
              : normalized === "completed"
                ? "font-semibold text-green-600"
                : "font-semibold";
          return <span className={className}>{status}</span>;
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: (info) =>
          formatCurrency(info.getValue() as number, defaultCurrency),
        sortingFn: "basic",
      },
      {
        accessorKey: "discount",
        header: "Discount",
        cell: (info) =>
          formatCurrency(info.getValue() as number, defaultCurrency),
        sortingFn: "basic",
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: (info) =>
          formatCurrency(info.getValue() as number, defaultCurrency),
        sortingFn: "basic",
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (info) => (
          <Button
            size="sm"
            variant="secondary"
            render={(buttonProps) => (
              <Link
                to={`/consignment/payments/${info.row.original.id}`}
                {...buttonProps}
              >
                Edit
              </Link>
            )}
          />
        ),
      },
    ],
    [formatCurrency, defaultCurrency],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">Total payments: {rows.length}</h2>
        <Button
          render={(buttonProps) => (
            <Link
              to={`/consignment/payments/new?storeId=${storeId}`}
              {...buttonProps}
            >
              New payment
            </Link>
          )}
        >
          New payment
        </Button>
      </div>
      <ClientDataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: "paymentDate", desc: true }]}
      />
    </div>
  );
}
