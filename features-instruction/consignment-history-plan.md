# Consignment History Implementation Plan

## Overview

Add an audit/history system to track all changes to consignment objects (Quotation, Intake, Return, Sold, Payment) with support for manual notes, state snapshots, and change attribution.

**Reference**: Vendure's Order history pattern (events, timeline, state snapshots)

---

## 1. Data Model

### Entity: `ConsignmentHistoryEntry`

```typescript
// Key fields:
- id: ID (primary key)
- storeId: ID (for multi-tenancy)
- objectType: 'QUOTATION' | 'INTAKE' | 'RETURN' | 'SOLD' | 'PAYMENT'
- objectId: ID (FK to specific consignment object)
- type: HistoryEntryType (enum: CREATED, UPDATED, DELETED, NOTE, STATUS_CHANGED, STOCK_ADJUSTED)
- timestamp: DateTime
- actor: User | null (who made the change; null = system)
- changes: JSONObject | null (before/after for UPDATED; stock delta for STOCK_ADJUSTED)
- note: string | null (manual annotation)
- metadata: JSONObject | null (context: reason, source system, external ID, etc)
```

### Enum: `HistoryEntryType`

```typescript
enum HistoryEntryType {
  // Lifecycle
  CREATED = "CREATED", // Object instantiated
  UPDATED = "UPDATED", // Field changed (qty, price, dates, etc)
  DELETED = "DELETED", // Soft or hard delete
  STATUS_CHANGED = "STATUS_CHANGED", // Status/workflow change

  // Domain-specific
  STOCK_ADJUSTED = "STOCK_ADJUSTED", // Stock increased/decreased (intake/return)
  PAYMENT_RECORDED = "PAYMENT_RECORDED", // Payment added
  ALLOCATION_COMPUTED = "ALLOCATION_COMPUTED", // For sold items

  // Manual
  NOTE_ADDED = "NOTE_ADDED", // User manual note
}
```

### Related: `ConsignmentHistoryChange`

```typescript
// For UPDATED entries, capture field deltas
{
  field: 'quantity' | 'price' | 'status' | 'date',
  before: any,
  after: any,
  reason?: string // 'PRICE_ADJUSTMENT', 'PARTIAL_RETURN', etc
}
```

---

## 2. Database Migration

### Migration: `add-consignment-history`

**Tables:**

```sql
CREATE TABLE consignment_history_entry (
  id VARCHAR PRIMARY KEY,
  storeId VARCHAR NOT NULL,
  objectType VARCHAR(20) NOT NULL, -- QUOTATION, INTAKE, etc
  objectId VARCHAR NOT NULL,
  type VARCHAR(30) NOT NULL,       -- CREATED, UPDATED, NOTE_ADDED
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actorId VARCHAR,                  -- FK to User (nullable for system)
  changes LONGTEXT,                 -- JSON: [{field, before, after}]
  note TEXT,
  metadata LONGTEXT,                -- JSON: {reason, source, requestId}
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (storeId) REFERENCES store(id),
  FOREIGN KEY (actorId) REFERENCES user(id),
  INDEX idx_object (objectType, objectId),
  INDEX idx_store_timestamp (storeId, timestamp),
  INDEX idx_type (type)
);
```

---

## 3. Entity Layer

### File: `src/plugins/consignment/entities/consignment-history-entry.entity.ts`

```typescript
@Entity()
export class ConsignmentHistoryEntry {
  @PrimaryColumn()
  id: ID;

  @Column()
  storeId: ID;

  @Column("varchar", { length: 20 })
  objectType: "QUOTATION" | "INTAKE" | "RETURN" | "SOLD" | "PAYMENT";

  @Column()
  objectId: ID;

  @Column("varchar", { length: 30 })
  type: HistoryEntryType;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => User)
  actor?: User | null; // Who made the change

  @Column("simple-json", { nullable: true })
  changes?: ConsignmentHistoryChange[];

  @Column("text", { nullable: true })
  note?: string;

  @Column("simple-json", { nullable: true })
  metadata?: Record<string, any>;
}

export interface ConsignmentHistoryChange {
  field: string;
  before: any;
  after: any;
  reason?: string;
}

export enum HistoryEntryType {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
  STATUS_CHANGED = "STATUS_CHANGED",
  STOCK_ADJUSTED = "STOCK_ADJUSTED",
  PAYMENT_RECORDED = "PAYMENT_RECORDED",
  ALLOCATION_COMPUTED = "ALLOCATION_COMPUTED",
  NOTE_ADDED = "NOTE_ADDED",
}
```

