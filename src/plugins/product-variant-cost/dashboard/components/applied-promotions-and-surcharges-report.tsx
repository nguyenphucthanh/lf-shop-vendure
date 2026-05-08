import {
  api,
  Card,
  DateRangePicker,
  FullWidthPageBlock,
  Page,
  PageLayout,
  PageTitle,
  useLocalFormat,
} from "@vendure/dashboard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

import { ClientDataTable, SummaryStatCard } from "~/components/dashboard";
import { graphql } from "@/gql";
import { toast } from "sonner";

const APPLIED_PROMOTIONS_AND_SURCHARGES_REPORT = graphql(`
  query AppliedPromotionsAndSurchargesReport($from: DateTime!, $to: DateTime!) {
    appliedPromotionsAndSurchargesReport(from: $from, to: $to) {
      rows {
        promotionName
        code
        totalApplied
        subtotal
        currencyCode
      }
      summary {
        totalUsedPromotions
        totalPromotionValue
        totalSurcharges
        totalSurchargeValue
        currencyCode
      }
    }
  }
`);

type ReportData = {
  rows: Array<{
    promotionName: string;
    code: string;
    totalApplied: number;
    subtotal: number;
    currencyCode: string;
  }>;
  summary: {
    totalUsedPromotions: number;
    totalPromotionValue: number;
    totalSurcharges: number;
    totalSurchargeValue: number;
    currencyCode: string;
  };
};

type TableRowData = {
  id: string;
  promotionName: string;
  code: string;
  totalApplied: number;
  subtotal: number;
  currencyCode: string;
};

export function AppliedPromotionsAndSurchargesReport() {
  const { formatCurrency } = useLocalFormat();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const fmt = useCallback(
    (value: number, code: string) => formatCurrency(value, code),
    [formatCurrency],
  );

  const tableData = useMemo<TableRowData[]>(() => {
    if (!report) {
      return [];
    }

    return report.rows.map((row, index) => ({
      id: `${row.promotionName}-${row.code}-${index}`,
      promotionName: row.promotionName,
      code: row.code,
      totalApplied: row.totalApplied,
      subtotal: row.subtotal,
      currencyCode: row.currencyCode,
    }));
  }, [report]);

  const columns = useMemo<ColumnDef<TableRowData>[]>(
    () => [
      {
        accessorKey: "promotionName",
        header: "Promotion Name",
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: (info) => {
          const code = info.getValue() as string;
          return code.length > 0 ? (
            <span className="font-mono text-xs">{code}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "totalApplied",
        header: "Total Applied",
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

      const daysDiff =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        toast("Date range cannot exceed 365 days");
        return;
      }

      setLoading(true);
      try {
        const result = await api.query(
          APPLIED_PROMOTIONS_AND_SURCHARGES_REPORT,
          {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        );

        if (result?.appliedPromotionsAndSurchargesReport) {
          setReport(result.appliedPromotionsAndSurchargesReport as ReportData);
        }
      } catch {
        toast.error("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [dateRange],
  );

  useEffect(() => {
    void runReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page
      pageId="applied-promotions-and-surcharges"
      title="Applied Promotions and Surcharges"
    >
      <PageTitle>Applied Promotions and Surcharges</PageTitle>
      <PageLayout>
        <FullWidthPageBlock blockId="main">
          <div className="space-y-6 p-6">
            <Card className="p-4">
              <div className="flex gap-4 items-end flex-wrap">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={(range) => {
                    setDateRange(range);
                    void runReport(range);
                  }}
                />
              </div>
            </Card>

            {report && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <SummaryStatCard
                    title="Total Used Promotions"
                    value={report.summary.totalUsedPromotions.toString()}
                  />
                  <SummaryStatCard
                    title="Total Promotion Value"
                    value={fmt(
                      report.summary.totalPromotionValue,
                      report.summary.currencyCode,
                    )}
                  />
                  <SummaryStatCard
                    title="Surcharge Count"
                    value={report.summary.totalSurcharges.toString()}
                  />
                  <SummaryStatCard
                    title="Total Surcharge Value"
                    value={fmt(
                      report.summary.totalSurchargeValue,
                      report.summary.currencyCode,
                    )}
                  />
                </div>

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
