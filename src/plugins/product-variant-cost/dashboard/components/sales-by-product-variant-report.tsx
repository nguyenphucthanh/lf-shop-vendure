import {
  api,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  Page,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Link,
  useLocalFormat,
  FullWidthPageBlock,
  PageTitle,
} from "@vendure/dashboard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

import { ClientDataTable, SummaryStatCard } from "~/components/dashboard";
import { graphql } from "@/gql";
import { toast } from "sonner";

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
};

function computeRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  switch (preset) {
    case "yesterday": {
      const y = daysAgo(1);
      return { from: toStr(y), to: toStr(y) };
    }
    case "last-7":
      return { from: toStr(daysAgo(7)), to: toStr(today) };
    case "last-30":
      return { from: toStr(daysAgo(30)), to: toStr(today) };
    case "last-90":
      return { from: toStr(daysAgo(90)), to: toStr(today) };
    case "last-week": {
      const d = new Date();
      const day = d.getDay();
      const endOfLastWeek = new Date(d);
      endOfLastWeek.setDate(d.getDate() - day);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
      return { from: toStr(startOfLastWeek), to: toStr(endOfLastWeek) };
    }
    case "last-month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toStr(first), to: toStr(last) };
    }
    default:
      return { from: toStr(daysAgo(30)), to: toStr(today) };
  }
}

const PRESETS = [
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7", label: "Last 7 days" },
  { value: "last-30", label: "Last 30 days" },
  { value: "last-90", label: "Last 90 days" },
  { value: "last-week", label: "Last week" },
  { value: "last-month", label: "Last month" },
];

export function SalesByProductVariantReport() {
  const { formatCurrency } = useLocalFormat();
  const [preset, setPreset] = useState<string | null>("last-30");
  const initial = computeRange("last-30");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const dailySales = useMemo<DailySalesPoint[]>(() => {
    // For this report, we'll show a simple breakdown by aggregating from the rows
    // This is a simplified visualization showing revenue distribution
    if (!report || report.rows.length === 0) {
      return [];
    }

    // Group top 10 products by subtotal for chart
    const topProducts = report.rows
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, 10)
      .map((row) => ({
        dateKey: row.variantId,
        shortLabel: row.sku,
        fullLabel: `${row.productName} - ${row.variantName}`,
        revenue: row.subtotal,
        currencyCode: row.currencyCode,
      }));

    return topProducts;
  }, [report]);

  const maxDailyRevenue = useMemo(() => {
    return dailySales.reduce((max, point) => {
      return Math.max(max, point.revenue);
    }, 0);
  }, [dailySales]);

  // Transform report rows for ClientDataTable
  const tableData = useMemo<TableRowData[]>(() => {
    if (!report) {
      return [];
    }
    return report.rows.map((row, index) => ({
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
    }));
  }, [report]);

  // Define table columns
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
              className="h-12 w-12 object-cover rounded"
            />
          ) : (
            <div className="h-12 w-12 bg-muted rounded" />
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
          <span className="font-mono text-xs">{info.getValue() as string}</span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "totalQuantity",
        header: "Total Qty",
        cell: (info) => (
          <div className="text-right">{info.getValue() as number}</div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: (info) => (
          <div className="text-right">
            {fmt(info.getValue() as number, info.row.original.currencyCode)}
          </div>
        ),
        sortingFn: "basic",
      },
    ],
    [fmt],
  );

  const runReport = useCallback(
    async (f?: string, t?: string) => {
      const fromVal = f ?? from;
      const toVal = t ?? to;

      // Validate date range
      const fromDate = new Date(fromVal);
      const toDate = new Date(toVal + "T23:59:59");
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

      // Prevent queries for more than 1 year to avoid performance issues
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
        }
      } catch {
        toast.error("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [from, to],
  );

  function handlePresetChange(value: string | null) {
    setPreset(value);
    if (value === null) {
      return;
    }
    const range = computeRange(value);
    setFrom(range.from);
    setTo(range.to);
    void runReport(range.from, range.to);
  }

  // Run on first load
  useEffect(() => {
    void runReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page pageId="sales-by-product-variant" title="Sales by Product Variant">
      <PageTitle>Sales by Product Variant</PageTitle>
      <PageLayout>
        <FullWidthPageBlock blockId="main">
          <div className="space-y-6 p-6">
            {/* Date filters */}
            <Card className="p-4">
              <div className="flex lg:grid grid-cols-4 gap-4 items-end flex-wrap">
                <Field>
                  <FieldLabel>From</FieldLabel>
                  <FieldContent>
                    <Input
                      type="date"
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value);
                        setPreset(null);
                      }}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>To</FieldLabel>
                  <FieldContent>
                    <Input
                      type="date"
                      value={to}
                      onChange={(e) => {
                        setTo(e.target.value);
                        setPreset(null);
                      }}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Preset</FieldLabel>
                  <FieldContent>
                    <Select value={preset} onValueChange={handlePresetChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Custom">
                          {PRESETS.find((p) => p.value === preset)?.label ??
                            "Custom"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
                <Button onClick={() => runReport()} disabled={loading}>
                  {loading ? "Loading…" : "Run report"}
                </Button>
              </div>
            </Card>

            {report && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <SummaryStatCard
                    title="Total Variants"
                    value={report.summary.totalVariants.toString()}
                  />
                  <SummaryStatCard
                    title="Total Qty"
                    value={report.summary.totalQuantity.toString()}
                  />
                  <SummaryStatCard
                    title="Total Revenue"
                    value={fmt(
                      report.summary.totalRevenue,
                      report.summary.currencyCode,
                    )}
                  />
                </div>

                {/* Sales by product chart */}
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

                            const barStyle: React.CSSProperties = {
                              height: `${height}%`,
                            };

                            return (
                              <div
                                key={point.dateKey}
                                className="flex w-16 shrink-0 flex-col items-center gap-2"
                                title={`${point.fullLabel}: ${fmt(point.revenue, point.currencyCode)}`}
                              >
                                <div className="flex h-40 w-full items-end rounded-md bg-muted/40 p-1">
                                  <div
                                    className="w-full rounded-sm bg-primary"
                                    style={barStyle}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full px-0.5">
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

                {/* Detail table */}
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
