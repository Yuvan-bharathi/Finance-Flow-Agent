# Payments Table Documentation

## Purpose
Stores actual incoming bank deposits decoupled from entity metadata. Serves as the primary entry table for payment ingestion.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique internal payment ID |
| `transaction_id` | VARCHAR(100) | NO | UNIQUE | External bank transaction reference (e.g. `TXN-99001122`) |
| `amount` | DECIMAL(15,2) | NO | — | Actual monetary amount received |
| `payment_date` | DATE | NO | — | Date money was deposited |
| `sender_name` | VARCHAR(150) | YES | — | Sender name provided in bank narration |
| `sender_account` | VARCHAR(100) | YES | — | Sender bank account / UPI ID |
| `reference` | VARCHAR(255) | YES | — | Bank transaction narration / reference string |
| `source` | ENUM | NO | — | Ingestion source (`api`, `manual`, `bank_import`, `excel_upload`) |
| `status` | ENUM | NO | — | Payment state (`unmatched`, `processing`, `pending`, `completed`, `rejected`, `duplicate`) |
| `created_by` | INT UNSIGNED | YES | FK | User or system actor that ingested the payment |
| `created_at` | TIMESTAMP | NO | — | Ingestion timestamp |
| `updated_at` | TIMESTAMP | NO | — | Record update timestamp |

## Relationships
- **1 : N with `reconciliation_cases`**: Payment opens a reconciliation investigation case (`payments.id` ➔ `reconciliation_cases.payment_id`).
- **1 : N with `payment_allocations`**: Payment is split into official ledger allocations (`payments.id` ➔ `payment_allocations.payment_id`).

## Used By
- Payment Ingestion Controller (`payment.controller.js`), AI Reconciliation Agent (`reconciliationAgent.js`).

## Mentor Questions

### Q1. Why does the `payments` table not store `company_id` or `loan_id` directly?
**Answer**: Bank deposits arrive without structured metadata. Storing `payments` decoupled from borrower entities allows the system to ingest raw bank feeds, run duplicate detection, open reconciliation cases, and let AI investigate before an accountant confirms the mapping.
