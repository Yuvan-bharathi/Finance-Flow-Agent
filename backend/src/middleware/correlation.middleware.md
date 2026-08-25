# Correlation ID Middleware (`correlation.middleware.js`)

## Purpose
The `correlation.middleware.js` middleware guarantees that every HTTP request passing through FinanceFlow AI is stamped with a unique, traceable `X-Correlation-ID`. This identifier enables developers and system operators to trace a single user interaction from the frontend UI through Express routers, controllers, business services, MySQL queries, background agents, and WebSocket events.

---

## Data Flow

```
Frontend React Client (Axios)
   │  (Generates or transmits X-Correlation-ID: FF-20260825-A8F2)
   ▼
Express Gateway (app.js)
   │
   ▼
correlationMiddleware
   │
   ├── Reads req.headers['x-correlation-id']
   ├── If missing: Generates `FF-YYYYMMDD-<hex8>` (e.g. FF-20260825-9B7C)
   ├── Attaches to `req.correlationId`
   ├── Injects `res.setHeader('X-Correlation-ID', req.correlationId)`
   │
   ▼
next()
   ├── requestLoggerMiddleware (logs correlationId)
   ├── authMiddleware (associates req.user with correlationId)
   ├── Business Controller / Service
   ├── Database Audit Log (audit_logs.correlation_id)
   └── Response sent to client with X-Correlation-ID header
```

---

## Express Arguments Explanation

- `req`: Express request object. Data source: HTTP headers. Middleware assigns `req.correlationId`.
- `res`: Express response object. Middleware sets `X-Correlation-ID` header.
- `next()`: Calls the next middleware in the Express processing stack.

---

## Mentor Questions

### Q1. Why is a Correlation ID essential in a multi-service / agentic system?
In complex platforms with multiple AI agents, background workers, and database transactions, logs quickly become interleaved. Without a correlation ID, matching an error in an AI agent run to the exact user click that triggered it is nearly impossible. With `X-Correlation-ID`, a single search query retrieves the entire execution timeline.

### Q2. What format is used for Correlation IDs in FinanceFlow?
`FF-YYYYMMDD-<randomHex8>` (e.g. `FF-20260825-3F8E12A0`). The prefix identifies FinanceFlow, the date provides temporal context, and the random hex guarantees collision resistance.
