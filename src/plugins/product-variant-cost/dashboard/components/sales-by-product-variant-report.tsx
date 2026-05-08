import {
  api,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  DateRangePicker,
  FullWidthPageBlock,
  Link,
  Page,
  PageLayout,
  PageTitle,
  useLocalFormat,
} from "@vendure/dashboard";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { graphql } from "@/gql";
import { ClientDataTable, SummaryStatCard } from "~/components/dashboard";

const SALES_BY_PRODUCT_VARIANT_REPORT = graphql(`
  query SalesByProductVariantReport($from: DateTime!, $to: DateTime!) {
    salesByProductVariantReport(from: $from, to: $to) {
      rows {
        productId
        productFeaturedAssetUrl
        variantId
        productName
        variantName
        sku
        totalQuantity
        subtotal
        currencyCode
        facetNames
      }
      summary {
        totalVariants
        totalQuantity
        totalRevenue
        currencyCode
      }
    }
  }
`);

const GET_ALL_FACETS = graphql(`
  query GetAllFacets {
    facets(options: { take: 100 }) {
      items {
        id
        name
        values {
          id
          name
        }
      }
    }
  }
`);

type ReportData = {
  rows: Array<{
    productId?: string | null;
    productFeaturedAssetUrl?: string | null;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    totalQuantity: number;
    subtotal: number;
    currencyCode: string;
    facetNames: string[];
  }>;
  summary: {
    totalVariants: number;
    totalQuantity: number;
    totalRevenue: number;
    currencyCode: string;
  };
};

type DailySalesPoint = {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  revenue: number;
  currencyCode: string;
};

type TableRowData = {
  id: string;
  productId?: string | null;
  productFeaturedAssetUrl?: string | null;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  totalQuantity: number;
  subtotal: number;
  currencyCode: string;
  facetNames: string[];
};

