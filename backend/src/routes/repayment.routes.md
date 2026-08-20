# Repayment Routes Documentation

## Purpose
Defines HTTP endpoint routes under `/api/repayments`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/repayments/loan/:loanId` | Required | Get repayment schedule for a loan |
| GET | `/api/repayments/due` | Required | Get overdue & pending installments |
| GET | `/api/repayments/:id` | Required | Get installment details by ID |
