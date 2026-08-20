# Documents Table Documentation

## Purpose
Stores file metadata for uploaded loan agreements, bank statements, identity proofs, and payment receipts.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique document ID |
| `company_id` | INT UNSIGNED | YES | FK | Foreign key to `companies.id` |
| `payment_id` | INT UNSIGNED | YES | FK | Foreign key to `payments.id` |
| `document_type` | ENUM | NO | — | Type (`bank_statement`, `payment_proof`, `invoice`, `loan_agreement`, `company_document`, `other`) |
| `file_name` | VARCHAR(255) | NO | — | Original file name |
| `file_url` | VARCHAR(500) | NO | — | Relative or storage URL path |
| `storage_provider` | ENUM | NO | — | Storage engine (`local`, `s3`, `gcs`) |
| `mime_type` | VARCHAR(100) | NO | — | MIME type (e.g. `application/pdf`, `image/png`) |
| `file_size` | BIGINT UNSIGNED | YES | — | File size in bytes |
| `uploaded_by` | INT UNSIGNED | NO | FK | User who uploaded file FK ➔ `users.id` |
| `approved_by` | INT UNSIGNED | YES | FK | User who reviewed/approved document FK ➔ `users.id` |
| `approved_at` | TIMESTAMP | YES | — | Approval timestamp |
| `created_at` | TIMESTAMP | NO | — | Upload timestamp |
| `updated_at` | TIMESTAMP | NO | — | Record update timestamp |

## Relationships
- **N : 1 with `companies`**: Belongs to a borrowing company (`documents.company_id` ➔ `companies.id`).
- **N : 1 with `users`**: Uploaded by user (`uploaded_by`) and approved by user (`approved_by`).

## Used By
- Document Upload Controller (`document.controller.js`), Document Intelligence Agent.

## Mentor Questions

### Q1. Why is `file_url` stored instead of saving binary file BLOBs in MySQL?
**Answer**: Storing raw binary files inside MySQL bloats database size, degrades query performance, and complicates backups. Storing file metadata in MySQL while persisting the actual files on local disk or cloud storage is industry best practice.
