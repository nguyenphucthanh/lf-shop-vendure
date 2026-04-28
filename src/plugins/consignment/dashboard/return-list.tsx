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

import { EmptyState, formatMoney, SimplePage, StoreFilterCard } from "./shared";

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

export function ReturnListPage() {
  const [storeId, setStoreId] = useState("");
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
    <SimplePage
      title="Consignment Returns"
      actions={
        <Button
          disabled={!storeId}
          render={(props) => (
            <Link to={`/consignment/returns/new?storeId=${storeId}`} {...props}>
              New return
            </Link>
          )}
        />
      }
    >
      <StoreFilterCard storeId={storeId} onStoreChange={setStoreId} />
      {!storeId ? (
        <EmptyState
          title="Select a store"
          description="Choose a consignment store to view return records."
        />
      ) : (
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
                      render={props => (
                        <Link to={`/consignment/returns/${row.id}`} {...props}>Edit</Link>
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
      )}
    </SimplePage>
  );
}
