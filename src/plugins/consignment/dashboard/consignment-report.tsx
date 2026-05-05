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
  useLocalFormat,
  VendureImage,
} from "@vendure/dashboard";
import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { graphql } from "@/gql";

// Helper to get translated name based on language code
function getTranslatedName(
  translations: Array<{ languageCode: string; name: string }> | undefined,
  preferredLanguageCode?: string,
): string {
  if (!translations || translations.length === 0) return "";

  // Try to find exact match for preferred language
  if (preferredLanguageCode) {
    const match = translations.find(
      (t) => t.languageCode === preferredLanguageCode,
    );
    if (match) return match.name;
  }

  // Fallback to empty languageCode (context default)
  const contextDefault = translations.find((t) => t.languageCode === "");
  if (contextDefault) return contextDefault.name;

  // Fallback to first available translation
  return translations[0]?.name ?? "";
}

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

export function ConsignmentReportPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { storeId } = props;
  const [rows, setRows] = useState<
    ResultOf<typeof GET_REPORT>["consignmentReport"]
  >([]);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [paymentSummary, setPaymentSummary] = useState({
    subtotal: 0,
    discount: 0,
    total: 0,
  });

  const [returnSummary, setReturnSummary] = useState(0);
  const [intakeSummary, setIntakeSummary] = useState(0);

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      setPendingPaymentCount(0);
      setPaymentSummary({ subtotal: 0, discount: 0, total: 0 });
      return;
    }
    void Promise.all([
      api.query(GET_REPORT, { storeId }),
      api.query(GET_INTAKE_SUMMARY, { storeId }),
      api.query(GET_PAYMENT_SUMMARY, { storeId }),
      api.query(GET_RETURNED_SUMMARY, { storeId }),
    ]).then(([reportResult, intakeResult, paymentResult, returnResult]) => {
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
    });
  }, [storeId]);

  const debtSummary =
    intakeSummary -
    (paymentSummary.total ?? 0) -
    returnSummary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Card size="sm">
            <CardHeader>
              <CardTitle>∑ Intake</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-right">
                {formatCurrency(intakeSummary, "USD")}
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader>
              <CardTitle>∑ Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-right">
                {formatCurrency(paymentSummary.subtotal, "USD")}
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-md font-semibold text-right">
                Discount in payments:{" "}
                {formatCurrency(paymentSummary.discount, "USD")}
              </p>
            </CardFooter>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader>
              <CardTitle>∑ Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-right">
                {formatCurrency(returnSummary, "USD")}
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader>
              <CardTitle>∑ Debt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-right">
                {formatCurrency(debtSummary, "USD")}
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
        <CardHeader className="p-2 py-2">
          <CardTitle>Report by items</CardTitle>
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
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quoted</TableHead>
                <TableHead>Intake Qty</TableHead>
                <TableHead>Sold Qty</TableHead>
                <TableHead>Returned Qty</TableHead>
                <TableHead>Debt Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.quotationId}
                  className={cn(row.debtQty < 0 ? "bg-red-50" : "")}
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
                    {formatCurrency(row.consignmentPrice, "USD")}
                  </TableCell>
                  <TableCell>{row.intakeQty}</TableCell>
                  <TableCell>{row.soldQty}</TableCell>
                  <TableCell>{row.returnedQty}</TableCell>
                  <TableCell>{row.debtQty}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
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
