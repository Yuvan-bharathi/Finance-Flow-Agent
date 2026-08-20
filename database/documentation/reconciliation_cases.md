# Reconciliation Cases Table Documentation

## Purpose
Acts as the investigation work item container linking an ingested unmatched payment to its active AI analysis and accountant review status.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique case ID |
| `payment_id` | INT UNSIGNED | NO | FK | Foreign key to `payments.id` |
| `assigned_to` | INT UNSIGNED | YES | FK | Foreign key to `users.id` (accountant assigned) |
| `status` | ENUM | NO | — | Case status (`open`, `ai_processing`, `pending_review`, `approved`, `rejected`, `resolved`) |
| `priority` | ENUM | NO | — | Investigation priority (`low`, `medium`, `high`, `critical`) |
| `resolution_reason` | TEXT | YES | — | Explanation string recorded upon resolution/override |
| `created_at` | TIMESTAMP | NO | — | Case opening timestamp |
| `updated_at` | TIMESTAMP | NO | — | Case update timestamp |
| `resolved_at` | TIMESTAMP | YES | — | Case resolution timestamp |

## Relationships
- **N : 1 with `payments`**: Case belongs to an ingested payment (`reconciliation_cases.payment_id` ➔ `payments.id`).
- **N : 1 with `users`**: Case is assigned to an accountant (`reconciliation_cases.assigned_to` ➔ `users.id`).
- **1 : N with `ai_recommendations`**: Case contains candidate AI evaluation matches (`reconciliation_cases.id` ➔ `ai_recommendations.reconciliation_case_id`).

## Used By
- Reconciliation Controller (`reconciliation.controller.js`), AI Agent (`reconciliationAgent.js`).

## Mentor Questions

### Q1. What is the lifecycle of a `reconciliation_case`?
**Answer**: `open` (payment ingested) ➔ `ai_processing` (agent analyzing tools) ➔ `pending_review` (AI candidate generated, waiting for human) ➔ `approved` / `rejected` / `resolved` (accountant verifies and confirms ledger allocation).
