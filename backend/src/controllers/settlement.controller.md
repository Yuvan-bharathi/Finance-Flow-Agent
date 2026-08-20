# Settlement Controller Documentation

## Purpose
Handles HTTP endpoints for human approval (`POST /api/reconciliations/approve`), rejection (`POST /api/reconciliations/reject`), and manual override (`POST /api/reconciliations/override`).

## Endpoints
- `POST /api/reconciliations/approve`
- `POST /api/reconciliations/reject`
- `POST /api/reconciliations/override`
- `GET  /api/reconciliations/allocations`

## Mentor Questions
### Q1. Who is allowed to approve or override AI recommendations?
**Answer**: Users with `admin`, `manager`, or `accountant` roles. Users with `viewer` role receive a 403 Forbidden error response.
