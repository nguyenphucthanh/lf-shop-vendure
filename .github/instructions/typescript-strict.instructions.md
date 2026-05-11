---
name: typescript-strict
description: "Strict TypeScript guidance for expert code review. Use when: reviewing .ts/.tsx files, implementing features, refactoring code. Enforces zero `any`, proper type guards, error handling patterns, and architectural best practices."
applyTo: "**/*.ts,**/*.tsx"
---

# Strict TypeScript Code Review Guide

## Core Principle

**Type safety is not optional.** Strict mode is the floor, not the ceiling. Every line of code must pass scrutiny for type correctness, error safety, and domain modeling.

---

## 1. Type Safety (Non-Negotiable)

### ❌ Never Use `any`

```typescript
// FORBIDDEN
const data: any = fetchData();
const err: any = error;
const obj = JSON.parse(json) as any;
```

### ✅ Always Narrow `unknown`

```typescript
// CORRECT - Type guard
const data: unknown = fetchData();
if (typeof data === 'object' && data !== null && 'id' in data) {
  const id = (data as { id: string }).id;
}

// CORRECT - instanceof for errors
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
}

// CORRECT - Type predicate
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}
if (isUser(data)) {
  // data is User here
}
```

### ✅ Use `as const` for Literals

```typescript
// CORRECT - preserves literal type
const STATUS = { ACTIVE: "active", INACTIVE: "inactive" } as const;
type Status = (typeof STATUS)[keyof typeof STATUS]; // 'active' | 'inactive'

// NOT const assertion
const config = { timeout: 5000, retries: 3 };
// type: { timeout: number, retries: number }
```

### ✅ Constrain Generics

```typescript
// CORRECT
function findById<T extends { id: string }>(
  items: T[],
  id: string,
): T | undefined {
  return items.find((item) => item.id === id);
}

// BAD - unconstrained
function findById<T>(items: T[], id: any): T | undefined {}
```

---

## 2. Error Handling (No Ambiguity)

### ❌ Don't Ignore Errors

```typescript
// FORBIDDEN
try {
  await operation();
} catch (err) {
  // swallow
}

// FORBIDDEN - logging without re-throw
catch (err) {
  Logger.error(err);
  // silently fail, caller doesn't know
}
```

### ✅ Type-Safe Error Handling

```typescript
// CORRECT - always type guard
try {
  await operation();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  Logger.error(`Operation failed: ${message}`, context);

  // Re-throw to caller
  throw new ApplicationError('Operation failed', {
    cause: err,
    context: { operationId: 123 }
  });
}

// CORRECT - typed error classes
class ConsignmentError extends Error {
  constructor(
    message: string,
    public readonly quotationId: ID,
    public readonly code: 'INSUFFICIENT_STOCK' | 'INVALID_QUANTITY' | 'NOT_FOUND'
  ) {
    super(message);
    this.name = 'ConsignmentError';
  }
}

// Usage
if (available < requested) {
  throw new ConsignmentError(
    `Insufficient stock: requested ${requested}, available ${available}`,
    quotationId,
    'INSUFFICIENT_STOCK'
  );
}

// Caller catches typed error
catch (err: unknown) {
  if (err instanceof ConsignmentError) {
    Logger.warn(`Consignment validation failed: ${err.message}`, {
      quotationId: err.quotationId,
      code: err.code
    });
    return { success: false, code: err.code };
  }
  throw err; // re-throw unknown errors
}
```

### ✅ Use Result Types for Expected Errors

```typescript
// CORRECT - discriminated union
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function validateQuantity(
  quotationId: ID,
  requested: number,
): Promise<Result<void, ConsignmentError>> {
  const available = await getAvailableQuantity(quotationId);
  if (requested > available) {
    return {
      ok: false,
      error: new ConsignmentError(
        "Insufficient stock",
        quotationId,
        "INSUFFICIENT_STOCK",
      ),
    };
  }
  return { ok: true, value: undefined };
}

// Usage
const result = await validateQuantity(id, qty);
if (!result.ok) {
  return { success: false, error: result.error.code };
}
// result.value is guaranteed valid here
```

---

## 3. Nullable Types (Explicit Always)

### ❌ Implicit Undefined

```typescript
// BAD - unknown nullability
function getUser(id: ID) {
  const user = users.find((u) => u.id === id);
  return user;
  // Is this always defined? Unclear.
}

// BAD - Optional without reason
function sendEmail(to?: string) {
  email.send(to); // What if to is undefined?
}
```

### ✅ Explicit Nullability

