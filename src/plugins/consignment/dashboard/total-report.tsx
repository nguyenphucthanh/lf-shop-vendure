import {
  api,
  cn,
  Page,
  PageLayout,
  FullWidthPageBlock,
  PageTitle,
  ResultOf,
  useChannel,
  useLocalFormat,
  VendureImage,
} from "@vendure/dashboard";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Package, Store, Wallet } from "lucide-react";

import { graphql } from "@/gql";
import { ClientDataTable, SummaryStatCard } from "~/components/dashboard";
import { getTranslatedName } from "./shared";

const GET_TOTAL_REPORT = graphql(`
  query ConsignmentTotalReport {
    consignmentTotalReport {
      summary {
        totalStores
        totalCollectedPayments
        totalIntakeItems
      }
      rows {
        productVariantId
        productNameTranslations {
          languageCode
          name
        }
        variantNameTranslations {
          languageCode
          name
        }
        sku
        featuredAsset {
          id
          name
          preview
          source
          width
          height
        }
        totalIntakeQty
        totalSoldQty
        totalReturnedQty
      }
    }
  }
`);

type TotalReportRow = NonNullable<
  ResultOf<typeof GET_TOTAL_REPORT>["consignmentTotalReport"]["rows"][number]
>;

function SellThroughBar({ sold, intake }: { sold: number; intake: number }) {
  if (intake === 0)
    return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.min(100, Math.round((sold / intake) * 100));
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-blue-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 rounded-full bg-muted h-1.5 overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

export function TotalReportPage() {
  const { formatCurrency } = useLocalFormat();
  const { activeChannel } = useChannel();
  const defaultCurrency = activeChannel?.defaultCurrencyCode ?? "USD";

  const [summary, setSummary] = useState({
    totalStores: 0,
    totalCollectedPayments: 0,
    totalIntakeItems: 0,
  });
  const [rows, setRows] = useState<TotalReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void api
      .query(GET_TOTAL_REPORT)
      .then((result) => {
        const data = result?.consignmentTotalReport;
        if (data) {
          setSummary(data.summary);
          setRows(data.rows ?? []);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const columns = useMemo<ColumnDef<TotalReportRow>[]>(
    () => [
      {
        id: "image",
        header: "",
        enableSorting: false,
        cell: (info) =>
          info.row.original.featuredAsset ? (
            <VendureImage
              className="h-10 w-10 rounded object-cover"
              asset={info.row.original.featuredAsset}
              preset="thumb"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          ),
      },
      {
        accessorKey: "productNameTranslations",
        header: "Product",
        cell: (info) => (
          <div>
            <div className="font-medium text-sm">
              {getTranslatedName(info.row.original.productNameTranslations)}
            </div>
            {getTranslatedName(info.row.original.variantNameTranslations) && (
              <div className="text-xs text-muted-foreground">
                {getTranslatedName(info.row.original.variantNameTranslations)}
              </div>
            )}
          </div>
        ),
        sortingFn: (rowA, rowB) =>
          getTranslatedName(rowA.original.productNameTranslations)
            .toLowerCase()
            .localeCompare(
              getTranslatedName(
                rowB.original.productNameTranslations,
              ).toLowerCase(),
            ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue() as string}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "totalIntakeQty",
        header: "Intake",
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "totalSoldQty",
        header: "Sold",
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "totalReturnedQty",
        header: "Returned",
        cell: (info) => (
          <div className="text-right tabular-nums">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        id: "available",
        header: "Available",
        accessorFn: (row) =>
          row.totalIntakeQty - row.totalSoldQty - row.totalReturnedQty,
        cell: (info) => {
          const available = info.getValue() as number;
          const isOut = available <= 0;
          const isLow = available > 0 && available <= 3;
          return (
            <div
              className={cn(
                "text-right tabular-nums font-semibold",
                isOut
                  ? "text-red-600"
                  : isLow
                    ? "text-yellow-600"
                    : "text-green-600",
              )}
            >
              {available}
            </div>
          );
        },
        sortingFn: "basic",
      },
      {
        id: "sellThrough",
        header: "Sell-through",
        enableSorting: false,
        cell: (info) => (
          <SellThroughBar
            sold={info.row.original.totalSoldQty}
            intake={info.row.original.totalIntakeQty}
          />
        ),
      },
    ],
    [],
  );

  return (
    <Page pageId="consignment-total-report" title="Consignment Total Report">
      <PageTitle>Consignment Total Report</PageTitle>
      <PageLayout>
        <FullWidthPageBlock blockId="main" className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryStatCard
              title="Stores with Quotations"
              icon={<Store className="h-4 w-4 text-muted-foreground" />}
              value={loading ? "—" : summary.totalStores}
              description="Stores with at least one quotation"
            />

            <SummaryStatCard
              title="Collected Payments"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              value={
                loading
                  ? "—"
                  : formatCurrency(
                      summary.totalCollectedPayments,
                      defaultCurrency,
                    )
              }
              description="Completed payments only"
            />

            <SummaryStatCard
              title="Total Intake Items"
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              value={loading ? "—" : summary.totalIntakeItems.toLocaleString()}
              description="Units received across all stores"
            />
          </div>

          {/* Variants table */}
          <ClientDataTable
            columns={columns}
            data={rows}
            isLoading={loading}
            initialSorting={[{ id: "totalIntakeQty", desc: true }]}
          />
        </FullWidthPageBlock>
      </PageLayout>
    </Page>
  );
}
