# Loan Controller Documentation

## Purpose
Handles HTTP endpoints for creating loan facilities and retrieving loan details with automatically generated repayment schedule breakdowns.

## Endpoints
- `GET  /api/loans`
- `GET  /api/loans/:id`
- `POST /api/loans`

## Data Flow
```
React / Postman ➔ POST /api/loans ➔ loan.routes.js ➔ loan.controller.js ➔ loan.service.js ➔ MySQL Transaction (loans & repayment_schedules)
```

## Mentor Questions

### Q1. What happens when a loan is created?
**Answer**: `createLoanService` validates the company, calculates monthly installment amounts, and starts a MySQL ACID transaction. It inserts the `loans` record and batch-inserts all monthly installment rows into `repayment_schedules` before committing.
