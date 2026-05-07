import {
  api,
  Button,
  Card,
  Link,
  ResultOf,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useLocalFormat,
} from "@vendure/dashboard";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

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

export function SoldListPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { storeId } = props;
  const [rows, setRows] = useState<
    ResultOf<typeof LIST_SOLDS>["consignmentSolds"]
  >([]);

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
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const totalQty = (row.items ?? []).reduce((sum, item) => {
                return sum + Number(item.quantity ?? 0);
              }, 0);
              const itemSummary = (row.items ?? [])
                .slice(0, 2)
                .map((item) => {
                  const sku = item.quotation?.productVariantSku ?? "-";
                  const qty = Number(item.quantity ?? 0);
                  return `${sku} x${qty}`;
                })
                .join(", ");
              const hasMoreItems = (row.items?.length ?? 0) > 2;
              const currency = row.items?.[0]?.currency ?? "USD";

              return (
                <TableRow key={row.id}>
                  <TableCell>{String(row.soldDate).slice(0, 10)}</TableCell>
                  <TableCell>
                    {(row.items?.length ?? 0) > 0
                      ? `${itemSummary}${hasMoreItems ? ", ..." : ""}`
                      : "-"}
                  </TableCell>
                  <TableCell>{totalQty}</TableCell>
                  <TableCell>{formatCurrency(row.total, currency)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      render={(buttonProps) => (
                        <Link
                          to={`/consignment/solds/${row.id}`}
                          {...buttonProps}
                        >
                          Edit
                        </Link>
                      )}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  No sold records found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