---

## 4. Service Layer

### File: `src/plugins/consignment/services/consignment-history.service.ts`

**Responsibilities:**

- Record history entries
- Query history for an object
- Add manual notes
- Compute before/after diffs
- Track actor (current user)

```typescript
@Injectable()
export class ConsignmentHistoryService {
  constructor(
    private connection: TransactionalConnection,
    private sessionService: SessionService, // Get current user
    private logger: Logger,
  ) {}

  // Record a history entry
  async record(
    ctx: RequestContext,
    objectType: ConsignmentObjectType,
    objectId: ID,
    type: HistoryEntryType,
    options: {
      before?: any;
      after?: any;
      changes?: ConsignmentHistoryChange[];
      note?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ConsignmentHistoryEntry> {
    const entry = new ConsignmentHistoryEntry();
    entry.id = generateId();
    entry.storeId = ctx.session?.activeChannelId;
    entry.objectType = objectType;
    entry.objectId = objectId;
    entry.type = type;
    entry.timestamp = new Date();
    entry.actor = ctx.session?.user; // null = system
    entry.changes =
      options.changes || this.computeDiff(options.before, options.after);
    entry.note = options.note;
    entry.metadata = options.metadata;

    return this.connection
      .getRepository(ctx, ConsignmentHistoryEntry)
      .save(entry);
  }

  // Get history for an object
  async findByObject(
    ctx: RequestContext,
    objectType: ConsignmentObjectType,
    objectId: ID,
  ): Promise<ConsignmentHistoryEntry[]> {
    return this.connection.getRepository(ctx, ConsignmentHistoryEntry).find({
      where: { objectType, objectId },
      relations: ["actor"],
      order: { timestamp: "DESC" },
    });
  }

  // Add manual note
  async addNote(
    ctx: RequestContext,
    objectType: ConsignmentObjectType,
    objectId: ID,
    note: string,
  ): Promise<ConsignmentHistoryEntry> {
    return this.record(ctx, objectType, objectId, HistoryEntryType.NOTE_ADDED, {
      note,
    });
  }

  // Compute field changes (before vs after)
  private computeDiff(before?: any, after?: any): ConsignmentHistoryChange[] {
    if (!before || !after) return [];

    const changes: ConsignmentHistoryChange[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (!deepEqual(before[key], after[key])) {
        changes.push({ field: key, before: before[key], after: after[key] });
      }
    }

    return changes;
  }
}

type ConsignmentObjectType =
  | "QUOTATION"
  | "INTAKE"
  | "RETURN"
  | "SOLD"
  | "PAYMENT";
```

---

## 5. Integration with Existing Services

### Pattern: Hook History Recording into Service Methods

**Example: ConsignmentIntakeService**

```typescript
async create(ctx, input): Promise<ConsignmentIntake> {
  // ... existing logic ...
  const saved = await repo.save(intake);

  // Record history
  await this.historyService.record(
    ctx,
    'INTAKE',
    saved.id,
    HistoryEntryType.CREATED,
    {
      after: { intakeDate: input.intakeDate, items: input.items },
      metadata: { source: 'API', itemCount: input.items.length }
    }
  );

  return saved;
}

async update(ctx, input): Promise<ConsignmentIntake> {
  const old = await repo.findOne(input.id);
  // ... existing logic ...
  const updated = await repo.save(intake);

  // Record changes
  const changes = [
    { field: 'intakeDate', before: old.intakeDate, after: updated.intakeDate },
    { field: 'deliveryMethod', before: old.deliveryMethod, after: updated.deliveryMethod }
  ].filter(c => c.before !== c.after);

  if (changes.length > 0) {
    await this.historyService.record(
      ctx,
      'INTAKE',
      updated.id,
      HistoryEntryType.UPDATED,
      { changes }
    );
  }

  return updated;
}

async delete(ctx, id): Promise<boolean> {
  const intake = await repo.findOne(id);
  const deleted = await repo.remove(intake);

  await this.historyService.record(
    ctx,
    'INTAKE',
    id,
    HistoryEntryType.DELETED,
    { metadata: { reason: 'User deletion' } }
  );

  return deleted;
}
```

