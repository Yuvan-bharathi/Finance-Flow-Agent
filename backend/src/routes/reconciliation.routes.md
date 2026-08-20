# Reconciliation Routes Documentation

## Purpose
Defines Express endpoints under `/api/reconciliations`.

| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| POST | `/api/reconciliations/analyze/:caseId` | Required | Admin, Manager, Accountant | Trigger Agent 1 analysis |
| GET | `/api/reconciliations/cases` | Required | All roles | List cases & recommendations |
| GET | `/api/reconciliations/cases/:caseId` | Required | All roles | Get case details & AI history |
