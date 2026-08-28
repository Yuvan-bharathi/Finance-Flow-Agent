# Phase 4 Enterprise Database Indexes Specification

## Purpose
To maintain sub-50ms query response times under high concurrency and multi-tenant scaling, Phase 4 introduces compound B-Tree indexes targeting FinanceFlow's highest-traffic lookup and filtering patterns.

---

## Index Breakdown & Query Matching

### 1. `audit_logs(correlation_id)` (`idx_audit_correlation_id`)
- **Type**: Single-Column B-Tree Index
- **Target Query**:
  ```sql
  SELECT * FROM audit_logs WHERE correlation_id = 'FF-20260825-8F921' ORDER BY created_at ASC;
  ```
- **Why Needed**: Allows instant lookup of all distributed operations associated with a single user request or API transaction across all tables.

### 2. `payments(status, created_at)` (`idx_payments_status_created`)
- **Type**: Compound B-Tree Index (Equality + Range)
- **Target Query**:
  ```sql
  SELECT * FROM payments 
  WHERE status = 'unmatched' 
  ORDER BY created_at DESC 
  LIMIT 20 OFFSET 0;
  ```
- **Why Needed**: Eliminates filesort operations during high-frequency pagination and dashboard filtering of unmatched bank deposits.

### 3. `reconciliation_cases(status, priority, created_at)` (`idx_cases_status_priority_created`)
- **Type**: Multi-Column Composite B-Tree Index
- **Target Query**:
  ```sql
  SELECT * FROM reconciliation_cases 
  WHERE status = 'pending_review' AND priority = 'critical' 
  ORDER BY created_at DESC 
  LIMIT 25;
  ```
- **Why Needed**: Powers the Action Center AI dashboard queue, prioritizing high-risk and critical items instantly without table scans.

---

## Mentor Questions

### Q1. Why use compound indexes instead of separate single-column indexes?
In MySQL, queries with multiple WHERE clauses on separate indexes can only use one index per table access (or perform an index merge, which is slower). A composite index `(status, priority, created_at)` satisfies the equality conditions on `status` and `priority` while providing pre-sorted order for `created_at`, avoiding expensive in-memory sort passes (`Using filesort`).

### Q2. What is the Leftmost Prefix rule in compound indexes?
MySQL can use a compound index only if the query conditions match the columns from left to right. For example, `(status, priority, created_at)` can accelerate queries on:
1. `status`
2. `status` AND `priority`
3. `status` AND `priority` AND `created_at`
It cannot be used for queries filtering solely on `priority` without `status`.
