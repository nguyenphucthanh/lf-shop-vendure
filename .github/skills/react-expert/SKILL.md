---
name: react-expert
description: "React expert developer for Vendure dashboard components. Use when: optimize this React code, review my component, refactor hooks, improve performance, React best practices, component design patterns, custom hooks, memoization, TypeScript prop typing, state management, form handling, React testing, React anti-patterns, useCallback useMemo useRef, compound components, code splitting."
argument-hint: "Describe the component or issue to review/optimize"
---

# React Expert Developer

Expert-level React guidance scoped to this project: TypeScript, Tailwind CSS, Base UI + shadcn/ui via `@vendure/dashboard`.

## When to Use

- Reviewing or optimizing existing TSX components
- Designing component structure and composition patterns
- Debugging hook dependency issues or stale closures
- Improving render performance
- Strengthening TypeScript prop and event typing
- Structuring complex state or reducers
- Building accessible, validated forms
- Writing RTL tests for dashboard components

---

## 0. ESLint Integration

### Running ESLint

This project uses ESLint with TypeScript and React plugin support. Run linting with:

```bash
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix issues
```

### ESLint Rules for This Project

**Enforced rules:**
- `@typescript-eslint/no-explicit-any` — **Error**: Catches unsafe type bypasses; refactor to proper types
- `react-hooks/rules-of-hooks` — **Error**: Ensures hooks are used correctly (not in loops, conditionals)
- `@typescript-eslint/no-unused-vars` — **Error**: Flags unused variables; use `_` prefix to ignore
- `react-hooks/exhaustive-deps` — **Warning**: Validates useEffect/useCallback/useMemo dependencies

**Other configured rules:**
- `react/react-in-jsx-scope` — **Off**: Not needed with modern React
- `react/prop-types` — **Off**: Using TypeScript instead

### ESLint in the Review Workflow

When optimizing or reviewing code:

1. **Run linting first** to catch type, hook, and async safety issues automatically
2. **Fix errors** (`any` types, floating promises, hook violations)
3. **Address warnings** (return types, deps arrays)
4. **Then apply manual review** from §8 (Review Checklist) for design, performance, and correctness

Example workflow:
```bash
npm run lint:fix      # Auto-fix formatting and simple issues
git diff              # Review what was changed
npm run lint          # Verify no more errors
```

---

## 1. Component Design Patterns

### Composition over configuration

Prefer small, focused components composed together over a single heavily-propped component.

```tsx
// Prefer
<Card>
  <Card.Header><Card.Title>Orders</Card.Title></Card.Header>
  <Card.Content><OrderTable /></Card.Content>
</Card>

// Avoid: 50-prop god components
<Card title="Orders" showHeader showBorder contentSlot={<OrderTable />} ... />
```

### Compound components

Use `React.createContext` + dot-notation export for related sub-components that share implicit state.

### Render props / slots

Use children-as-function or explicit slot props (`renderEmpty`, `renderHeader`) when the parent needs to delegate rendering without coupling.

### Uncontrolled → Controlled pattern

Default to uncontrolled (local state). Lift to controlled only when the parent genuinely needs to own state.

---

## 2. Hooks

### Custom hook checklist

- [ ] Name starts with `use`
- [ ] Returns a stable object (avoid re-creating on every render)
- [ ] Cleanup inside `useEffect` (subscriptions, timers, abort controllers)
- [ ] No side effects at hook body top level — only inside `useEffect`
- [ ] Deps array is complete — run `eslint-plugin-react-hooks`

### useCallback / useMemo

Only add when profiling confirms an actual perf problem, or when the value is a stable dep of another hook/child memo.

```tsx
// Only memoize when the callback is a dep of useEffect or passed to React.memo child
const handleAdd = useCallback(
  (id: string) => {
    addItem(id);
  },
  [addItem],
);
```

### useRef

- DOM refs: `useRef<HTMLDivElement>(null)`
- Mutable values that must NOT trigger re-renders (timers, abort controllers, previous values)
- Never read a ref during render — only in effects and event handlers

### Derived state

Compute inside the render; do **not** sync to state via `useEffect`.

```tsx
// Good — computed, not synced
const totalPrice = useMemo(
  () => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
  [lines],
);
```

---

## 3. Performance

### Profiling first

Use React DevTools Profiler to identify expensive renders before adding `memo`, `useCallback`, `useMemo`.

### React.memo

Wrap only leaf components that receive stable props and re-render frequently (e.g., rows in large lists).

```tsx
export const ProductRow = React.memo(function ProductRow({ product }: Props) {
  ...
});
```

### Code splitting

Use `React.lazy` + `Suspense` for route-level or heavy modal/panel components.

```tsx
const HeavyReport = React.lazy(() => import("./consignment-report"));
```

