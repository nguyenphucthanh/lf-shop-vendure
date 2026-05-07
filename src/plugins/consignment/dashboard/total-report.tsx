import {
  api,
  Card,
  CardHeader,
  CardTitle,
  cn,
  Page,
  PageLayout,
  FullWidthPageBlock,
  PageTitle,
  ResultOf,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useChannel,
  useLocalFormat,
  VendureImage,
} from "@vendure/dashboard";
import { useEffect, useMemo, useState } from "react";
import { Package, Store, Wallet } from "lucide-react";

import { graphql } from "@/gql";
import { SortButton, SummaryStatCard } from "~/components/dashboard";
import { getTranslatedName, SortDir, SortKey } from "./shared";

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
  const [sortKey, setSortKey] = useState<SortKey>("intake");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "name":
          av = getTranslatedName(a.productNameTranslations).toLowerCase();
          bv = getTranslatedName(b.productNameTranslations).toLowerCase();
          break;
        case "sku":
          av = a.sku.toLowerCase();
          bv = b.sku.toLowerCase();
          break;
        case "intake":
          av = a.totalIntakeQty;
          bv = b.totalIntakeQty;
          break;
        case "sold":
          av = a.totalSoldQty;
          bv = b.totalSoldQty;
          break;
        case "returned":
          av = a.totalReturnedQty;
          bv = b.totalReturnedQty;
          break;
        case "available":
          av = a.totalIntakeQty - a.totalSoldQty - a.totalReturnedQty;
          bv = b.totalIntakeQty - b.totalSoldQty - b.totalReturnedQty;
          break;
        default:
          return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

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
          <Card className="overflow-hidden p-0">
            <CardHeader className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Product Variants ({loading ? "…" : rows.length})
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Click column headers to sort
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>
                      <SortButton
                        label="Product"
                        sortKey="name"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortButton
                        label="SKU"
                        sortKey="sku"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton
                        label="Intake"
                        sortKey="intake"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton
                        label="Sold"
                        sortKey="sold"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton
                        label="Returned"
                        sortKey="returned"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton
                        label="Available"
                        sortKey="available"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="w-36">Sell-through</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : sorted.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sorted.map((row) => {
                      const available =
                        row.totalIntakeQty -
                        row.totalSoldQty -
                        row.totalReturnedQty;
                      const isLow = available > 0 && available <= 3;
                      const isOut = available <= 0;
                      return (
                        <TableRow
                          key={row.productVariantId}
                          className={cn(
                            isOut
                              ? "bg-red-50 dark:bg-red-950/20"
                              : isLow
                                ? "bg-yellow-50 dark:bg-yellow-950/20"
                                : "",
                          )}
                        >
                          <TableCell>
                            {row.featuredAsset ? (
                              <VendureImage
                                className="h-10 w-10 rounded object-cover"
                                asset={row.featuredAsset}
                                preset="thumb"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {getTranslatedName(row.productNameTranslations)}
                            </div>
                            {getTranslatedName(row.variantNameTranslations) && (
                              <div className="text-xs text-muted-foreground">
                                {getTranslatedName(row.variantNameTranslations)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.sku}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.totalIntakeQty}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.totalSoldQty}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.totalReturnedQty}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={cn(
                                "font-semibold",
                                isOut ? "text-red-600" : "",
                                isLow ? "text-yellow-600" : "",
                                !isOut && !isLow ? "text-green-600" : "",
                              )}
                            >
                              {available}
                            </span>
                          </TableCell>
                          <TableCell>
                            <SellThroughBar
                              sold={row.totalSoldQty}
                              intake={row.totalIntakeQty}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </FullWidthPageBlock>
      </PageLayout>
    </Page>
  );
}