```typescript
// CORRECT - return type is explicit
function getUser(id: ID): User | null {
  const user = users.find((u) => u.id === id);
  return user ?? null;
}

// Usage forces null-check
const user = getUser(id);
if (user === null) {
  throw new NotFoundError(`User ${id} not found`);
}
// user is User here

// CORRECT - default required, optional documented
function sendEmail(
  to: string, // required: email address
  cc?: string, // optional: carbon copy recipient
  bcc?: string[], // optional: blind carbon copy list
): void {
  email.send({
    to,
    cc: cc ?? undefined,
    bcc: bcc ?? [],
  });
}
```

### ✅ Safe Navigation

```typescript
// CORRECT - optional chaining + nullish coalescing
const userId = user?.id ?? null;
const email = user?.contact?.email ?? "unknown@example.com";

// CORRECT - explicit checks
if (user?.address?.city) {
  console.log(`User lives in ${user.address.city}`);
}

// BAD - chaining without null-guard
const city = user.address.city; // crashes if address is null
```

---

## 4. Object & Array Handling

### ✅ Immutability by Default

```typescript
// CORRECT - readonly arrays/objects
interface ConsignmentQuotation {
  readonly id: ID;
  readonly items: readonly ConsignmentQuotationItem[];
  readonly createdAt: Date;
}

// CORRECT - return readonly
function getQuotations(ctx: RequestContext): readonly ConsignmentQuotation[] {
  return Object.freeze([...quotations]);
}
```

### ✅ Strict Equality Checks

```typescript
// CORRECT - identity check for object equality
const sameId = quotation.id === otherId; // safe for ID strings

// CORRECT - deep comparison for complex objects
import { deepEqual } from "lodash";
const quotationUnchanged = deepEqual(oldQuotation, newQuotation);

// BAD - loose equality
if (quantity == 5) {
} // Could be '5' string!
```

### ✅ Map/Object Key Safety

```typescript
// CORRECT - use Map for dynamic keys
const quotationMap = new Map<ID, ConsignmentQuotation>();
quotationMap.set(id, quotation);
const found = quotationMap.get(id); // ConsignmentQuotation | undefined

// CORRECT - Record for fixed shape
type QuotationStatus = Record<"pending" | "approved" | "rejected", number>;
const counts: QuotationStatus = {
  pending: 5,
  approved: 3,
  rejected: 2,
};

// BAD - loose object indexing
const obj: any = {};
obj[userInput]; // What's the type?
```

---

## 5. Function Signatures (Crystal Clear)

### ✅ Explicit Parameters & Returns

```typescript
// CORRECT - every parameter typed, return type explicit
async function createIntake(
  ctx: RequestContext,
  input: CreateIntakeInput,
): Promise<ConsignmentIntake> {
  // ...implementation
}

// CORRECT - optional parameters documented
function calculateTotal(
  items: IntakeItem[],
  discountPercent?: number, // optional: percentage discount (0-100)
): number {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = (discountPercent ?? 0) / 100;
  return subtotal * (1 - discount);
}

// BAD - implicit return type
function getStatus(intake) {
  return intake.status; // What's returned?
}

// BAD - multiple overloads without clarity
function process(data) {}
function process(data, options) {}
// Unclear which overload caller is invoking
```

### ✅ Overload Signatures

```typescript
// CORRECT - explicit overloads
function find(items: ConsignmentIntake[], id: ID): ConsignmentIntake | null;
function find(
  items: ConsignmentIntake[],
  predicate: (item: ConsignmentIntake) => boolean,
): ConsignmentIntake | null;
function find(
  items: ConsignmentIntake[],
  idOrPredicate: ID | ((item: ConsignmentIntake) => boolean),
): ConsignmentIntake | null {
  if (typeof idOrPredicate === "string") {
    return items.find((item) => item.id === idOrPredicate) ?? null;
  }
  return items.find(idOrPredicate) ?? null;
}
```

---

## 6. Async/Promise Patterns

### ✅ Always Await or Handle Promise

```typescript
// CORRECT - explicitly await
const result = await operation();

// CORRECT - chain with .then() if intentional
operation().then((result) => {
  /* ... */
});

// CORRECT - fire-and-forget only when intentional
void operation().catch((err) => Logger.error(err));

// BAD - forgotten await
const result = operation(); // result is Promise, not the actual value!

// BAD - unhandled promise rejection
operation().then(/* ... */); // If this rejects, it crashes
```

### ✅ Promise Type Safety

```typescript
// CORRECT - Promise types explicit
function getUser(id: ID): Promise<User | null> {
  return Promise.resolve(users.find((u) => u.id === id) ?? null);
}

// CORRECT - Generic Promise
async function batchProcess<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
): Promise<void> {
  await Promise.all(items.map(processor));
}

// BAD - loose Promise typing
function getUser(id: ID): Promise<any> {
  // Caller doesn't know what they're getting
}
```

---

## 7. Class & Constructor Safety

### ✅ Dependency Injection Clarity

