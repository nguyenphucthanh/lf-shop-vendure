import {
  api,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  Link,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useLocalFormat,
} from "@vendure/dashboard";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { toast } from "sonner";

const SALES_MARGIN_REPORT = graphql(`
  query SalesMarginReport($from: DateTime!, $to: DateTime!) {
    salesMarginReport(from: $from, to: $to) {
      rows {
        orderId
        orderCode
        orderDate
        productName
        sku
        quantity
        unitPrice
        lineTotal
        unitCost
        lineCost
        margin
        currencyCode
      }
      summary {
        totalRevenue
        totalCost
        totalMargin
        marginPercent
        orderCount
        currencyCode
      }
    }
  }
`);

const GET_ORDER_DETAIL = graphql(`
  query GetOrderDetail($id: ID!) {
    order(id: $id) {
      id
      code
      state
      orderPlacedAt
      currencyCode
      subTotal
      subTotalWithTax
      shipping
      shippingWithTax
      total
      totalWithTax
      customer {
        id
        firstName
        lastName
        emailAddress
      }
      shippingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
      }
      shippingLines {
        shippingMethod {
          name
        }
        priceWithTax
      }
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        productVariant {
          name
          sku
        }
      }
    }
  }
`);

type ReportData = {
  rows: Array<{
    orderId: string;
    orderCode: string;
    orderDate: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    unitCost: number;
    lineCost: number;
    margin: number;
    currencyCode: string;
  }>;
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
    marginPercent: number;
    orderCount: number;
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

type OrderDetail = {
  id: string;
  code: string;
  state: string;
  orderPlacedAt: string | null;
  currencyCode: string;
  subTotal: number;
  subTotalWithTax: number;
  shipping: number;
  shippingWithTax: number;
  total: number;
  totalWithTax: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
  } | null;
  shippingAddress: {
    fullName: string;
    streetLine1: string;
    streetLine2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  } | null;
  shippingLines: Array<{
    shippingMethod: { name: string };
    priceWithTax: number;
  }>;
  lines: Array<{
    id: string;
    quantity: number;
    unitPriceWithTax: number;
    linePriceWithTax: number;
    productVariant: { name: string; sku: string };
  }>;
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
      endOfLastWeek.setDate(d.getDate() - day); // Sunday
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

export function SalesMarginReport() {
  const { formatCurrency } = useLocalFormat();
  const [preset, setPreset] = useState<string | null>("last-30");
  const initial = computeRange("last-30");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const dailySales = useMemo<DailySalesPoint[]>(() => {
    if (!report) {
      return [];
    }

    const byDate = new Map<
      string,
      {
        revenue: number;
        currencyCode: string;
      }
    >();

    for (const row of report.rows) {
      const date = new Date(row.orderDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;

      const current = byDate.get(key);
      if (current) {
        current.revenue += row.lineTotal;
      } else {
        byDate.set(key, {
          revenue: row.lineTotal,
          currencyCode: row.currencyCode,
        });
      }
    }

    return [...byDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateKey, value]) => {
        const date = new Date(`${dateKey}T00:00:00`);
        return {
          dateKey,
          shortLabel: date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          fullLabel: date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          revenue: value.revenue,
          currencyCode: value.currencyCode,
        };
      });
  }, [report]);

  const maxDailyRevenue = useMemo(() => {
    return dailySales.reduce((max, point) => {
      return Math.max(max, point.revenue);
    }, 0);
  }, [dailySales]);

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
        const result = await api.query(SALES_MARGIN_REPORT, {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        });
        if (result?.salesMarginReport) {
          setReport(result.salesMarginReport as ReportData);
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

  async function openOrder(orderId: string) {
    setDrawerOpen(true);
    setOrderLoading(true);
    setOrderDetail(null);
    let active = true;
    try {
      const result = await api.query(GET_ORDER_DETAIL, { id: orderId });
      if (!active) return;
      if (result?.order) {
        setOrderDetail(result.order as OrderDetail);
      }
    } catch {
      if (active) toast.error("Failed to load order details.");
    } finally {
      if (active) setOrderLoading(false);
    }
    return () => {
      active = false;
    };
  }

  const fmt = (value: number, code: string) => formatCurrency(value, code);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Sales Margin Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Analyze revenue, costs and margin across placed orders.
        </p>
      </div>

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
                    {PRESETS.find((p) => p.value === preset)?.label ?? "Custom"}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {report.summary.orderCount}
                </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {fmt(
                    report.summary.totalRevenue,
                    report.summary.currencyCode,
                  )}
                </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {fmt(report.summary.totalCost, report.summary.currencyCode)}
                </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {fmt(report.summary.totalMargin, report.summary.currencyCode)}
                </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Margin %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {report.summary.marginPercent}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Date</CardTitle>
            </CardHeader>
            <CardContent>
              {dailySales.length > 0 ? (
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max items-end gap-2">
                    {dailySales.map((point) => {
                      const height =
                        maxDailyRevenue > 0
                          ? Math.max((point.revenue / maxDailyRevenue) * 100, 2)
                          : 2;

                      return (
                        <div
                          key={point.dateKey}
                          className="flex w-12 shrink-0 flex-col items-center gap-2"
                          title={`${point.fullLabel}: ${fmt(point.revenue, point.currencyCode)}`}
                        >
                          <div className="flex h-40 w-full items-end rounded-md bg-muted/40 p-1">
                            <div
                              className="w-full rounded-sm bg-primary"
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground text-center leading-tight">
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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow
                    key={`${row.orderId}-${row.sku}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openOrder(row.orderId)}
                  >
                    <TableCell className="font-mono text-xs text-primary underline">
                      {row.orderCode}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(row.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.sku}
                    </TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right">
                      {fmt(row.unitPrice, row.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(row.lineTotal, row.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(row.unitCost, row.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(row.lineCost, row.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(row.margin, row.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
                {report.rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-muted-foreground py-8"
                    >
                      No orders with cost data found in this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
      {/* Order detail drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Order {orderDetail?.code ?? ""}</SheetTitle>
            <SheetDescription>
              {orderDetail?.orderPlacedAt
                ? `Placed on ${new Date(orderDetail.orderPlacedAt).toLocaleDateString()}`
                : ""}
            </SheetDescription>
          </SheetHeader>

          {orderLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading…
            </div>
          )}

          {orderDetail && !orderLoading && (
            <div className="space-y-5 py-4 px-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="outline">{orderDetail.state}</Badge>
              </div>

              <Separator />

              {/* Customer */}
              {orderDetail.customer && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Customer</h4>
                  <p className="text-sm">
                    {orderDetail.customer.firstName}{" "}
                    {orderDetail.customer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {orderDetail.customer.emailAddress}
                  </p>
                </div>
              )}

              {/* Shipping address */}
              {orderDetail.shippingAddress && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    Shipping Address
                  </h4>
                  <p className="text-sm">
                    {orderDetail.shippingAddress.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      orderDetail.shippingAddress.streetLine1,
                      orderDetail.shippingAddress.streetLine2,
                      orderDetail.shippingAddress.city,
                      orderDetail.shippingAddress.province,
                      orderDetail.shippingAddress.postalCode,
                      orderDetail.shippingAddress.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}

              {/* Shipping method */}
              {orderDetail.shippingLines.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Shipping</h4>
                  {orderDetail.shippingLines.map((sl, i) => (
                    <p key={i} className="text-sm">
                      {sl.shippingMethod.name} —{" "}
                      {fmt(sl.priceWithTax, orderDetail.currencyCode)}
                    </p>
                  ))}
                </div>
              )}

              <Separator />

              {/* Line items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetail.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="text-sm">
                            {line.productVariant.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {line.productVariant.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(line.unitPriceWithTax, orderDetail.currencyCode)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(line.linePriceWithTax, orderDetail.currencyCode)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {fmt(orderDetail.subTotalWithTax, orderDetail.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {fmt(orderDetail.shippingWithTax, orderDetail.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span>
                    {fmt(orderDetail.totalWithTax, orderDetail.currencyCode)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Link to order detail page */}
              <Button
                variant="outline"
                className="w-full"
                render={(props) => (
                  <Link to={`/orders/${orderDetail.id}`} {...props}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open order details
                  </Link>
                )}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
