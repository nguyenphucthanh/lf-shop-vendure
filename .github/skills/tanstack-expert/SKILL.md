---
name: tanstack-expert
description: "TanStack expert for React Query and React Table. Use when: build data tables with sorting/filtering/pagination, manage server-side state with queries and mutations, optimize data fetching, setup infinite queries, handle stale data, configure caching strategies, implement paginated lists, create reusable table hooks, TanStack best practices, React Query configuration, React Table column definitions."
argument-hint: "Describe the table feature, data fetching issue, or TanStack pattern to implement"
---

# TanStack Expert

Expert guidance on **TanStack React Query** and **TanStack React Table** for this Vendure dashboard project.

## When to Use

- Building or optimizing data tables with sorting, filtering, and pagination
- Fetching and caching server data from Vendure GraphQL API
- Managing complex query states (loading, error, refetch, etc.)
- Implementing mutations with optimistic updates
- Structuring paginated list pages with filters
- Configuring cache invalidation strategies
- Debugging stale data or refetch issues
- Setting up infinite scroll or pagination patterns

---

## 0. Stack Overview

### Installed Versions

- **React Query** (TanStack Query v5): Server-side state management
- **React Table** (TanStack Table v8): Unstyled, headless table library
- **@vendure/dashboard**: Exports pre-built table components and hooks using these libraries

### Import Pattern

```tsx
// For components & hooks from @vendure/dashboard
import { DataTable, useLocalFormat } from "@vendure/dashboard";

// For direct TanStack usage (if needed)
import { useQuery, useMutation } from "@tanstack/react-query";
import { ColumnDef, useReactTable } from "@tanstack/react-table";
```

---

## 1. Data Tables (React Table)

### Basic Pattern: Using `@vendure/dashboard` DataTable

Most tables should use the pre-built `DataTable` component:

```tsx
import {
  DataTable,
  useLocalFormat,
  Button,
  DropdownMenu,
} from "@vendure/dashboard";
import { useQuery } from "@tanstack/react-query";

export function ProductList() {
  const { formatCurrency } = useLocalFormat();

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.query(LIST_PRODUCTS, {}),
  });

  // Define columns
  const columns = [
    {
      accessorKey: "name",
      header: "Product Name",
    },
    {
      accessorKey: "priceWithTax",
      header: "Price",
      cell: (info) =>
        formatCurrency(info.getValue(), "USD"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.products?.items ?? []}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

### Column Definition Patterns

Define columns using `ColumnDef` for full type safety and flexibility:

```typescript
import { ColumnDef } from "@tanstack/react-table";

type OrderRow = {
  id: string;
  code: string;
  date: string;
  total: number;
};

const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "code",
    header: "Order Code",
    cell: (info) => info.getValue(),
    // Enable sorting by default
    enableSorting: true,
    // Custom sort function
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue("date") as string).getTime();
      const dateB = new Date(rowB.getValue("date") as string).getTime();
      return dateA - dateB;
    },
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Total</div>,
    cell: (info) => <div className="text-right">{info.getValue()}</div>,
    sortingFn: "basic",
  },
];
```

### Client-Side Sorting

Enable sorting in table options:

```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(), // Enable client-side sorting
  state: {
    sorting,
  },
  onSortingChange: setSorting,
});
```

### Client-Side Pagination

Enable pagination using built-in row model:

```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: {
    pagination: { pageIndex, pageSize },
  },
  onPaginationChange: setPagination,
});

// Access pagination state
table.getState().pagination.pageIndex; // 0-based
table.getState().pagination.pageSize;
table.getPageCount();
table.getCanNextPage();
table.getCanPreviousPage();
```

### Sorting State Management

```typescript
import { SortingState } from "@tanstack/react-table";

const [sorting, setSorting] = useState<SortingState>([
  {
    id: "date", // column accessor key
    desc: true, // descending order
  },
]);

// Toggle sort direction
column.toggleSorting(); // true (asc), false (desc), undefined (clear)
column.toggleSorting(false); // explicitly set to asc
```

### Row Model Functions

- `getCoreRowModel()` - Always required, provides core data without filtering
- `getSortedRowModel()` - Applies sorting to core data
- `getFilteredRowModel()` - Applies column filters
- `getPaginationRowModel()` - Applies pagination to filtered/sorted data
- `getGroupedRowModel()` - Groups rows
- Order matters: Core → Filtered → Sorted → Grouped → Paginated

### Accessing Row Data

```typescript
table.getRowModel().rows.forEach((row) => {
  const value = row.getValue("columnId");
  const original = row.original; // original object
  const id = row.id;
});
```

## Integration with @vendure/dashboard

### Using DataTable Component

The `DataTable` component from `@vendure/dashboard` wraps TanStack React Table and provides:

- Built-in sorting UI via `DataTableColumnHeader`
- Pagination controls via `DataTablePagination`
- Filtering and view options
- Bulk actions support
- Manual mode for server-side operations

For client-side tables, override via `setTableOptions`:

```typescript
<DataTable
  columns={columns}
  data={data}
  totalItems={data.length}
  setTableOptions={(opts) => ({
    ...opts,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
  })}
/>
```

## Common Patterns

### Sortable Column with Custom Logic

```typescript
{
  accessorKey: "amount",
  header: "Amount",
  cell: (info) => formatCurrency(info.getValue()),
  sortingFn: (rowA, rowB) => {
    const a = rowA.getValue("amount") as number;
    const b = rowB.getValue("amount") as number;
    return a - b;
  },
}
```

### Clickable Rows

Add `onClick` to `TableRow` to handle row selection:

```typescript
<TableBody>
  {table.getRowModel().rows.map((row) => (
    <TableRow
      key={row.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleRowClick(row.original)}
    >
      {/* cells */}
    </TableRow>
  ))}
</TableBody>
```

### Resetting Pagination on Data Change

```typescript
useEffect(() => {
  table.resetPageIndex();
}, [data]);
```

### Getting Current Sort/Page State

```typescript
const { sorting, pagination } = table.getState();
const sortField = sorting[0]?.id;
const sortOrder = sorting[0]?.desc ? "desc" : "asc";
const pageIndex = pagination.pageIndex;
const pageSize = pagination.pageSize;
```

## Type Safety Tips

- Always define row type: `ColumnDef<RowType>[]`
- Use `accessorKey` or `accessorFn` with correct property names
- Define column accessors as const to catch typos at compile time:
  ```typescript
  const COLUMN_KEYS = {
    code: "code",
    date: "date",
  } as const;
  ```

## Performance Considerations

- Use `useMemo` for columns array (rarely changes)
- Use `useCallback` for sort/filter handlers
- Don't re-create column definitions on every render
- For large datasets (1000+), consider server-side pagination
- Client-side sorting/pagination works well for <500 rows

## Resources

- [@tanstack/react-table v8 Docs](https://tanstack.com/table/v8/docs/guide/introduction)
- [Column Definitions](https://tanstack.com/table/v8/docs/guide/column-defs)
- [Sorting](https://tanstack.com/table/v8/docs/guide/sorting)
- [Pagination](https://tanstack.com/table/v8/docs/guide/pagination)
