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

const LIST_RETURNS = graphql(`
  query ConsignmentReturnList($storeId: ID!) {
    consignmentReturns(storeId: $storeId) {
      id
      returnedDate
      reason
      total
      items {
        id
        quantity
        currency
      }
    }
  }
`);

type ReturnRow = ResultOf<typeof LIST_RETURNS>["consignmentReturns"][number];

export function ReturnListPage(props: { storeId: string }) {
  const { storeId } = props;
  const { formatCurrency } = useLocalFormat();
  const [rows, setRows] = useState<ReturnRow[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    let active = true;
    void api.query(LIST_RETURNS, { storeId }).then((result) => {
      if (!active) return;
      setRows(result?.consignmentReturns ?? []);
    });
    return () => {
      active = false;
    };
  }, [storeId]);

  const columns = useMemo<ColumnDef<ReturnRow>[]>(
    () => [
      {
        accessorKey: "returnedDate",
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
          const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
          return `${totalQty} items of ${items.length} products`;
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: (info) => (info.getValue() as string | null) ?? "—",
        enableSorting: false,
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: (info) =>
          formatCurrency(
            info.getValue() as number,
            info.row.original.items?.[0]?.currency || "USD",
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
                to={`/consignment/returns/${info.row.original.id}`}
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
        <h2 className="text-lg font-semibold">Total returns: {rows.length}</h2>
        <Button
          render={(buttonProps) => (
            <Link
              to={`/consignment/returns/new?storeId=${storeId}`}
              {...buttonProps}
            >
              New return
            </Link>
          )}
        />
      </div>
      <ClientDataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: "returnedDate", desc: true }]}
      />
    </div>
  );
}
