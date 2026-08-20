# Company Controller Documentation

## Purpose
Handles HTTP requests for managing corporate borrower company records, listing companies, and updating profiles.

## Endpoints
- `GET  /api/companies`
- `GET  /api/companies/:id`
- `POST /api/companies`
- `PUT  /api/companies/:id`

## Data Flow
```
React Frontend / Postman
         │
         ▼
 POST /api/companies
         │
         ▼
 company.routes.js
         │
         ▼
 authMiddleware ➔ rbacMiddleware
         │
         ▼
 company.controller.js (createCompany)
         │
         ▼
 company.service.js (createCompanyService)
         │
         ▼
 company.model.js (insertCompany)
         │
         ▼
 MySQL (companies table)
```

## Functions

### `getCompanies(req, res, next)`
- **Receives**: Query param `req.query.status` (optional).
- **Returns**: Array of companies.

### `createCompany(req, res, next)`
- **Receives**: `req.body` containing company fields.
- **Returns**: HTTP 201 Created with new company object.

## Mentor Questions

### Q1. Why is `bank_account_number` stored in the company model?
**Answer**: During payment reconciliation, the AI agent matches incoming bank naration details (`sender_account`) against registered company bank accounts to identify the correct borrower.
