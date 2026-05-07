/**
 * ClientDataTable Usage Example
 *
 * This example shows how to use the ClientDataTable component for a typical
 * report table with sorting and pagination.
 */

import { ColumnDef } from "@tanstack/react-table";
import { ClientDataTable } from "~/components/dashboard";

// Define your row data type
interface SalesRow {
  id: string;
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
}

// Example component showing ClientDataTable usage
export function SalesTableExample({
  rows,
  isLoading,
  onRowClick,
  formatCurrency,
}: {
  rows: SalesRow[];
  isLoading: boolean;
  onRowClick: (orderId: string) => void;
  formatCurrency: (value: number, code: string) => string;
}) {
  // Define columns with proper types
  const columns: ColumnDef<SalesRow>[] = [
    {
      accessorKey: "orderCode",
      header: "Order",
      cell: (info) => (
        <span className="font-mono text-xs text-primary underline">
          {info.getValue()}
        </span>
      ),
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "orderDate",
      header: "Date",
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
      // Custom sort function for dates
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.getValue("orderDate") as string).getTime();
        const dateB = new Date(rowB.getValue("orderDate") as string).getTime();
        return dateA - dateB;
      },
    },
    {
      accessorKey: "productName",
      header: "Product",
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: (info) => (
        <span className="font-mono text-xs">{info.getValue()}</span>
      ),
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "quantity",
      header: () => <div className="text-right">Qty</div>,
      cell: (info) => <div className="text-right">{info.getValue()}</div>,
      sortingFn: "basic",
    },
    {
      accessorKey: "unitPrice",
      header: () => <div className="text-right">Unit Price</div>,
      cell: (info) => (
        <div className="text-right">
          {formatCurrency(info.getValue() as number, "USD")}
        </div>
      ),
      sortingFn: "basic",
    },
    {
      accessorKey: "lineTotal",
      header: () => <div className="text-right">Line Total</div>,
      cell: (info) => (
        <div className="text-right">
          {formatCurrency(info.getValue() as number, "USD")}
        </div>
      ),
      sortingFn: "basic",
    },
    {
      accessorKey: "unitCost",
      header: () => <div className="text-right">Unit Cost</div>,
      cell: (info) => (
        <div className="text-right">
          {formatCurrency(info.getValue() as number, "USD")}
        </div>
      ),
      sortingFn: "basic",
    },
    {
      accessorKey: "lineCost",
      header: () => <div className="text-right">Line Cost</div>,
      cell: (info) => (
        <div className="text-right">
          {formatCurrency(info.getValue() as number, "USD")}
        </div>
      ),
      sortingFn: "basic",
    },
    {
      accessorKey: "margin",
      header: () => <div className="text-right">Margin</div>,
      cell: (info) => (
        <div className="text-right font-semibold">
          {formatCurrency(info.getValue() as number, "USD")}
        </div>
      ),
      sortingFn: "basic",
    },
  ];

  return (
    <ClientDataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      emptyMessage="No orders with cost data found in this period."
      onRowClick={(row) => onRowClick(row.orderId)}
      // Optional: set initial sorting
      initialSorting={[{ id: "orderDate", desc: true }]}
    />
  );
}

/**
 * Benefits of using ClientDataTable:
 *
 * ✅ Automatic client-side sorting - no manual sort state needed
 * ✅ Automatic pagination - no page/pageSize state management
 * ✅ Click handlers on rows - easily add callbacks
 * ✅ Type-safe columns - full TypeScript support
 * ✅ Consistent UI - uses @vendure/dashboard DataTable under the hood
 * ✅ Performance optimized - memoized columns, built-in pagination
 * ✅ Less code - removes ~50 lines of manual sort/pagination logic
 *
 * In sales-margin-report.tsx, you can now:
 * 1. Remove: orderSortKey, orderSortDir, page, pageSize state
 * 2. Remove: sortedRows, paginatedRows, totalPages memos
 * 3. Remove: handleOrderSort function
 * 4. Remove: useEffects for page reset
 * 5. Remove: manual pagination controls
 * 6. Replace entire table section with: <ClientDataTable ... />
 */
