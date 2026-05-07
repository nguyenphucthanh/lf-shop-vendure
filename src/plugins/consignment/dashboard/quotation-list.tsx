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
      currency
      note
    }
  }
`);

export function QuotationListPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<
    ResultOf<typeof LIST_QUOTATIONS>["consignmentQuotations"]
  >([]);
  const { formatCurrency } = useLocalFormat();

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    let active = true;
    void api.query(LIST_QUOTATIONS, { storeId }).then((result) => {
      if (!active) return;
      setRows(result?.consignmentQuotations ?? []);
    });
    return () => {
      active = false;
    };
  }, [storeId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">
          Total quotations: {rows.length}
        </h2>
        <Button
          render={(buttonProps) => (
            <Link
              to={`/consignment/quotations/new?storeId=${storeId}`}
              {...buttonProps}
            >
              New quotation
            </Link>
          )}
        />
      </div>
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
                  {row.productVariantFeaturedAsset ? (
                    <img
                      src={row.productVariantFeaturedAsset?.preview ?? ""}
                      alt={row.productVariantName}
                      className="w-16 h-16 rounded object-cover object-center"
                    />
                  ) : (
                    <span className="block w-16 h-16 rounded-xs bg-muted"></span>
                  )}
                </TableCell>
                <TableCell>{row.productVariantSku}</TableCell>
                <TableCell>{row.productVariantName}</TableCell>
                <TableCell>{formatCurrency(row.consignmentPrice, row.currency || "USD")}</TableCell>
                <TableCell>{row.note ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="secondary"
                    render={(buttonProps) => (
                      <Link
                        to={`/consignment/quotations/${row.id}`}
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
                  colSpan={6}
                  className="text-center text-sm text-muted-foreground"
                >
                  No quotations found for this store.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
