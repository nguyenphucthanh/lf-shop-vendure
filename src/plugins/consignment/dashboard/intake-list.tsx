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

const LIST_INTAKES = graphql(`
  query ConsignmentIntakeList($storeId: ID!) {
    consignmentIntakes(storeId: $storeId) {
      id
      intakeDate
      paymentPolicy
      deliveryMethod
      deliveryTrackingCode
      deliveryCost
      total
      items {
        id
        quantity
        currency
      }
    }
  }
`);

type IntakeRow = ResultOf<typeof LIST_INTAKES>["consignmentIntakes"][number];

export function IntakeListPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { storeId } = props;
  const [rows, setRows] = useState<IntakeRow[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    let active = true;
    void api.query(LIST_INTAKES, { storeId }).then((result) => {
      if (!active) return;
      setRows(result?.consignmentIntakes ?? []);
    });
    return () => {
      active = false;
    };
  }, [storeId]);

  const columns = useMemo<ColumnDef<IntakeRow>[]>(
    () => [
      {
        accessorKey: "intakeDate",
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
        accessorKey: "deliveryCost",
        header: "Delivery",
        cell: (info) =>
          formatCurrency(
            info.getValue() as number,
            info.row.original.items?.[0]?.currency || "USD",
          ),
        sortingFn: "basic",
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
                to={`/consignment/intakes/${info.row.original.id}`}
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
        <h2 className="text-lg font-semibold">Total intakes: {rows.length}</h2>
        <Button
          render={(buttonProps) => (
            <Link
              to={`/consignment/intakes/new?storeId=${storeId}`}
              {...buttonProps}
            >
              New intake
            </Link>
          )}
        />
      </div>
      <ClientDataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: "intakeDate", desc: true }]}
      />
    </div>
  );
}
