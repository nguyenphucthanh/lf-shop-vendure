import {
  api,
  Button,
  Link,
  ResultOf,
  useLocalFormat,
} from "@vendure/dashboard";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { ClientDataTable } from "~/components/dashboard";

const LIST_SOLDS = graphql(`
  query ConsignmentSoldList($storeId: ID!) {
    consignmentSolds(storeId: $storeId) {
      id
      soldDate
      total
      items {
        id
        quantity
        currency
        quotation {
          id
          productVariantSku
          productVariantName
        }
      }
    }
  }
`);

type SoldRow = ResultOf<typeof LIST_SOLDS>["consignmentSolds"][number];

export function SoldListPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { storeId } = props;
  const [rows, setRows] = useState<SoldRow[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    let active = true;
    void api.query(LIST_SOLDS, { storeId }).then((result) => {
      if (!active) return;
      setRows(result?.consignmentSolds ?? []);
    });
    return () => {
      active = false;
    };
  }, [storeId]);

  const columns = useMemo<ColumnDef<SoldRow>[]>(
    () => [
      {
        accessorKey: "soldDate",
        header: "Date",
        cell: (info) => String(info.getValue()).slice(0, 10),
        sortingFn: "alphanumeric",
      },
      {
        id: "items",
        header: "Items",
        enableSorting: false,
        cell: (info) => {
          const items = info.row.original.items ?? [];
          const summary = items
            .slice(0, 2)
            .map((item) => {
              const sku = item.quotation?.productVariantSku ?? "-";
              return `${sku} x${Number(item.quantity ?? 0)}`;
            })
            .join(", ");
          const hasMore = items.length > 2;
          return items.length > 0 ? `${summary}${hasMore ? ", ..." : ""}` : "-";
        },
      },
      {
        id: "qty",
        header: "Qty",
        accessorFn: (row) =>
          (row.items ?? []).reduce(
            (sum, item) => sum + Number(item.quantity ?? 0),
            0,
          ),
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: (info) =>
          formatCurrency(
            info.getValue() as number,
            info.row.original.items?.[0]?.currency ?? "USD",
          ),
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
                to={`/consignment/solds/${info.row.original.id}`}
                {...buttonProps}
              >
                Edit
              </Link>
            )}
          />
        ),
      },
    ],
    [formatCurrency],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">
          Total sold records: {rows.length}
        </h2>
        <Button
          render={(buttonProps) => (
            <Link
              to={`/consignment/solds/new?storeId=${storeId}`}
              {...buttonProps}
            >
              New sold
            </Link>
          )}
        >
          New sold
        </Button>
      </div>
      <ClientDataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: "soldDate", desc: true }]}
      />
    </div>
  );
}
