import {
  Alert,
  AlertDescription,
  api,
  Card,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  VendureImage,
} from "@vendure/dashboard";
import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { graphql } from "@/gql";

import { formatMoney } from "./shared";

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
    }
  }
`);

export function ConsignmentReportPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<any[]>([]);
  const [partialPaymentCount, setPartialPaymentCount] = useState(0);
  const [paymentSummary, setPaymentSummary] = useState({
    paidAmount: 0,
    remainingAmount: 0,
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
    debtValue:
      totals.intakeValue - paymentSummary.paidAmount - totals.returnedValue,
  };

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      setPartialPaymentCount(0);
      setPaymentSummary({ paidAmount: 0, remainingAmount: 0 });
      return;
    }
    void Promise.all([
      api.query(GET_REPORT, { storeId }),
      api.query(GET_PAYMENT_SUMMARY, { storeId }),
    ]).then(([reportResult, paymentResult]) => {
      setRows(((reportResult as any)?.consignmentReport ?? []) as any[]);

      const payments = ((paymentResult as any)?.consignmentPayments ??
        []) as any[];
      const nextPartialPaymentCount = payments.filter(
        (payment) => (payment.remainingAmount ?? 0) > 0,
      ).length;
      const nextPaymentSummary = payments.reduce(
        (acc, payment) => ({
          paidAmount: acc.paidAmount + (payment.paidAmount ?? 0),
          remainingAmount: acc.remainingAmount + (payment.remainingAmount ?? 0),
        }),
        { paidAmount: 0, remainingAmount: 0 },
      );
      setPartialPaymentCount(nextPartialPaymentCount);
      setPaymentSummary(nextPaymentSummary);
    });
  }, [storeId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Intake Value</p>
          <p className="text-2xl font-semibold">
            {formatMoney(summaryTotals.intakeValue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Return Value</p>
          <p className="text-2xl font-semibold">
            {formatMoney(summaryTotals.returnValue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Paid Value</p>
          <p className="text-2xl font-semibold">
            {formatMoney(summaryTotals.paidValue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Debt</p>
          <p className="text-2xl font-semibold">
            {formatMoney(summaryTotals.debtValue)}
          </p>
        </Card>
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
                <TableRow key={row.quotationId}>
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
                  <TableCell>{formatMoney(row.consignmentPrice)}</TableCell>
                  <TableCell>{row.intakeQty}</TableCell>
                  <TableCell>{formatMoney(row.intakeValue)}</TableCell>
                  <TableCell>{row.paidQty}</TableCell>
                  <TableCell>{formatMoney(row.paidValue)}</TableCell>
                  <TableCell>{row.returnedQty}</TableCell>
                  <TableCell>{formatMoney(row.returnedValue)}</TableCell>
                  <TableCell>{row.debtQty}</TableCell>
                  <TableCell>{formatMoney(row.debtValue)}</TableCell>
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
                  {formatMoney(totals.intakeValue)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="font-semibold">
                  {formatMoney(totals.paidValue)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="font-semibold">
                  {formatMoney(totals.returnedValue)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="font-semibold">
                  {formatMoney(totals.debtValue)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>
    </div>
  );
}