### List virtualization

For lists > 100 rows, use a virtual list (e.g., `@tanstack/react-virtual`).

### Avoid anonymous objects/arrays as props

```tsx
// Bad — new object every render, breaks memo
<Chart options={{ color: "red" }} />;

// Good
const chartOptions = useMemo(() => ({ color: "red" }), []);
<Chart options={chartOptions} />;
```

---

## 4. TypeScript + React

### Strict prop types

```tsx
interface OrderLineProps {
  lineId: string;
  quantity: number;
  unitPrice: number;
  currencyCode: string;
  onAdjust: (lineId: string, qty: number) => void;
}
```

- Use `string` not `String`; `number` not `Number`
- Prefer discriminated unions over optional boolean flags:
  ```tsx
  // Instead of: loading?: boolean; error?: string; data?: T
  type AsyncState<T> =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: T };
  ```
- Event types: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`, `React.MouseEvent<HTMLButtonElement>`
- Callback return types: always explicit, avoid implicit `void | Promise<void>` ambiguity

### Generic components

```tsx
function Select<T extends { id: string; label: string }>({
  options,
  onChange,
}: {
  options: T[];
  onChange: (value: T) => void;
}) { ... }
```

### Forwarding refs

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => <input ref={ref} {...props} />,
);
```

---

## 5. State Management

### State co-location rule

Keep state as close to where it's used as possible. Lift only when sibling components share it.

### useReducer for complex state

Use `useReducer` when:

- Next state depends on multiple sub-fields of current state
- State transitions have names (actions) that clarify intent
- There are 3+ related `useState` calls

```tsx
type Action =
  | { type: 'ADD_LINE'; variantId: string }
  | { type: 'REMOVE_LINE'; lineId: string }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: Action): CartState { ... }
```

### Context

- Do NOT put everything in a single context — split by concern (UI state vs. data)
- Memoize context value with `useMemo` to prevent all consumers re-rendering

### Avoid derived-state-in-state

Never copy props or computed values into state. Compute on render or memoize.

---

## 6. Forms

### Controlled inputs

Every form input should have a `value` + `onChange` pair. Never mix controlled and uncontrolled.

### Validation strategy

- Validate on blur for UX; validate on submit for submission
- Surface field errors adjacent to the field, not only in a top-level banner

### Accessible forms

```tsx
<label htmlFor="qty-input">Quantity</label>
<input id="qty-input" aria-describedby="qty-error" ... />
{error && <p id="qty-error" role="alert">{error}</p>}
```

### Form libraries

For complex multi-step or heavily validated forms, prefer `react-hook-form` (already common in Vendure dashboard context).

---

## 7. Testing (RTL)

### Test user behavior, not implementation

```tsx
// Good
const button = screen.getByRole("button", { name: /add to cart/i });
await userEvent.click(button);
expect(screen.getByText(/1 item/i)).toBeInTheDocument();

// Bad — tests implementation detail
expect(component.state.cartCount).toBe(1);
```

### Query priority (RTL best practice)

1. `getByRole` — most accessible, preferred
2. `getByLabelText` — for form fields
3. `getByText` — for visible text
4. `getByTestId` — last resort

### Async patterns

```tsx
await waitFor(() => {
  expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
});
```

### Mocking `@vendure/dashboard` contexts

Dashboard components depend on `useLocalFormat`, `useChannel`, `useNavigate`, and `api`. Mock them at the module level:

```tsx
// test/setup/vendure-mocks.ts
import { vi } from 'vitest';

// Mock the entire dashboard module
vi.mock('@vendure/dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vendure/dashboard')>();
  return {
    ...actual,
    useLocalFormat: () => ({
      formatCurrency: (amount: number, currency: string) =>
        `${currency} ${(amount / 100).toFixed(2)}`,
      formatDate: (date: string) => date,
    }),
    useChannel: () => ({
      activeChannel: { id: '1', defaultCurrencyCode: 'USD' },
    }),
    useNavigate: () => vi.fn(),
    api: {
      query: vi.fn(),
      mutate: vi.fn(),
    },
  };
});
```

In each test, configure `api.query` per scenario:

```tsx
import { api } from '@vendure/dashboard';

beforeEach(() => {
  vi.mocked(api.query).mockResolvedValue({
    consignmentQuotations: [
      { id: '1', productVariantName: 'Widget', consignmentPrice: 2500, currency: 'USD' },
    ],
  });
});

it('renders quotation rows', async () => {
  render(<QuotationListPage storeId="store-1" />);
  expect(await screen.findByText('Widget')).toBeInTheDocument();
});
```

### What to test

