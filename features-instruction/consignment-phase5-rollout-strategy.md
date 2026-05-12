# Consignment Plugin Hardening - Phase 5: Rollout Strategy

## Executive Summary

This document outlines a two-phase rollout strategy for deploying consignment plugin hardening (Phases 1–4) to production. The approach prioritizes financial safety and operational stability.

**Total Work**: Phases 1–4 completed

- Phase 1 + 2: Input validation + transactional integrity (low-risk)
- Phase 3 + 4: Payment reconciliation + settlement lifecycle (high-value)

---

## Rollout Timeline

### Rollout Phase A: Phases 1 + 2 (Week 1)

**Objective**: Establish data integrity guardrails without operational changes

**Deployment**:

1. **Code**: Deploy intake/sold/return/payment services with validation helpers and transaction wrapping
2. **Database**: No new schema changes (no migrations required)
3. **Feature Flag**: None required (purely defensive code)

**Changes**:

- ✅ Input guards reject invalid qty/price before DB writes
- ✅ All write operations atomic (all-or-nothing via transactions)
- ✅ Error messages standardized (UserInputError)
- ✅ No API-facing changes (backward compatible)

**Testing**:

- Run test suite (Phase 1 + 2 section)
- Test intake/sold/return create/update/delete with edge cases
- Verify transaction rollback on simulated failures
- Monitor error logs for validation rejections

**Rollback**: Simple code rollback (no data migration required)

**Success Criteria**:

- Zero failed transactions from data consistency
- Validation errors caught before DB writes
- Error rate < 0.1% (normal validation rate)

---

### Rollout Phase B: Phases 3 + 4 (Week 2)

**Objective**: Enforce financial controls and operational settlement lifecycle

**Deployment**:

1. **Database Migration**: Run `1777600000000-add-consignment-settlement.ts`
   - Creates `consignment_settlement` table with indexes
   - Adds status FSM columns
2. **Code**: Deploy reconciliation + settlement services
   - ConsignmentReconciliationService: payable calculation
   - ConsignmentSettlementService: state machine
   - ConsignmentPaymentService: settlement gating
3. **Operational Change**: Stores must create settlement before recording payments

**Changes**:

- ✅ Payable ceiling enforced (payments cannot exceed obligations)
- ✅ Settlement lifecycle enforced (OPEN → APPROVED → PAID → CLOSED)
- ✅ One active settlement per store (prevents overlaps)
- ✅ All payments must be in-settlement (audit/compliance)

**Pre-deployment Checklist**:

- [ ] Test database migration in staging
- [ ] Verify indexes created successfully
- [ ] Test settlement state machine transitions
- [ ] Test payment reconciliation calculations
- [ ] Train ops team on settlement workflow
- [ ] Document settlement creation procedure in runbook

**Migration Steps**:

1. Run migration in staging, validate table structure
2. Schedule production migration (low-traffic window)
3. Post-deployment: Create first settlement for each active store
4. Monitor payment rejection rate (should be ~0 for in-range payments)

**Testing**:

