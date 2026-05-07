# TanStack Expert Skill

## Overview

Expert guidance on TanStack libraries (React Table, React Query, React Router) used in Vendure dashboard development. Focuses on client-side data manipulation, sorting, filtering, and pagination.

## TanStack React Table Best Practices

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
