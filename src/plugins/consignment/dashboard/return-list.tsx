import {
  api,
  Button,
  Card,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vendure/dashboard";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

import { formatMoney } from "./shared";

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
      }
    }
  }
`);

export function ReturnListPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(LIST_RETURNS, { storeId }).then((result) => {
      setRows(((result as any)?.consignmentReturns ?? []) as any[]);
    });
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
              <TableHead>Reason</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{String(row.returnedDate).slice(0, 10)}</TableCell>
                <TableCell>{row.reason ?? "—"}</TableCell>
                <TableCell>{formatMoney(row.total)}</TableCell>
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
                  colSpan={4}
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
