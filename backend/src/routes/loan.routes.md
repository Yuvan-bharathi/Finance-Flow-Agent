# Loan Routes Documentation

## Purpose
Defines Express routes for loan management under `/api/loans`.

| Method | Endpoint | Auth | Allowed Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/loans` | Required | All roles | List loans |
| GET | `/api/loans/:id` | Required | All roles | Get loan details & schedule |
| POST | `/api/loans` | Required | Admin, Manager, Accountant | Create loan & schedule |

## Mentor Questions
### Q1. How is `loan.routes.js` secured?
**Answer**: By chaining `authenticate` to verify JWT cookies, and `authorize(['admin', 'manager', 'accountant'])` to enforce RBAC permissions.
