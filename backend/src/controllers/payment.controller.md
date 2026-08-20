# Payment Controller Documentation

## Purpose
Handles HTTP endpoints for raw bank payment ingestion (`POST /api/payments/ingest`) and payment queries.

## Endpoints
- `POST /api/payments/ingest` (Section 17 Compliance)
- `GET  /api/payments`
- `GET  /api/payments/:id`

## Data Flow
```
Postman Payload
     │
     ▼
POST /api/payments/ingest
     │
     ▼
payment.routes.js ➔ authMiddleware ➔ rbacMiddleware
     │
     ▼
payment.controller.js (ingestPayment)
     │
     ▼
payment.service.js (ingestPaymentService)
     ├─► findPaymentByTransactionId (Strict Duplicate Check)
     ├─► findPatternDuplicatePayments (Pattern Warning Check)
     └─► MySQL Transaction (insertPayment & insertReconciliationCase)
     │
     ▼
HTTP 201 Created Response
```

## Mentor Questions

### Q1. How does `POST /api/payments/ingest` handle duplicate bank payments?
**Answer**: `ingestPaymentService()` queries `findPaymentByTransactionId(transactionId)`. If a record exists, it stops execution and returns HTTP 409 Conflict with message `"Duplicate bank transaction detected"`, preventing double-entry errors.
