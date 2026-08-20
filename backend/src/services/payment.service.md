# Payment Service Documentation

## Purpose
Implements raw payment ingestion, duplicate detection algorithms, transaction control, and reconciliation case initialization.

## Functions

### `ingestPaymentService(paymentData, userId)`
- **Validates**: `transactionId`, `amount`, and `paymentDate` are required.
- **Duplicate Check**: Prevents duplicate insertion of `transaction_id`. Returns 409 Conflict if duplicate.
- **Pattern Check**: Scans `sender_name + amount + payment_date` to detect potential duplicate pattern; sets case priority to `high` if match found.
- **Transaction**: Inserts row into `payments` (`status = 'unmatched'`) and row into `reconciliation_cases` (`status = 'open'`).

## Mentor Questions

### Q1. Why is a `reconciliation_case` created automatically upon payment ingestion?
**Answer**: An unmatched payment represents unallocated money requiring investigation. Automatically opening a `reconciliation_case` creates a tracking container for the Payment Reconciliation AI Agent and the accountant review queue.
