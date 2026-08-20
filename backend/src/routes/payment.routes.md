# Payment Routes Documentation

## Purpose
Defines HTTP endpoint routes under `/api/payments`.

| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| POST | `/api/payments/ingest` | Required | Admin, Manager, Accountant | Ingest raw payment & open case |
| GET | `/api/payments` | Required | All roles | List payments |
| GET | `/api/payments/:id` | Required | All roles | Get payment details by ID |
