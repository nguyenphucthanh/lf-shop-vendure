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

export function ReturnListPage(props: { storeId: string }) {
  const { storeId } = props;
  const { formatCurrency } = useLocalFormat();
  const [rows, setRows] = useState<
    ResultOf<typeof LIST_RETURNS>["consignmentReturns"]
  >([]);

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
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{String(row.returnedDate).slice(0, 10)}</TableCell>
                <TableCell>
                  {`${
                    row.items?.reduce(
                      (sum: number, item) => sum + item.quantity,
                      0,
                    ) ?? 0
                  } items of ${row.items?.length ?? 0} products`}
                </TableCell>
                <TableCell>{row.reason ?? "—"}</TableCell>
                <TableCell>
                  {formatCurrency(row.total, row.items?.[0]?.currency || "USD")}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="secondary"
                    render={(buttonProps) => (
                      <Link
                        to={`/consignment/returns/${row.id}`}
                        {...buttonProps}
                      >
                        Edit
                      </Link>
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  No return records found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
