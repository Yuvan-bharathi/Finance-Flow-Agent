# Audit Logs Table Documentation

## Purpose
Immutable compliance audit log recording WHO, WHAT action, WHICH entity, BEFORE/AFTER JSON state, IP address, and timestamp.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | PK | Unique log ID |
| `user_id` | INT UNSIGNED | YES | FK | Acting user ID FK ➔ `users.id` |
| `action` | VARCHAR(100) | NO | — | Performed operation name (e.g. `APPROVE_ALLOCATION`, `OVERRIDE_RECONCILIATION`) |
| `entity_type` | VARCHAR(50) | NO | — | Target table/entity name (e.g. `payment_allocations`, `ai_recommendations`) |
| `entity_id` | BIGINT UNSIGNED | YES | — | Primary key of affected record |
| `old_values` | JSON | YES | — | JSON snapshot of data prior to modification |
| `new_values` | JSON | YES | — | JSON snapshot of data post modification |
| `ip_address` | VARCHAR(45) | YES | — | IPv4 / IPv6 address of client request |
| `created_at` | TIMESTAMP | NO | — | Audit log creation timestamp |

## Relationships
- **N : 1 with `users`**: Action performed by user (`audit_logs.user_id` ➔ `users.id`).

## Used By
- Audit Logger Middleware (`audit.middleware.js`), Audit Controller (`audit.controller.js`).

## Mentor Questions

### Q1. How does the audit trail assist during mentor review?
**Answer**: If a mentor asks "How do you know who approved an AI recommendation or manually overridden a payment mapping?", we can query `audit_logs` to show the exact User ID, Action, Affected Record ID, Old State, New State, IP address, and Timestamp.
