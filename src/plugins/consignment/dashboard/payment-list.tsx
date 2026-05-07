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
  useChannel,
  useLocalFormat,
} from "@vendure/dashboard";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

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

export function PaymentListPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { activeChannel } = useChannel();
  const { storeId } = props;
  const defaultCurrency = activeChannel?.defaultCurrencyCode ?? "USD";
  const [rows, setRows] = useState<
    ResultOf<typeof LIST_PAYMENTS>["consignmentPayments"]
  >([]);

  function getStatusClass(status?: string) {
    const normalized = (status ?? "").toLowerCase();
    if (normalized === "pending") {
      return "font-semibold text-orange-600";
    }
    if (normalized === "completed") {
      return "font-semibold text-green-600";
    }
    return "font-semibold";
  }

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
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Linked Sold</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{String(row.paymentDate).slice(0, 10)}</TableCell>
                <TableCell>
                  {row.sold?.id
                    ? `${String(row.sold.soldDate).slice(0, 10)} - ${row.sold.items?.length ?? 0} items`
                    : "Not linked"}
                </TableCell>
                <TableCell>{row.paymentMethod}</TableCell>
                <TableCell className={getStatusClass(row.paymentStatus)}>
                  {row.paymentStatus}
                </TableCell>
                <TableCell>
                  {formatCurrency(row.subtotal, defaultCurrency)}
                </TableCell>
                <TableCell>
                  {formatCurrency(row.discount, defaultCurrency)}
                </TableCell>
                <TableCell>
                  {formatCurrency(row.total, defaultCurrency)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="secondary"
                    render={(buttonProps) => (
                      <Link
                        to={`/consignment/payments/${row.id}`}
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
                  colSpan={8}
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