- [ ] Happy path renders correct output
- [ ] Error/empty states render fallback UI
- [ ] User interactions trigger correct callbacks
- [ ] Async data loading shows loading → success/error transition
- [ ] Currency displayed via `formatCurrency`, not raw integer
- [ ] `api.query` called with correct variables

---

## Review Checklist

When reviewing a React component, check in this order:

### Pre-Flight (ESLint)
0. **Run ESLint** — `npm run lint` to catch type, hook, and async safety issues automatically. Fix all errors and address warnings before proceeding to manual review.

### General
1. **Correctness** — Does it handle loading, error, and empty states?
2. **Type safety** — Are all props, events, and async results explicitly typed?
3. **Hook rules** — No conditional hooks; complete deps arrays; cleanups present
4. **Re-render safety** — Are callbacks/objects stable where needed?
5. **Accessibility** — Labels, roles, ARIA attributes, keyboard nav
6. **Readability** — Is the component doing one thing? Can it be split?
7. **Tests** — Is behavior covered?

### Vendure Dashboard-Specific
8. **Currency precision** — Never do `price / 100` inline; use `formatCurrency` from `useLocalFormat()`. Never display raw minor-unit integers as-is.
9. **Channel scope** — Components that display channel-sensitive data (prices, currency codes, tax) should read `currencyCode` from the active order or channel (`useChannel()`), not hardcode `'USD'`.
10. **`api.query` cleanup** — Any `useEffect` that calls `api.query()` should guard against stale results with an `active` flag (see pattern in §8 below). Forgetting this causes state updates on unmounted components.
11. **GraphQL types** — Are results typed with `ResultOf<typeof QUERY>` rather than hand-rolled interfaces?
12. **Route loader vs component fetch** — Data needed for breadcrumbs or route guards belongs in the route `loader` function; data needed only for rendering belongs in the component via `useEffect` + `api.query()`.
13. **`ID` type** — All entity IDs should use Vendure's `ID` type (from `@vendure/core`), not bare `string` or `number`.

---

---

## 8. Vendure Dashboard Data Patterns

### Component-level fetch: `useEffect` + `api.query`

This project's standard pattern for loading data inside a component:

```tsx
import { api, ResultOf } from '@vendure/dashboard';
import { useEffect, useState } from 'react';
import { graphql } from '@/gql';

const LIST_ITEMS = graphql(`
  query MyList($storeId: ID!) {
    myItems(storeId: $storeId) { id name }
  }
`);

function MyListPage({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<
    ResultOf<typeof LIST_ITEMS>['myItems']
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) { setRows([]); return; }
    let active = true;           // ← prevents stale update on unmount
    setLoading(true);
    void api
      .query(LIST_ITEMS, { storeId })
      .then((result) => {
        if (!active) return;
        setRows(result?.myItems ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [storeId]);

  // ...
}
```

**Key rules:**
- Always guard with `let active = true` / `return () => { active = false; }` to avoid state updates on unmounted components.
- Return early when the required ID is missing (guard at the top of the effect).
- Use `ResultOf<typeof QUERY>` for the state type — never redeclare the shape.

### Route-level loader

Use the `loader` function in `defineDashboardExtension` routes **only** for data that is needed before the component renders (breadcrumbs, access checks, IDs resolved from the URL):

```tsx
// In dashboard/index.tsx
{
  path: '/my-plugin/items/$id',
  component: (route) => <ItemDetailPage route={route} />,
  loader: async ({ params, location }) => {
    // Pre-fetch only what's needed for routing/breadcrumbs
    const item = await api.query(ITEM_BY_ID, { id: params.id });
    const parentId = item?.myItem?.parentId ?? '';
    return {
      breadcrumb: [
        { label: 'Items', path: `/my-plugin/items?parentId=${parentId}` },
        { label: item?.myItem?.name ?? params.id, path: '' },
      ],
    };
  },
}
```

The loader return value is available in the component via `route.loaderData`.

### Mutation pattern

```tsx
async function handleSave() {
  setSaving(true);
  try {
    const result = await api.mutate(CREATE_ITEM, { input: { ... } });
    if (result?.createMyItem?.id) {
      toast.success('Saved');
      navigate({ to: '/my-plugin/items' });
    }
  } catch (e) {
    toast.error(getApiErrorMessage(e));
  } finally {
    setSaving(false);
  }
}
```

---

## This Project's Conventions

- UI primitives from `@vendure/dashboard` (Base UI + shadcn fork)
- Styling via Tailwind CSS v4 (use `@apply` sparingly; prefer utility classes inline)
- GraphQL types from `src/gql/graphql.ts` — reuse generated types, do not re-declare
- Vendure `ID` type for all entity IDs
- Currency formatting via `useLocalFormat()` from `@vendure/dashboard`
- Navigation via `useNavigate()` from `@vendure/dashboard`