- Run test suite (Phase 3 + 4 sections)
- Test settlement state transitions
- Test payment validation against payable ceiling
- Test multi-store isolation (settlements don't interfere)
- Verify history entries created for all state changes

**Rollback Strategy** (if needed):

- Rollback code to Phase 1 + 2 version
- Keep `consignment_settlement` table (not required for functionality)
- Payments will skip reconciliation checks (temporary safety degradation)

**Success Criteria**:

- Settlement creation/approval/closure working without errors
- Payment reconciliation functioning (0 financial inconsistencies)
- Zero double-payments (ceiling prevents duplicates)
- Settlement report accuracy > 99.9%

---

## Phased Deployment Checklist

### Pre-Deployment (All Phases)

- [ ] **Code Review**: All services reviewed by Vendure TypeScript Expert
  - No `any` types, strict error handling, transaction safety
  - Reconciliation logic validated
- [ ] **Unit Tests Passing**: Run test suite
  - `npm run test:consignment` (or equivalent)
  - All Phase 1–4 tests green
- [ ] **Type Check**: Full project compilation
  - `npm run typecheck:plugins`
  - No TS/ESLint errors
- [ ] **Database Backup**: Staging and production backups taken
  - Backup consignment tables (intake, sold, return, payment, quotation)
  - Backup customer table (for FK validation)

### Phase A Deployment (Input Validation + Transactions)

**Staging (48 hours before prod)**:

- [ ] Deploy code to staging environment
- [ ] Run full test suite in staging
- [ ] Test intake/sold/return/payment flows
- [ ] Verify validation rejects invalid inputs
- [ ] Monitor error logs for spurious rejections

**Production (Week 1 morning)**:

- [ ] Deploy code change
- [ ] Monitor error logs for 4 hours
- [ ] Check transaction/rollback logs (should show clean transactions)
- [ ] Verify no user-facing errors
- [ ] Keep rollback plan ready (simple code swap)

**Post-Deployment (Week 1)**:

- [ ] Daily review of error logs
- [ ] Verify transaction integrity (no partial saves)
- [ ] Check that validated errors are expected (malformed inputs)

### Phase B Deployment (Reconciliation + Settlement)

**Pre-Migration Ops (Week 2 – 1 day before)**:

- [ ] Create settlement records for all active stores
  - Query: `SELECT DISTINCT storeId FROM consignment_quotation`
  - For each store: `INSERT INTO consignment_settlement (storeId, status, settlementDate, createdAt) VALUES (...)`
  - Set all to OPEN status for seamless activation
- [ ] Document settlement IDs for ops team
- [ ] Test settlement queries in staging
  - Verify indexes perform well
  - Confirm findActive() returns correct settlement

**Staging (48 hours before prod)**:

- [ ] Run migration in staging (test schema)
- [ ] Deploy Phase B code to staging
- [ ] Create test settlements
- [ ] Test reconciliation calculations
  - Verify payable = soldTotal - returnedTotal - completedPayments
  - Test payment validation against payable ceiling
- [ ] Test state transitions
  - OPEN → APPROVED
  - APPROVED → PAID
  - PAID → CLOSED
  - Verify invalid transitions rejected

**Production (Week 2 morning, low-traffic window)**:

- [ ] Run migration
  - `typeorm migration:run`
  - Verify table created with correct schema
  - Verify indexes created
- [ ] Create production settlements for all active stores
  - Run pre-prepared SQL script
  - Verify row count matches expected
- [ ] Deploy Phase B code
- [ ] Monitor logs (4 hours)
  - Check for reconciliation calculation errors
  - Verify settlement validations working
- [ ] Manual testing
  - Create payment within payable → Should succeed
  - Create payment exceeding payable → Should fail (UserInputError)
  - Create payment without active settlement → Should fail

**Post-Deployment (Week 2+)**:

- [ ] Daily monitoring
  - Payment rejection rate should be ~0% (all valid payments)
  - Settlement state transitions tracking
  - Financial reconciliation reports
- [ ] Weekly audit
  - Verify payable calculations accuracy
  - Check for orphaned settlements (shouldn't happen)
  - Settlement closure rate (should show healthy closure pattern)

---

## Rollback Plan

### Phase A Rollback (Minimal Risk)

If transaction or validation issues arise:

1. **Revert Code**: Swap to previous version
   - `git revert <commit-hash>`
   - Deploy reverted code
2. **Impact**: Validation guards removed, but data integrity still sound
   - Transactions still atomic (if issue is service-level validation)
   - No database schema changes to undo

3. **Recovery**: No schema changes required; re-deploy Phase A fix

### Phase B Rollback (Moderate Risk)

If reconciliation or settlement issues arise:

1. **Revert Code**: Swap to Phase A version
   - ConsignmentReconciliationService calls will be skipped
   - ConsignmentPaymentService will NOT require settlement
   - ConsignmentSettlementService not called
2. **Database**: Leave `consignment_settlement` table in place
   - Not required for functionality
   - Can be cleaned up later
   - Existing data preserved for audit trail
3. **Impact**: Temporary loss of reconciliation enforcement
   - Payments no longer capped by payable ceiling
   - Settlement workflow not enforced
   - Historical data still available for manual audit
4. **Recovery**:
   - Fix code issue in Phase B services
   - Re-deploy with fix
   - No migration needed (schema already exists)

### Emergency Rollback (Total)

If data corruption suspected:

1. **Stop All Consignment Writes**: Disable intake/payment mutations in GraphQL
2. **Restore Database**: Use production backup
   - Restore to point-in-time before deployment
3. **Revert Code**: To last known-good version
4. **Validation**: Run manual audit queries
   - Verify no orphaned records
   - Verify FK integrity
   - Verify transaction consistency
5. **Cautious Re-deployment**: Retry with enhanced monitoring

---

## Monitoring & Alerts

### Key Metrics to Track

**Phase A**:

- `validation_errors_total` — Should be low, expected (malformed inputs)
- `transaction_rollback_count` — Should be 0 (or only on simulated failures)
- `intake_create_duration_p99` — Should not degrade (transactions add minimal overhead)

**Phase B**:

- `payment_rejection_payable_ceil_count` — Should be 0 (all valid payments accepted)
- `settlement_active_count` — Should equal active_store_count (1 per store)
- `reconciliation_payable_calculation_duration_p99` — Should be < 100ms
- `settlement_state_transition_errors` — Should be 0 (valid transitions only)

### Alert Thresholds

| Metric                           | Threshold | Action                           |
| -------------------------------- | --------- | -------------------------------- |
| Validation error rate            | > 1%      | Review input handling            |
| Transaction rollback rate        | > 0.01%   | Investigate transaction failures |
| Payment rejection rate (Phase B) | > 0.1%    | Review payable calculations      |
| Settlement query duration (p99)  | > 500ms   | Investigate index usage          |

### Dashboards

**Phase A**:

- Error rate by service (intake/sold/return/payment)
- Transaction success rate
- Validation rule distribution

**Phase B**:

- Settlement status distribution
- Payable calculation heat map (by store)
- Payment approval flow (% within ceiling)

---

## Operational Runbooks

### Settlement Creation (Phase B+)

**Scenario**: Store needs to begin recording payments

**Steps**:

1. Verify no active settlement for store (query: `findActive(storeId)`)
2. Create settlement:
   ```sql
   INSERT INTO consignment_settlement (
     storeId, settlementDate, status, createdAt
   ) VALUES (
     <STORE_ID>, <DATE>, 'OPEN', NOW()
   );
   ```
3. Verify creation: `SELECT * FROM consignment_settlement WHERE storeId = <STORE_ID>`
4. Communicate settlement is OPEN and ready for payments

### Settlement Approval (Phase B+)

**Scenario**: Settlement period complete, approve for payment processing

**Steps**:

1. Verify settlement is OPEN
2. Approve:
   ```sql
   UPDATE consignment_settlement
   SET status = 'APPROVED', approvedAt = NOW()
   WHERE id = <SETTLEMENT_ID> AND status = 'OPEN';
   ```
3. Verify: `SELECT * FROM consignment_settlement WHERE id = <SETTLEMENT_ID>`
4. Proceed with payment recording

### Settlement Closure (Phase B+)

**Scenario**: All payments processed, close settlement

**Steps**:

1. Mark as paid:
   ```sql
   UPDATE consignment_settlement
   SET status = 'PAID', paidAt = NOW()
   WHERE id = <SETTLEMENT_ID> AND status = 'APPROVED';
   ```
2. Close:
   ```sql
   UPDATE consignment_settlement
   SET status = 'CLOSED', closedAt = NOW()
   WHERE id = <SETTLEMENT_ID> AND status = 'PAID';
   ```
3. Verify: `SELECT * FROM consignment_settlement WHERE id = <SETTLEMENT_ID>`
4. Archive or report on closed settlement

---

## Testing Strategy

### Unit Tests (Run Before Each Deployment)

```bash
npm run test:consignment
```

Covers:

- Input validation rules (Phase 1)
- Transaction atomicity (Phase 2)
- Payable calculation logic (Phase 3)
- Settlement state transitions (Phase 4)

### Integration Tests (Run in Staging)

1. **End-to-End Workflow**:
   - Create intake → sold → return
   - Verify payable calculation
   - Create settlement → approve → close
   - Verify payment constraints throughout

2. **Error Paths**:
   - Payment exceeding payable → Rejection
   - Payment without settlement → Rejection
   - Invalid state transition → Rejection

3. **Multi-Store Isolation**:
   - Store A settlement independent of Store B
   - Payable calculations isolated
   - No cross-store interference

### Load Testing (Staging, Phase B only)

1. Create 100 settlements in parallel
2. Process 1000 payments across 100 settlements
3. Verify reconciliation accuracy under load
4. Monitor query performance (p99 < 100ms)

---

## Success Metrics

**Phase A Complete When**:

- ✅ Validation test suite passes
- ✅ Transaction integrity verified (0 partial saves)
- ✅ Production error rate stable (< 0.5%)
- ✅ No user complaints about rejected valid inputs

**Phase B Complete When**:

- ✅ Settlement test suite passes
- ✅ Payable calculations accurate (> 99.9%)
- ✅ No financial inconsistencies (0 double-payments)
- ✅ Settlement state machine working (all transitions clean)
- ✅ Production reconciliation reports match manual audit

---

## Conclusion

This two-phase rollout balances risk and value:

1. **Phase A** (Week 1): Low-risk validation + transactional safety
2. **Phase B** (Week 2): High-value financial controls + settlement lifecycle

Each phase is independently testable and rollbackable. Success criteria are measurable and monitored. Ops team has clear runbooks for common tasks.

**Estimated Total Effort**:

- Deployment: 4 hours (2 hours per phase)
- Monitoring: 8 hours first week (4 hours per phase)
- Training: 2 hours ops team
- Documentation: 1 hour (this document serves as primary reference)

**Risk Level**: **LOW** (validated testing, clear rollback paths, phased approach)
