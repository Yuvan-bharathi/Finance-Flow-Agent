# Company Routes Documentation

## Purpose
Defines HTTP endpoint routes for company management under `/api/companies`.

| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| GET | `/api/companies` | Required | All roles | List all companies |
| GET | `/api/companies/:id` | Required | All roles | Get company details & loan count |
| POST | `/api/companies` | Required | Admin, Manager, Accountant | Create new company |
| PUT | `/api/companies/:id` | Required | Admin, Manager, Accountant | Update company profile |

## Mentor Questions

### Q1. Can a user with role `viewer` create or update a company?
**Answer**: No. The route uses `authorize(['admin', 'manager', 'accountant'])`. Users with `viewer` role receive an HTTP 403 Forbidden error response.
