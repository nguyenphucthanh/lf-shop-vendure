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

const LIST_PAYMENTS = graphql(`
  query ConsignmentPaymentList($storeId: ID!) {
    consignmentPayments(storeId: $storeId) {
      id
      paymentDate
      paymentMethod
      paymentStatus
      total
      paidAmount
      remainingAmount
      items {
        id
        quantity
      }
    }
  }
`);

export function PaymentListPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(LIST_PAYMENTS, { storeId }).then((result) => {
      setRows(((result as any)?.consignmentPayments ?? []) as any[]);
    });
  }, [storeId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          render={(buttonProps) => (
            <Link to={`/consignment/payments/new?storeId=${storeId}`} {...buttonProps}>
              New payment
            </Link>
          )}
        >
          New payment
        </Button>
      </div>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{String(row.paymentDate).slice(0, 10)}</TableCell>
                <TableCell>{row.paymentMethod}</TableCell>
                <TableCell>{row.paymentStatus}</TableCell>
                <TableCell>{formatMoney(row.total)}</TableCell>
                <TableCell>{formatMoney(row.remainingAmount)}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="secondary"
                    render={(buttonProps) => (
                      <Link to={`/consignment/payments/${row.id}`} {...buttonProps}>
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
                  colSpan={6}
                  className="text-center text-sm text-muted-foreground"
                >
                  No payment records found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
