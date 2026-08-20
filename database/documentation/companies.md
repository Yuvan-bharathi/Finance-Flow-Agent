# Companies Table Documentation

## Purpose
Stores corporate borrower master records, registration/tax identifiers, bank account numbers, and primary contact details.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique company ID |
| `company_name` | VARCHAR(150) | NO | — | Registered business name |
| `registration_number` | VARCHAR(100) | YES | UNIQUE | Official company registration number |
| `tax_identifier` | VARCHAR(100) | YES | UNIQUE | Tax ID / GSTIN / PAN |
| `bank_account_number` | VARCHAR(100) | YES | — | Primary registered bank account number |
| `contact_name` | VARCHAR(100) | YES | — | Primary finance contact person |
| `contact_email` | VARCHAR(150) | YES | — | Primary contact email |
| `contact_phone` | VARCHAR(30) | YES | — | Primary contact phone |
| `address` | TEXT | YES | — | Corporate registered address |
| `status` | ENUM | NO | — | Company status (`active`, `inactive`, `blacklisted`) |
| `created_at` | TIMESTAMP | NO | — | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | — | Record update timestamp |

## Relationships
- **1 : N with `loans`**: Company can hold multiple loan facilities (`companies.id` ➔ `loans.company_id`).
- **1 : N with `documents`**: Company owns corporate compliance documents (`companies.id` ➔ `documents.company_id`).
- **Used by AI Tool `searchCompany()` and `getBankAccountDetails()`**: Used by Payment Reconciliation Agent during matching analysis.

## Used By
- Company Controller (`company.controller.js`), AI Reconciliation Agent (`reconciliationAgent.js`).

## Mentor Questions

### Q1. Why is `bank_account_number` stored on the `companies` table?
**Answer**: When raw bank payments arrive, `payments.sender_account` provides a strong matching signal. Storing `bank_account_number` on `companies` allows the AI tool `getBankAccountDetails()` to match incoming bank feeds directly against borrower records.
