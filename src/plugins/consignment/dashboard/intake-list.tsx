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
      }
    }
  }
`);

export function IntakeListPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(LIST_INTAKES, { storeId }).then((result) => {
      setRows(((result as any)?.consignmentIntakes ?? []) as any[]);
    });
  }, [storeId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          render={(buttonProps) => (
            <Link to={`/consignment/intakes/new?storeId=${storeId}`} {...buttonProps}>
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
                  {row.items?.reduce(
                    (sum: number, item: any) => sum + item.quantity,
                    0,
                  ) ?? 0}
                </TableCell>
                <TableCell>{formatMoney(row.deliveryCost)}</TableCell>
                <TableCell>{formatMoney(row.total)}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="secondary"
                    render={(buttonProps) => (
                      <Link to={`/consignment/intakes/${row.id}`} {...buttonProps}>
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
