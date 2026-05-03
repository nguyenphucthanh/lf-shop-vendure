import {
  api,
  Card,
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

export function ConsignmentReportPage(props: { storeId: string }) {
  const { storeId } = props;
  const [rows, setRows] = useState<any[]>([]);

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

  useEffect(() => {
    if (!storeId) {
      setRows([]);
      return;
    }
    void api.query(GET_REPORT, { storeId }).then((result) => {
      setRows(((result as any)?.consignmentReport ?? []) as any[]);
    });
  }, [storeId]);

  return (
    <Card className="overflow-hidden p-0">
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
  );
}
