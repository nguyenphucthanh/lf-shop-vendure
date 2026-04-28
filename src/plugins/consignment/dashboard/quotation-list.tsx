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

const LIST_QUOTATIONS = graphql(`
  query ConsignmentQuotationList($storeId: ID!) {
    consignmentQuotations(storeId: $storeId) {
      id
      createdAt
      productVariantName
      productVariantSku
      productVariantFeaturedAsset {
        id
        preview
      }
      consignmentPrice
      note
    }
  }
`);

export function QuotationListPage() {
  const [storeId, setStoreId] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(LIST_QUOTATIONS, { storeId }).then((result) => {
      setRows(result?.consignmentQuotations ?? []);
    });
  }, [storeId]);

  return (
    <SimplePage
      title="Consignment Quotations"
      actions={
        <Button
          disabled={!storeId}
          render={(props) => (
            <Link
              to={`/consignment/quotations/new?storeId=${storeId}`}
              {...props}
            >
              New quotation
            </Link>
          )}
        />
      }
    >
      <StoreFilterCard storeId={storeId} onStoreChange={setStoreId} />
      {!storeId ? (
        <EmptyState
          title="Select a store"
          description="Choose a consignment store to view quotations."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Consignment Price</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <img
                      src={row.productVariantFeaturedAsset?.preview ?? ""}
                      alt={row.productVariantName}
                      className="w-16 h-16 rounded object-cover object-center"
                    />
                  </TableCell>
                  <TableCell>{row.productVariantSku}</TableCell>
                  <TableCell>{row.productVariantName}</TableCell>
                  <TableCell>{formatMoney(row.consignmentPrice)}</TableCell>
                  <TableCell>{row.note ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      render={(props) => (
                        <Link
                          to={`/consignment/quotations/${row.id}`}
                          {...props}
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
                    No quotations found for this store.
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
