import {
  api,
  Card,
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

const GET_REPORT = graphql(`
  query ConsignmentReport($storeId: ID!) {
    consignmentReport(storeId: $storeId) {
      quotationId
      productVariantId
      productName
      sku
      imageUrl
      consignmentPrice
      intakeQty
      intakeValue
      paidQty
      paidValue
      returnedQty
      returnedValue
      debtQty
      debtValue
    }
  }
`);

export function ConsignmentReportPage() {
  const [storeId, setStoreId] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(GET_REPORT, { storeId }).then((result) => {
      setRows(((result as any)?.consignmentReport ?? []) as any[]);
    });
  }, [storeId]);

  return (
    <SimplePage title="Consignment Report">
      <StoreFilterCard storeId={storeId} onStoreChange={setStoreId} />
      {!storeId ? (
        <EmptyState
          title="Select a store"
          description="Choose a consignment store to run the report."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quoted</TableHead>
                  <TableHead>Intake Qty</TableHead>
                  <TableHead>Intake Value</TableHead>
                  <TableHead>Paid Qty</TableHead>
                  <TableHead>Paid Value</TableHead>
                  <TableHead>Returned Qty</TableHead>
                  <TableHead>Returned Value</TableHead>
                  <TableHead>Debt Qty</TableHead>
                  <TableHead>Debt Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.quotationId}>
                    <TableCell>
                      {row.imageUrl ? (
                        <img
                          src={row.imageUrl}
                          alt={row.productName}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{formatMoney(row.consignmentPrice)}</TableCell>
                    <TableCell>{row.intakeQty}</TableCell>
                    <TableCell>{formatMoney(row.intakeValue)}</TableCell>
                    <TableCell>{row.paidQty}</TableCell>
                    <TableCell>{formatMoney(row.paidValue)}</TableCell>
                    <TableCell>{row.returnedQty}</TableCell>
                    <TableCell>{formatMoney(row.returnedValue)}</TableCell>
                    <TableCell>{row.debtQty}</TableCell>
                    <TableCell>{formatMoney(row.debtValue)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No report data available.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </SimplePage>
  );
}
