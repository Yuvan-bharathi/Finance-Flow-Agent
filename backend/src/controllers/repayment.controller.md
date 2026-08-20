# Repayment Controller Documentation

## Purpose
Handles HTTP endpoints for querying scheduled repayment installments and overdue balances.

## Endpoints
- `GET /api/repayments/loan/:loanId`
- `GET /api/repayments/due`
- `GET /api/repayments/:id`

## Mentor Questions
### Q1. How does the frontend display installment schedules for a selected loan?
**Answer**: By calling `GET /api/repayments/loan/:loanId`, which joins `repayment_schedules` with loan and company details and returns installments ordered by `installment_number`.