```typescript
// CORRECT - private readonly dependencies
@Injectable()
export class ConsignmentIntakeService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly stockLevelService: StockLevelService,
    private readonly logger: Logger
  ) {}
}

// CORRECT - validate dependencies in constructor
constructor(private readonly repo: Repository<Entity>) {
  if (!repo) {
    throw new Error('Repository must be provided');
  }
}

// BAD - public mutable dependencies
public connection: any; // Can be changed, type unknown
```

### ✅ Property Initialization

```typescript
// CORRECT - initialized in constructor
class Intake {
  readonly id: ID;
  readonly createdAt: Date;
  readonly items: readonly IntakeItem[];

  constructor(input: CreateIntakeInput) {
    this.id = generateId();
    this.createdAt = new Date();
    this.items = Object.freeze([...input.items]);
  }
}

// BAD - uninitialized properties
class Intake {
  id: ID; // When is this set?
  items: IntakeItem[]; // Could be undefined
}

const intake = new Intake();
console.log(intake.id); // undefined? Error?
```

---

## 8. Enum Safety

### ✅ Prefer Union Types

```typescript
// CORRECT - discriminated union (preferred)
type IntakeStatus = "pending" | "confirmed" | "cancelled";

interface Intake {
  status: IntakeStatus;
}

// CORRECT - enum for operations requiring fixed values
enum PaymentMethod {
  CASH = "cash",
  CHECK = "check",
  TRANSFER = "transfer",
}

// BAD - numeric enums (confusing)
enum Status {
  PENDING = 0,
  CONFIRMED = 1,
  CANCELLED = 2,
}
// Unclear: is 0 pending or active?

// BAD - reverse mapping
const status = Status[0]; // What's the type?
```

---

## 9. Module & Import Patterns

### ✅ Clean Imports

```typescript
// CORRECT - explicit named imports
import { ConsignmentIntake, ConsignmentIntakeItem } from "../entities";
import { Logger } from "@vendure/core";

// CORRECT - default export only when single export
import ConsignmentIntakeService from "./services";

// BAD - wildcard imports (obscures dependencies)
import * as entities from "../entities"; // What's available?

// BAD - circular dependencies
// entities -> services -> entities (circular!)
```

### ✅ Type-Only Imports (TypeScript 4.5+)

```typescript
// CORRECT - type-only imports don't affect bundle
import type { ID } from "@vendure/common/lib/shared-types";
import type { User } from "./types";

import { Logger } from "@vendure/core"; // value import
```

---

## 10. Testing & Assertions

### ✅ Type-Safe Testing

```typescript
// CORRECT - assert with type guard
function expectExists<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Value should exist");
  }
  return value;
}

const user = expectExists(getUser(id)); // user is User, not User | null

// CORRECT - discriminated union in tests
type TestResult = { ok: true; data: any } | { ok: false; error: string };

function runTest(): TestResult {
  try {
    const data = complexOperation();
    return { ok: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
```

### ✅ Assertion Helpers

```typescript
// CORRECT - typed assertion
function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new AssertionError(message ?? `Expected ${expected}, got ${actual}`);
  }
}

assertEqual(intake.status, "confirmed", "Intake should be confirmed");
```

---

## Checklist for Code Review

### Before Approval:

- [ ] Zero `any` types (search regex: `:\s*any\b`)
- [ ] All `unknown` types have type guards (`instanceof`, `typeof`, type predicates)
- [ ] Error handling: all `catch` blocks have `catch (err: unknown)` + guard
- [ ] Nullable types explicit (`| null | undefined`)
- [ ] No bare `catch` or `catch (err)` (always `catch (err: unknown)`)
- [ ] Functions have explicit return types
- [ ] Class dependencies marked `private readonly`
- [ ] No loose equality (`==`, `!=`) for non-primitives
- [ ] Promise handling: all promises either `await`ed or `.catch()`ed
- [ ] TypeScript compiles without errors (`npm run build` passes)
- [ ] ESLint passes (`npx eslint .`)
- [ ] Comments explain _why_, not _what_ (code is self-documenting)

### Red Flags:

- ❌ Type assertions (`as Type`) without justification
- ❌ Optional chaining without null-checks (`?.` followed by unsafe access)
- ❌ `JSON.stringify()` output used directly without parsing
- ❌ Untyped event handlers or callbacks
- ❌ Magic numbers or strings (use named constants)
- ❌ Commented-out code (delete or explain)
- ❌ Console.log in production code (use Logger)
- ❌ Dependencies not injected (passed as globals)

---

## References

- [TypeScript Handbook: Type Guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook: Unknown](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-unknown-type)
- [Vendure Strict Configuration](https://docs.vendure.io/current/core/getting-started/configuration)
- [NestJS Dependency Injection](https://docs.nestjs.com/providers)
