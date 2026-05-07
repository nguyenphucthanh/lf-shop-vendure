import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  HeaderContext,
  SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTable, DataTableColumnHeader } from "@vendure/dashboard";

/**
 * Props for ClientDataTable component
 * @template TData - The row data type
 */
export interface ClientDataTableProps<TData> {
  /** Array of column definitions */
  columns: ColumnDef<TData>[];
  /** Table data rows */
  data: TData[];
  /** Optional loading state */
  isLoading?: boolean;
  /** Initial sort configuration */
  initialSorting?: SortingState;
}

/**
 * ClientDataTable - A client-side sortable and paginated data table wrapper
 *
 * Features:
 * - Automatic client-side sorting for all columns
 * - Built-in pagination (10/25/50 rows per page)
 * - Clickable rows with optional callback
 * - Full type safety with generics
 * - Uses @vendure/dashboard DataTable and DataTableColumnHeader
 *
 * @example
 * ```tsx
 * interface Order {
 *   id: string;
 *   code: string;
 *   date: string;
 *   total: number;
 * }
 *
 * const columns: ColumnDef<Order>[] = [
 *   {
 *     accessorKey: "code",
 *     header: "Order Code",
 *   },
 *   {
 *     accessorKey: "date",
 *     header: "Date",
 *     cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
 *     sortingFn: (rowA, rowB) => {
 *       const dateA = new Date(rowA.getValue("date") as string).getTime();
 *       const dateB = new Date(rowB.getValue("date") as string).getTime();
 *       return dateA - dateB;
 *     },
 *   },
 *   {
 *     accessorKey: "total",
 *     header: "Total",
 *     cell: (info) => `$${info.getValue()}`,
 *     sortingFn: "basic",
 *   },
 * ];
 *
 * export function OrdersTable({ orders }: { orders: Order[] }) {
 *   return (
 *     <ClientDataTable
 *       columns={columns}
 *       data={orders}
 *       onRowClick={(order) => navigateToOrder(order.id)}
 *     />
 *   );
 * }
 * ```
 */
export function ClientDataTable<TData extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  initialSorting = [],
}: Readonly<ClientDataTableProps<TData>>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  // Wrap string headers with DataTableColumnHeader to enable sort icons
  const memoizedColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    return columns.map((col) => {
      if (col.header && typeof col.header === "string") {
        const colDef = col;
        return {
          ...col,
          header: (headerContext: HeaderContext<TData, unknown>) => (
            <DataTableColumnHeader
              headerContext={headerContext}
              customConfig={colDef}
            />
          ),
        } as ColumnDef<TData, unknown>;
      }
      return col as ColumnDef<TData, unknown>;
    });
  }, [columns]);

  return (
    <DataTable<TData>
      columns={memoizedColumns}
      data={data}
      totalItems={data.length}
      isLoading={isLoading}
      sorting={sorting}
      onSortChange={(table, newSorting) => setSorting(newSorting)}
      setTableOptions={(options) => ({
        ...options,
        // Enable client-side row models
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        // Disable manual modes (use automatic row models)
        manualPagination: false,
        manualSorting: false,
        manualFiltering: false,
        // Set default page size
        initialState: {
          ...options.initialState,
          pagination: {
            pageIndex: 0,
            pageSize: 25,
          },
        },
      })}
    />
  );
}

export type { ColumnDef } from "@tanstack/react-table";
