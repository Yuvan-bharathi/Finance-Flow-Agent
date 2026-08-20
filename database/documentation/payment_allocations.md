# Payment Allocations Table Documentation

## Purpose
Stores official financial ledger mapping linking approved payments to specific repayment schedule installments created ONLY upon human approval.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique allocation ID |
| `payment_id` | INT UNSIGNED | NO | FK | Foreign key to `payments.id` |
| `repayment_schedule_id` | INT UNSIGNED | NO | FK | Foreign key to `repayment_schedules.id` |
| `allocated_amount` | DECIMAL(15,2) | NO | — | Monetary amount allocated to this installment |
| `approved_by` | INT UNSIGNED | NO | FK | User who approved allocation FK ➔ `users.id` |
| `allocation_type` | ENUM | NO | — | Decision origin (`ai_approved`, `manual`, `ai_overridden`, `overpayment`) |
| `created_at` | TIMESTAMP | NO | — | Allocation timestamp |

## Relationships
- **N : 1 with `payments`**: Allocation belongs to an incoming payment (`payment_allocations.payment_id` ➔ `payments.id`).
- **N : 1 with `repayment_schedules`**: Allocation settles an installment (`payment_allocations.repayment_schedule_id` ➔ `repayment_schedules.id`).
- **N : 1 with `users`**: Approved by an authorized user (`payment_allocations.approved_by` ➔ `users.id`).

## Used By
- Allocation Service (`allocation.service.js`), Reconciliation Controller (`reconciliation.controller.js`).

## Mentor Questions

### Q1. Can one payment be split across multiple repayment schedule installments?
**Answer**: Yes. For example, if a company pays ₹1,50,000, two rows can be created in `payment_allocations`: ₹1,00,000 allocated to Installment #1 and ₹50,000 allocated to Installment #2.
