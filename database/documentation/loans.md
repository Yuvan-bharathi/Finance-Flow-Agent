# Loans Table Documentation

## Purpose
Stores financial loan agreements issued to borrowing companies, principal amounts, interest rates, total payable amounts, and loan status.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique loan ID |
| `company_id` | INT UNSIGNED | NO | FK | Foreign key to `companies.id` |
| `loan_number` | VARCHAR(50) | NO | UNIQUE | Unique business loan contract reference (e.g. `LN-2026-001`) |
| `principal_amount` | DECIMAL(15,2) | NO | — | Original principal amount lent |
| `interest_rate` | DECIMAL(5,2) | NO | — | Annual interest rate percentage |
| `total_payable` | DECIMAL(15,2) | NO | — | Scheduled total repayable amount (principal + interest) |
| `start_date` | DATE | NO | — | Agreement start date |
| `end_date` | DATE | YES | — | Agreement maturity/completion date |
| `status` | ENUM | NO | — | Loan status (`active`, `completed`, `defaulted`, `cancelled`) |
| `created_at` | TIMESTAMP | NO | — | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | — | Record update timestamp |

## Relationships
- **N : 1 with `companies`**: Loan belongs to a borrowing company (`loans.company_id` ➔ `companies.id`).
- **1 : N with `repayment_schedules`**: Loan is split into recurring repayment installments (`loans.id` ➔ `repayment_schedules.loan_id`).

## Used By
- Loan Controller (`loan.controller.js`), AI Reconciliation Agent (`reconciliationAgent.js`).

## Mentor Questions

### Q1. Why use `DECIMAL(15,2)` for financial amounts instead of `FLOAT` or `DOUBLE`?
**Answer**: `FLOAT` and `DOUBLE` use binary floating-point representation, causing precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). `DECIMAL(15,2)` stores exact fixed-point decimal values, essential for accounting accuracy.