export function SalesByProductVariantReport() {
  const { formatCurrency } = useLocalFormat();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);
  const [availableFacets, setAvailableFacets] = useState<
    Array<{
      label: string;
      value: string;
    }>
  >([]);

  useEffect(() => {
    const loadFacets = async () => {
      try {
        const result = await api.query(GET_ALL_FACETS, {});
        if (result?.facets?.items) {
          const facetNames = result.facets.items
            .flatMap((facet) =>
              facet.values.map((value) => ({
                label: `${facet.name}: ${value.name}`,
                value: value.name,
              })),
            )
            .sort((a, b) => a.label.localeCompare(b.label));
          setAvailableFacets(facetNames);
        }
      } catch {
        console.error("Failed to load facets");
      }
    };

    void loadFacets();
  }, []);

  const dailySales = useMemo<DailySalesPoint[]>(() => {
    if (!report || report.rows.length === 0) {
      return [];
    }

    return [...report.rows]
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, 10)
      .map((row) => ({
        dateKey: row.variantId,
        shortLabel: row.sku,
        fullLabel: `${row.productName} - ${row.variantName}`,
        revenue: row.subtotal,
        currencyCode: row.currencyCode,
      }));
  }, [report]);

  const maxDailyRevenue = useMemo(
    () => dailySales.reduce((max, point) => Math.max(max, point.revenue), 0),
    [dailySales],
  );

  const tableData = useMemo<TableRowData[]>(() => {
    if (!report) {
      return [];
    }

    const filteredRows = report.rows.filter((row) => {
      if (selectedFacets.length === 0) {
        return true;
      }
      return selectedFacets.some((facet) => row.facetNames.includes(facet));
    });

    return filteredRows.map((row, index) => ({
      id: `${row.variantId}-${index}`,
      productId: row.productId,
      productFeaturedAssetUrl: row.productFeaturedAssetUrl,
      variantId: row.variantId,
      productName: row.productName,
      variantName: row.variantName,
      sku: row.sku,
      totalQuantity: row.totalQuantity,
      subtotal: row.subtotal,
      currencyCode: row.currencyCode,
      facetNames: row.facetNames,
    }));
  }, [report, selectedFacets]);

  const runReport = useCallback(
    async (dateRangeToUse?: { from: Date; to: Date }) => {
      const range = dateRangeToUse ?? dateRange;
      const fromDate = range.from;
      const toDate = new Date(range.to);
      toDate.setHours(23, 59, 59, 999);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        toast("Invalid date format");
        return;
      }

      if (fromDate > toDate) {
        toast("From date must be before To date");
        return;
      }

      if (toDate > today) {
        toast("To date cannot be in the future");
        return;
      }

      const daysDiff =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        toast("Date range cannot exceed 365 days");
        return;
      }

      setLoading(true);
      try {
        const result = await api.query(SALES_BY_PRODUCT_VARIANT_REPORT, {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        });

        if (result?.salesByProductVariantReport) {
          setReport(result.salesByProductVariantReport as ReportData);
          setSelectedFacets([]);
        }
      } catch {
        toast.error("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [dateRange],
  );

  const fmt = useCallback(
    (value: number, code: string) => formatCurrency(value, code),
    [formatCurrency],
  );

  const columns = useMemo<ColumnDef<TableRowData>[]>(
    () => [
      {
        id: "productImage",
        header: "",
        enableSorting: false,
        size: 60,
        cell: (info) => {
          const url = info.row.original.productFeaturedAssetUrl;
          return url ? (
            <img
              src={url}
              alt="product"
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded bg-muted" />
          );
        },
      },
      {
        accessorKey: "productName",
        header: "Product",
        cell: (info) => {
          const { productId, productName } = info.row.original;
          if (!productId) {
            return productName;
          }

          return (
            <Link
              to={`/products/${productId}`}
              className="text-primary hover:underline"
            >
              {productName}
            </Link>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "variantName",
        header: "Variant",
        cell: (info) => {
          const { productId, variantId, variantName } = info.row.original;
          if (!productId) {
            return variantName;
          }

          return (
            <Link
              to={`/product-variants/${variantId}`}
              className="text-primary hover:underline"
            >
              {variantName}
            </Link>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-xs">{String(info.getValue())}</span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "facetNames",
        header: "Facets",
        enableSorting: false,
        cell: (info) => {
          const facets = info.getValue() as string[];
          return facets.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {facets.map((facet) => (
                <Badge key={facet} variant="secondary" className="text-xs">
                  {facet}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "totalQuantity",
        header: "Total Qty",
        cell: (info) => (
          <div className="text-right">{Number(info.getValue())}</div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: (info) => (
          <div className="text-right">
            {fmt(Number(info.getValue()), info.row.original.currencyCode)}
          </div>
        ),
        sortingFn: "basic",
      },
    ],
    [fmt],
  );

  const getBarHeightClass = useCallback((heightPercent: number) => {
    if (heightPercent >= 96) return "h-full";
    if (heightPercent >= 84) return "h-5/6";
    if (heightPercent >= 72) return "h-4/5";
    if (heightPercent >= 60) return "h-3/5";
    if (heightPercent >= 48) return "h-1/2";
    if (heightPercent >= 36) return "h-2/5";
    if (heightPercent >= 24) return "h-1/4";
    if (heightPercent >= 12) return "h-1/6";
    return "h-1/12";
  }, []);

  useEffect(() => {
    void runReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page pageId="sales-by-product-variant" title="Sales by Product Variant">
      <PageTitle>Sales by Product Variant</PageTitle>
      <PageLayout>
        <FullWidthPageBlock blockId="main">
          <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-x-2">
                {report && availableFacets.length > 0 && (
                  <div className="flex items-end gap-2">
                    <Combobox
                      items={availableFacets}
                      multiple
                      value={selectedFacets}
                      onValueChange={setSelectedFacets}
                    >
                      <ComboboxChips className="w-full min-w-72">
                        <ComboboxValue placeholder="Filter by facets...">
                          {(values) => (
                            <>
                              {values.map((value: string) => {
                                const option = availableFacets.find(
                                  (facet) => facet.value === value,
                                );
                                return (
                                  <ComboboxChip key={value}>
                                    {option?.label}
                                  </ComboboxChip>
                                );
                              })}
                              <ComboboxChipsInput placeholder="Filter by facets" />
                            </>
                          )}
                        </ComboboxValue>
                      </ComboboxChips>
                      <ComboboxContent>
                        <ComboboxList>
                          <ComboboxCollection>
                            {(facet: { label: string; value: string }) => (
                              <ComboboxItem
                                value={facet.value}
                                key={facet.value}
                              >
                                {facet.label}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxList>
                        <ComboboxEmpty>No facets available</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>

                    {selectedFacets.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFacets([])}
                        className="h-9"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  setDateRange(range);
                  void runReport(range);
                }}
              />
            </div>

            {report && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <SummaryStatCard
                    title="Total Variants"
                    value={tableData.length.toString()}
                  />
                  <SummaryStatCard
                    title="Total Qty"
                    value={tableData
                      .reduce((sum, row) => sum + row.totalQuantity, 0)
                      .toString()}
                  />
                  <SummaryStatCard
                    title="Total Revenue"
                    value={fmt(
                      tableData.reduce((sum, row) => sum + row.subtotal, 0),
                      report.summary.currencyCode,
                    )}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Product (Top 10)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailySales.length > 0 ? (
                      <div className="overflow-x-auto pb-1">
                        <div className="flex min-w-max items-end gap-2">
                          {dailySales.map((point) => {
                            const height =
                              maxDailyRevenue > 0
                                ? Math.max(
                                    (point.revenue / maxDailyRevenue) * 100,
                                    2,
                                  )
                                : 2;
                            const barHeightClass = getBarHeightClass(height);

                            return (
                              <div
                                key={point.dateKey}
                                className="flex w-16 shrink-0 flex-col items-center gap-2"
                                title={`${point.fullLabel}: ${fmt(point.revenue, point.currencyCode)}`}
                              >
                                <div className="flex h-40 w-full items-end rounded-md bg-muted/40 p-1">
                                  <div
                                    className={`w-full rounded-sm bg-primary ${barHeightClass}`}
                                  />
                                </div>
                                <span className="w-full truncate px-0.5 text-center text-[10px] leading-tight text-muted-foreground">
                                  {point.shortLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-sm text-muted-foreground">
                        No sales data available for charting in this period.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ClientDataTable
                  columns={columns}
                  data={tableData}
                  isLoading={loading}
                  initialSorting={[{ id: "subtotal", desc: true }]}
                />
              </>
            )}
          </div>
        </FullWidthPageBlock>
      </PageLayout>
    </Page>
  );
}