### Stock Adjustment Tracking

```typescript
// In ConsignmentIntakeService.create()
await this.stockLevelService.updateStockOnHandForLocation(...);

// Also record in history
await this.historyService.record(
  ctx,
  'INTAKE',
  saved.id,
  HistoryEntryType.STOCK_ADJUSTED,
  {
    metadata: {
      variantId,
      delta: -itemInput.quantity,
      reason: 'Intake created'
    }
  }
);
```

---

## 6. API Layer (GraphQL)

### Schema Changes

```graphql
# Query history for an object
query {
  consignmentHistory(objectType: INTAKE, objectId: "123") {
    id
    type
    timestamp
    actor {
      name
      email
    }
    changes {
      field
      before
      after
    }
    note
  }
}

# Add manual note
mutation {
  addConsignmentNote(
    objectType: INTAKE
    objectId: "123"
    note: "Customer called about delivery delay"
  ) {
    id
    note
  }
}
```

### Resolver Implementation

```typescript
@Query()
async consignmentHistory(
  @Args('objectType') objectType: ConsignmentObjectType,
  @Args('objectId') objectId: ID
): Promise<ConsignmentHistoryEntry[]> {
  return this.historyService.findByObject(ctx, objectType, objectId);
}

@Mutation()
async addConsignmentNote(
  @Args('objectType') objectType: ConsignmentObjectType,
  @Args('objectId') objectId: ID,
  @Args('note') note: string
): Promise<ConsignmentHistoryEntry> {
  return this.historyService.addNote(ctx, objectType, objectId, note);
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Priority: HIGH)

- [ ] Create `ConsignmentHistoryEntry` entity
- [ ] Create `ConsignmentHistoryService`
- [ ] Write migration
- [ ] Add GraphQL types & basic queries

### Phase 2: Integration (Priority: HIGH)

- [ ] Hook into `ConsignmentIntakeService` (create/update/delete)
- [ ] Hook into `ConsignmentReturnService`
- [ ] Add stock adjustment tracking
- [ ] Test state capture

### Phase 3: Extended Objects (Priority: MEDIUM)

- [ ] Hook into `ConsignmentSoldService`
- [ ] Hook into `ConsignmentPaymentService`
- [ ] Hook into `ConsignmentQuotationService`

### Phase 4: Dashboard UI (Priority: MEDIUM)

- [ ] Add history timeline component to dashboard
- [ ] Show diff visualization (before/after comparison)
- [ ] Note annotation UI

### Phase 5: Cleanup & Polish (Priority: LOW)

- [ ] Archive old history (> 2 years)
- [ ] Add history export (CSV, PDF)
- [ ] Improve performance with indexes/pagination

---

## 8. Key Design Decisions

| Decision                               | Rationale                                                           |
| -------------------------------------- | ------------------------------------------------------------------- |
| **Separate entity** vs inline audit    | Cleaner schema, supports querying history independently             |
| **Store JSON diffs** vs computed diffs | Faster reads, preserves historical data structure                   |
| **Nullable actor**                     | Allows system-generated changes (e.g., automated stock adjustments) |
| **Metadata field**                     | Flexible extensibility without schema changes                       |
| **Manual notes separate**              | Supports both automatic tracking AND user annotations               |
| **Simple-JSON storage**                | Vendure supports this, no extra service needed                      |

---

## 9. Edge Cases & Considerations

### A. Concurrent Updates

**Problem**: Two users modify intake simultaneously, both record history

**Solution**:

- Use transactional context (already in services)
- Record both entries with timestamps
- Frontend shows both in order

### B. Sensitive Data

**Problem**: Stock deltas, payment amounts logged

**Solution**:

- Don't log sensitive fields (credit card, SSN)
- Mask or omit in history for GDPR compliance
- Add access control (only store admins see full history)

### C. High-Volume Operations

**Problem**: Bulk imports could generate 10k+ history entries

**Solution**:

- Batch record operations with summary entry
- Add `batchId` to metadata for grouping
- Implement cleanup job for old history

### D. Rollback / Undo

**Problem**: User wants to revert an intake

**Solution**:

- History is read-only audit trail
- Implement separate `revert` mutation that creates a new correction entry
- Don't delete or modify history entries

---

## 10. Testing Strategy

### Unit Tests

```typescript
// consignment-history.service.spec.ts
describe("ConsignmentHistoryService", () => {
  it("should compute diffs correctly", () => {
    const before = { qty: 10, price: 100 };
    const after = { qty: 8, price: 100 };
    const diff = service.computeDiff(before, after);
    expect(diff).toContainEqual({ field: "qty", before: 10, after: 8 });
    expect(diff.length).toBe(1);
  });

  it("should record with actor context", async () => {
    const entry = await service.record(ctx, "INTAKE", "123", "CREATED", {});
    expect(entry.actor?.id).toBe(ctx.session.user.id);
  });

  it("should add notes without overwriting changes", async () => {
    const note = await service.addNote(ctx, "INTAKE", "123", "Test note");
    expect(note.type).toBe("NOTE_ADDED");
    expect(note.note).toBe("Test note");
  });
});
```

### Integration Tests

```typescript
// consignment-intake.service.integration.spec.ts
describe("ConsignmentIntakeService + History", () => {
  it("should record CREATED entry on intake creation", async () => {
    const intake = await service.create(ctx, input);
    const history = await historyService.findByObject(ctx, "INTAKE", intake.id);

    expect(history).toHaveLength(1);
    expect(history[0].type).toBe("CREATED");
  });

  it("should record UPDATED entry with diffs on update", async () => {
    const intake = await service.create(ctx, input);
    const updated = await service.update(ctx, {
      id: intake.id,
      intakeDate: newDate,
    });

    const history = await historyService.findByObject(ctx, "INTAKE", intake.id);
    const updateEntry = history.find((h) => h.type === "UPDATED");

    expect(updateEntry.changes).toContainEqual({
      field: "intakeDate",
      before: input.intakeDate,
      after: newDate,
    });
  });
});
```

---

## 11. File Structure

```
src/plugins/consignment/
├── entities/
│   └── consignment-history-entry.entity.ts        [NEW]
├── services/
│   ├── consignment-history.service.ts             [NEW]
│   ├── consignment-intake.service.ts              [MODIFY - add history hooks]
│   ├── consignment-return.service.ts              [MODIFY - add history hooks]
│   ├── consignment-sold.service.ts                [MODIFY]
│   └── consignment-payment.service.ts             [MODIFY]
├── api/
│   ├── resolvers/
│   │   └── consignment-history.resolver.ts        [NEW]
│   └── types/
│       └── consignment-history.type.ts            [NEW - GraphQL types]
├── migrations/
│   └── add-consignment-history.ts                 [NEW]
└── consignment.plugin.ts                          [MODIFY - register entity]
```

---

## 12. Success Criteria

- ✅ All CRUD operations on consignment objects are logged
- ✅ Manual notes can be added without affecting automatic history
- ✅ History is read-only (append-only audit trail)
- ✅ Actor (user) is captured for all changes
- ✅ Stock adjustments are logged with deltas
- ✅ GraphQL queries/mutations work end-to-end
- ✅ Dashboard displays history timeline
- ✅ TypeScript strict mode passes
- ✅ No performance degradation on intake/return creation
