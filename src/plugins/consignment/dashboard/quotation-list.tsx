import {
  api,
  Button,
  Link,
  ResultOf,
  useLocalFormat,
} from "@vendure/dashboard";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { ClientDataTable } from "~/components/dashboard";

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

type QuotationRow = ResultOf<
  typeof LIST_QUOTATIONS
>["consignmentQuotations"][number];

export function QuotationListPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<QuotationRow[]>([]);
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

  const columns = useMemo<ColumnDef<QuotationRow>[]>(
    () => [
      {
        id: "image",
        header: "",
        enableSorting: false,
        cell: (info) =>
          info.row.original.productVariantFeaturedAsset ? (
            <img
              src={info.row.original.productVariantFeaturedAsset.preview ?? ""}
              alt={info.row.original.productVariantName}
              className="w-12 h-12 rounded object-cover object-center"
            />
          ) : (
            <span className="block w-12 h-12 rounded bg-muted" />
          ),
      },
      {
        accessorKey: "productVariantSku",
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue() as string}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "productVariantName",
        header: "Product",
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "consignmentPrice",
        header: "Consignment Price",
        cell: (info) =>
          formatCurrency(
            info.getValue() as number,
            info.row.original.currency || "USD",
          ),
        sortingFn: "basic",
      },
      {
        accessorKey: "note",
        header: "Note",
        cell: (info) => (info.getValue() as string | null) ?? "—",
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (info) => (
          <Button
            size="sm"
            variant="secondary"
            render={(buttonProps) => (
              <Link
                to={`/consignment/quotations/${info.row.original.id}`}
                {...buttonProps}
              >
                Edit
              </Link>
            )}
          />
        ),
      },
    ],
    [formatCurrency],
  );

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
      <ClientDataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: "productVariantSku", desc: false }]}
      />
    </div>
  );
}
