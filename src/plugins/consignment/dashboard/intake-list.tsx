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

export function IntakeListPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { storeId } = props;
  const [rows, setRows] = useState<
    ResultOf<typeof LIST_INTAKES>["consignmentIntakes"]
  >([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(LIST_INTAKES, { storeId }).then((result) => {
      setRows(result?.consignmentIntakes ?? []);
    });
  }, [storeId]);

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
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{String(row.intakeDate).slice(0, 10)}</TableCell>
                <TableCell>
                  {`${
                    row.items?.reduce(
                      (sum: number, item) => sum + item.quantity,
                      0,
                    ) ?? 0
                  } items of ${row.items?.length ?? 0} products`}
                </TableCell>
                <TableCell>
                  {formatCurrency(
                    row.deliveryCost,
                    row.items?.[0]?.currency || "USD",
                  )}
                </TableCell>
                <TableCell>
                  {formatCurrency(row.total, row.items?.[0]?.currency || "USD")}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="secondary"
                    render={(buttonProps) => (
                      <Link
                        to={`/consignment/intakes/${row.id}`}
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
                  No intake records found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
