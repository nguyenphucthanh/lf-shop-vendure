import {
  Alert,
  AlertDescription,
  api,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
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
import {
  BadgeDollarSign,
  CircleDollarSign,
  PackageX,
  TriangleAlert,
  TrendingDown,
} from "lucide-react";

import { graphql } from "@/gql";
import { getTranslatedName, SortButton, SortDir, SortKey } from "./shared";

const GET_REPORT = graphql(`
  query ConsignmentReport($storeId: ID!) {
    consignmentReport(storeId: $storeId) {
      quotationId
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
      consignmentPrice
      intakeQty
      soldQty
      returnedQty
      debtQty
    }
  }
`);

const GET_INTAKE_SUMMARY = graphql(`
  query ConsignmentReportIntakeSummary($storeId: ID!) {
    consignmentIntakes(storeId: $storeId) {
      id
      total
    }
  }
`);

const GET_PAYMENT_SUMMARY = graphql(`
  query ConsignmentReportPaymentSummary($storeId: ID!) {
    consignmentPayments(storeId: $storeId) {
      id
      subtotal
      discount
      total
      paymentStatus
    }
  }
`);

const GET_RETURNED_SUMMARY = graphql(`
  query ConsignmentReportReturnedSummary($storeId: ID!) {
    consignmentReturns(storeId: $storeId) {
      id
      total
    }
  }
`);

type ReportRow = ResultOf<typeof GET_REPORT>["consignmentReport"][number];
export function ConsignmentReportPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { activeChannel } = useChannel();
  const { storeId } = props;
  const defaultCurrency = activeChannel?.defaultCurrencyCode ?? "USD";
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [paymentSummary, setPaymentSummary] = useState({
    subtotal: 0,
    discount: 0,
    total: 0,
  });
  const [returnSummary, setReturnSummary] = useState(0);
  const [intakeSummary, setIntakeSummary] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("intake");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
        case "name": {
          const aName = getTranslatedName(
            a.productNameTranslations ?? [],
          ).toLowerCase();
          const bName = getTranslatedName(
            b.productNameTranslations ?? [],
          ).toLowerCase();
          av = aName;
          bv = bName;
          break;
        }
        case "sku": {
          av = (a.sku ?? "").toLowerCase();
          bv = (b.sku ?? "").toLowerCase();
          break;
        }
        case "price":
          av = a.consignmentPrice ?? 0;
          bv = b.consignmentPrice ?? 0;
          break;
        case "intake":
          av = a.intakeQty ?? 0;
          bv = b.intakeQty ?? 0;
          break;
        case "sold":
          av = a.soldQty ?? 0;
          bv = b.soldQty ?? 0;
          break;
        case "returned":
          av = a.returnedQty ?? 0;
          bv = b.returnedQty ?? 0;
          break;
        case "debt":
          av = a.debtQty ?? 0;
          bv = b.debtQty ?? 0;
          break;
        default:
          return 0;
      }
      const aNum = Number(av);
      const bNum = Number(bv);
      if (aNum < bNum) return sortDir === "asc" ? -1 : 1;
      if (aNum > bNum) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      setPendingPaymentCount(0);
      setPaymentSummary({ subtotal: 0, discount: 0, total: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([
      api.query(GET_REPORT, { storeId }),
      api.query(GET_INTAKE_SUMMARY, { storeId }),
      api.query(GET_PAYMENT_SUMMARY, { storeId }),
      api.query(GET_RETURNED_SUMMARY, { storeId }),
    ])
      .then(([reportResult, intakeResult, paymentResult, returnResult]) => {
        setRows(reportResult?.consignmentReport ?? []);

        const payments = paymentResult?.consignmentPayments ?? [];
        const nextPendingPaymentCount = payments.filter(
          (payment) => (payment.paymentStatus ?? "") !== "Completed",
        ).length;
        setPendingPaymentCount(nextPendingPaymentCount);
        const nextPaymentSummary = payments.reduce(
          (acc, payment) => ({
            subtotal: acc.subtotal + (payment.subtotal ?? 0),
            discount: acc.discount + (payment.discount ?? 0),
            total: acc.total + (payment.total ?? 0),
          }),
          { subtotal: 0, discount: 0, total: 0 },
        );
        setPaymentSummary(nextPaymentSummary);
        const nextIntakeSummary = intakeResult?.consignmentIntakes.reduce(
          (acc, intake) => acc + (intake.total ?? 0),
          0,
        );
        setIntakeSummary(nextIntakeSummary ?? 0);
        const nextReturnSummary = returnResult?.consignmentReturns.reduce(
          (acc, ret) => acc + (ret.total ?? 0),
          0,
        );
        setReturnSummary(nextReturnSummary ?? 0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [storeId]);

  const debtSummary =
    intakeSummary - (paymentSummary.total ?? 0) - returnSummary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ∑ Intake
              </CardTitle>
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(intakeSummary, defaultCurrency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total value received from store
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ∑ Paid
              </CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(paymentSummary.subtotal, defaultCurrency)}
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Discount in payments:{" "}
                {formatCurrency(paymentSummary.discount, defaultCurrency)}
              </p>
            </CardFooter>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ∑ Returned
              </CardTitle>
              <PackageX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(returnSummary, defaultCurrency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Value of items returned to store
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ∑ Debt
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(debtSummary, defaultCurrency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Intake − paid − returned
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {pendingPaymentCount > 0 ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            There are {pendingPaymentCount} payment
            {pendingPaymentCount > 1 ? "s" : ""} not marked as completed.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-2 py-2">
          <div className="flex items-center justify-between">
            <CardTitle>
              Report by items ({loading ? "…" : rows.length})
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
                <TableHead colSpan={4}>Product</TableHead>
                <TableHead colSpan={1}>Intake</TableHead>
                <TableHead colSpan={1}>Sold</TableHead>
                <TableHead colSpan={1}>Returned</TableHead>
                <TableHead colSpan={1}>Debt</TableHead>
              </TableRow>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>
                  <SortButton
                    label="SKU"
                    sortKey="sku"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
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
                    label="Quoted"
                    sortKey="price"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Intake Qty"
                    sortKey="intake"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Sold Qty"
                    sortKey="sold"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Returned Qty"
                    sortKey="returned"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Debt Qty"
                    sortKey="debt"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
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
              ) : (
                sorted.map((row) => (
                  <TableRow
                    key={row.quotationId}
                    className={cn(
                      row.debtQty < 0 ? "bg-red-50 dark:bg-red-950/20" : "",
                    )}
                  >
                    <TableCell>
                      {row.featuredAsset ? (
                        <VendureImage
                          className="h-12 w-12 rounded object-cover"
                          asset={row.featuredAsset}
                          preset="thumb"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell>
                      {getTranslatedName(row.productNameTranslations)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(row.consignmentPrice, defaultCurrency)}
                    </TableCell>
                    <TableCell>{row.intakeQty}</TableCell>
                    <TableCell>{row.soldQty}</TableCell>
                    <TableCell>{row.returnedQty}</TableCell>
                    <TableCell>{row.debtQty}</TableCell>
                  </TableRow>
                ))
              )}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No report data available.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
