import {
  api,
  Button,
  DateRangePicker,
  Page,
  PageLayout,
  Link,
  useLocalFormat,
  FullWidthPageBlock,
  PageTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vendure/dashboard";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

import { ClientDataTable } from "~/components/dashboard";
import { graphql } from "@/gql";
import { toast } from "sonner";

const SALES_BY_CUSTOMER_REPORT = graphql(`
  query SalesByCustomerReport($from: DateTime!, $to: DateTime!) {
    salesByCustomerReport(from: $from, to: $to) {
      customerId
      customerName
      customerEmail
      totalOrders
      totalValue
      currencyCode
    }
  }
`);

const CUSTOMER_SALES_DETAIL = graphql(`
  query CustomerSalesDetail($customerId: ID!) {
    customerSalesDetail(customerId: $customerId) {
      customerId
      customerName
      customerEmail
      totalOrdersOverall
      totalValueOverall
      latestOrders {
        id
        code
        orderDate
        total
        currencyCode
      }
      currencyCode
    }
  }
`);

type ReportData = Array<{
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalOrders: number;
  totalValue: number;
  currencyCode: string;
}>;

type TableRowData = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalOrders: number;
  totalValue: number;
  currencyCode: string;
};

type OrderSummary = {
  id: string;
  code: string;
  orderDate: string;
  total: number;
  currencyCode: string;
};

type CustomerDetail = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalOrdersOverall: number;
  totalValueOverall: number;
  latestOrders: OrderSummary[];
  currencyCode: string;
};

export function SalesByCustomerReport() {
  const { formatCurrency } = useLocalFormat();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const tableData = useMemo<TableRowData[]>(() => {
    if (!report) {
      return [];
    }
    return report.map((row, index) => ({
      id: `${row.customerId}-${index}`,
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      totalOrders: row.totalOrders,
      totalValue: row.totalValue,
      currencyCode: row.currencyCode,
    }));
  }, [report]);

  const fmt = useCallback(
    (value: number, code: string) => formatCurrency(value, code),
    [formatCurrency],
  );

  const columns = useMemo<ColumnDef<TableRowData>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: "Customer Name",
        cell: (info) => (
          <button
            onClick={() => openCustomerDetail(info.row.original.customerId)}
            className="font-medium text-primary underline hover:opacity-75 transition-opacity"
          >
            {info.getValue() as string}
          </button>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "customerEmail",
        header: "Email",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {info.getValue() as string}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "totalOrders",
        header: "Total Orders",
        cell: (info) => (
          <div className="text-right font-medium">
            {info.getValue() as number}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "totalValue",
        header: "Total Value",
        cell: (info) => (
          <div className="text-right font-medium">
            {fmt(info.getValue() as number, info.row.original.currencyCode)}
          </div>
        ),
        sortingFn: "basic",
      },
    ],
    [fmt],
  );

  const runReport = useCallback(
    async (dateRangeToUse?: { from: Date; to: Date }) => {
      const range = dateRangeToUse || dateRange;
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

      // Prevent queries for more than 1 year to avoid performance issues
      const daysDiff =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        toast("Date range cannot exceed 365 days");
        return;
      }

      setLoading(true);
      try {
        const result = await api.query(SALES_BY_CUSTOMER_REPORT, {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        });
        if (result?.salesByCustomerReport) {
          setReport(result.salesByCustomerReport as ReportData);
        }
      } catch {
        toast.error("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [dateRange],
  );

  async function openCustomerDetail(customerId: string) {
    setDrawerOpen(true);
    setDetailLoading(true);
    setCustomerDetail(null);
    let active = true;
    try {
      const result = await api.query(CUSTOMER_SALES_DETAIL, { customerId });
      if (!active) return;
      if (result?.customerSalesDetail) {
        setCustomerDetail(result.customerSalesDetail as CustomerDetail);
      }
    } catch {
      if (active) toast.error("Failed to load customer details.");
    } finally {
      if (active) setDetailLoading(false);
    }
    return () => {
      active = false;
    };
  }

  // Run on first load
  useEffect(() => {
    void runReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page pageId="sales-by-customer" title="Sales by Customer">
      <PageTitle>Sales by Customer</PageTitle>
      <PageLayout>
        <FullWidthPageBlock blockId="main">
          <div className="space-y-6 p-6">
            {/* Date filters */}
            <div className="flex gap-4 justify-end flex-wrap">
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
                {/* Detail table */}
                <ClientDataTable
                  columns={columns}
                  data={tableData}
                  isLoading={loading}
                  initialSorting={[{ id: "totalValue", desc: true }]}
                />
              </>
            )}

            {/* Customer detail drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetContent
                side="right"
                className="overflow-y-auto sm:max-w-xl"
              >
                <SheetHeader>
                  <SheetTitle>
                    {customerDetail?.customerName ?? "Customer"}
                  </SheetTitle>
                  <SheetDescription>
                    {customerDetail?.customerEmail || ""}
                  </SheetDescription>
                </SheetHeader>

                {detailLoading && (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Loading…
                  </div>
                )}

                {customerDetail && !detailLoading && (
                  <div className="space-y-5 py-4 px-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Total Orders
                        </p>
                        <p className="text-2xl font-semibold">
                          {customerDetail.totalOrdersOverall}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Total Value
                        </p>
                        <p className="text-2xl font-semibold">
                          {fmt(
                            customerDetail.totalValueOverall,
                            customerDetail.currencyCode,
                          )}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Latest orders */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3">
                        Latest Orders
                      </h4>
                      {customerDetail.latestOrders.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerDetail.latestOrders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <Link
                                    to={`/orders/${order.id}`}
                                    className="font-mono text-xs text-primary underline hover:opacity-75 transition-opacity"
                                  >
                                    {order.code}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {new Date(
                                    order.orderDate,
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {fmt(order.total, order.currencyCode)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No orders found.
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Link to customer detail page */}
                    <Button
                      className="w-full"
                      render={(props) => (
                        <Link
                          to={`/customers/${customerDetail.customerId}`}
                          {...props}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open customer details
                        </Link>
                      )}
                    />
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </FullWidthPageBlock>
      </PageLayout>
    </Page>
  );
}
