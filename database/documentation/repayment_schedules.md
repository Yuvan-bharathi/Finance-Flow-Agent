# Repayment Schedules Table Documentation

## Purpose
Stores the expected cash flow schedule (scheduled repayment installments, due dates, scheduled amounts, paid amounts, and status) for each loan.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique schedule ID |
| `loan_id` | INT UNSIGNED | NO | FK | Foreign key to `loans.id` |
| `installment_number` | INT UNSIGNED | NO | — | Installment sequence number (1, 2, 3...) |
| `due_date` | DATE | NO | — | Installment due date |
| `scheduled_amount` | DECIMAL(15,2) | NO | — | Expected installment payment amount |
| `paid_amount` | DECIMAL(15,2) | NO | — | Amount officially allocated to this installment (DEFAULT 0.00) |
| `status` | ENUM | NO | — | Installment status (`pending`, `partially_paid`, `paid`, `overdue`, `cancelled`) |
| `created_at` | TIMESTAMP | NO | — | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | — | Record update timestamp |

## Constraints & Indexes
- `UNIQUE KEY unique_loan_installment (loan_id, installment_number)`: Ensures no duplicate installment numbers exist for a single loan.

## Relationships
- **N : 1 with `loans`**: Repayment schedule belongs to a loan (`repayment_schedules.loan_id` ➔ `loans.id`).
- **1 : N with `payment_allocations`**: Installment accepts official financial allocations (`repayment_schedules.id` ➔ `payment_allocations.repayment_schedule_id`).
- **Referenced by `ai_recommendations`**: AI suggests candidate schedule (`ai_recommendations.recommended_schedule_id`).

## Used By
- Repayment Controller (`repayment.controller.js`), AI Agent (`reconciliationAgent.js`), Allocation Service (`allocation.service.js`).

## Mentor Questions

### Q1. How is `paid_amount` updated when a payment arrives?
**Answer**: `paid_amount` is updated **only after human approval** of an AI recommendation or manual allocation. The backend runs an ACID database transaction inserting a record into `payment_allocations` and adding the allocated amount to `repayment_schedules.paid_amount`.
