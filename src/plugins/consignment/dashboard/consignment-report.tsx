import {
  Alert,
  AlertDescription,
  api,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
  ResultOf,
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
      intakeValue
      paidQty
      paidValue
      returnedQty
      returnedValue
      debtQty
      debtValue
    }
  }
`);

const GET_PAYMENT_SUMMARY = graphql(`
  query ConsignmentReportPaymentSummary($storeId: ID!) {
    consignmentPayments(storeId: $storeId) {
      id
      paidAmount
      remainingAmount
      discount
    }
  }
`);

export function ConsignmentReportPage(props: { storeId: string }) {
  const { formatCurrency } = useLocalFormat();
  const { storeId } = props;
  const [rows, setRows] = useState<
    ResultOf<typeof GET_REPORT>["consignmentReport"]
  >([]);
  const [partialPaymentCount, setPartialPaymentCount] = useState(0);
  const [paymentSummary, setPaymentSummary] = useState({
    paidAmount: 0,
    remainingAmount: 0,
    discount: 0,
  });

  const totals = rows.reduce(
    (acc, row) => ({
      intakeValue: acc.intakeValue + (row.intakeValue ?? 0),
      paidValue: acc.paidValue + (row.paidValue ?? 0),
      returnedValue: acc.returnedValue + (row.returnedValue ?? 0),
      debtValue: acc.debtValue + (row.debtValue ?? 0),
    }),
    {
      intakeValue: 0,
      paidValue: 0,
      returnedValue: 0,
      debtValue: 0,
    },
  );

  const summaryTotals = {
    intakeValue: totals.intakeValue,
    returnValue: totals.returnedValue,
    paidValue: paymentSummary.paidAmount,
    discount: paymentSummary.discount,
    debtValue:
      totals.intakeValue -
      paymentSummary.paidAmount -
      totals.returnedValue -
      paymentSummary.discount,
  };

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      setPartialPaymentCount(0);
      setPaymentSummary({ paidAmount: 0, remainingAmount: 0, discount: 0 });
      return;
    }
    void Promise.all([
      api.query(GET_REPORT, { storeId }),
      api.query(GET_PAYMENT_SUMMARY, { storeId }),
    ]).then(([reportResult, paymentResult]) => {
      setRows(reportResult?.consignmentReport ?? []);

      const payments = paymentResult?.consignmentPayments ?? [];
      const nextPartialPaymentCount = payments.filter(
        (payment) => (payment.remainingAmount ?? 0) > 0,
      ).length;
      const nextPaymentSummary = payments.reduce(
        (acc, payment) => ({
          paidAmount: acc.paidAmount + (payment.paidAmount ?? 0),
          remainingAmount: acc.remainingAmount + (payment.remainingAmount ?? 0),
          discount: acc.discount + (payment.discount ?? 0),
        }),
        { paidAmount: 0, remainingAmount: 0, discount: 0 },
      );
      setPartialPaymentCount(nextPartialPaymentCount);
      setPaymentSummary(nextPaymentSummary);
    });
  }, [storeId]);

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
                {formatCurrency(summaryTotals.intakeValue, "USD")}
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader>
              <CardTitle>∑ Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-right">
                {formatCurrency(summaryTotals.returnValue, "USD")}
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
                {formatCurrency(summaryTotals.paidValue, "USD")}
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-md font-semibold text-right">
                Discount in payments:{" "}
                {formatCurrency(summaryTotals.discount, "USD")}
              </p>
            </CardFooter>
          </Card>
        </div>
        <div>
          <Card size="sm">
            <CardHeader>
              <CardTitle>∑ Debt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-right">
                {formatCurrency(summaryTotals.debtValue, "USD")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {partialPaymentCount > 0 ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            There are {partialPaymentCount} partial payment
            {partialPaymentCount > 1 ? "s" : ""}.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-2 py-2">
          <CardTitle>Report by items</CardTitle>
          <CardDescription>
            Value in this report is estimated base on quotation prices and
            quantity, not reflecting actual sales or returns.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={4}>Product</TableHead>
                <TableHead colSpan={2}>Intake</TableHead>
                <TableHead colSpan={2}>Paid</TableHead>
                <TableHead colSpan={2}>Returned</TableHead>
                <TableHead colSpan={2}>Debt</TableHead>
              </TableRow>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quoted</TableHead>
                <TableHead>Intake Qty</TableHead>
                <TableHead>Intake Value</TableHead>
                <TableHead>Paid Qty</TableHead>
                <TableHead>Paid Value</TableHead>
                <TableHead>Returned Qty</TableHead>
                <TableHead>Returned Value</TableHead>
                <TableHead>Debt Qty</TableHead>
                <TableHead>Debt Value</TableHead>
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
                  <TableCell>
                    {formatCurrency(row.intakeValue, "USD")}
                  </TableCell>
                  <TableCell>{row.paidQty}</TableCell>
                  <TableCell>{formatCurrency(row.paidValue, "USD")}</TableCell>
                  <TableCell>{row.returnedQty}</TableCell>
                  <TableCell>
                    {formatCurrency(row.returnedValue, "USD")}
                  </TableCell>
                  <TableCell>{row.debtQty}</TableCell>
                  <TableCell>{formatCurrency(row.debtValue, "USD")}</TableCell>
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
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-semibold">
                  Total
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(totals.intakeValue, "USD")}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(totals.paidValue, "USD")}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(totals.returnedValue, "USD")}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(totals.debtValue, "USD")}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>
    </div>
  );
}
