# Payment Model Documentation

## Purpose
Executes MySQL queries for `payments` table.

## Functions
- `findPaymentByTransactionId()`: Strict duplicate lookup by `transaction_id`.
- `findPatternDuplicatePayments()`: Pattern lookup by `sender_name + amount + payment_date`.
- `insertPayment()`: Inserts raw payment deposit row.
- `findAllPayments()`: Fetches payment list joined with case status.
