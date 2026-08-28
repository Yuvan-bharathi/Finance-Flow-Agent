# Request Logger Middleware (`requestLogger.middleware.js`)

## Purpose
The `requestLogger.middleware.js` captures runtime observability metrics for every API call made to FinanceFlow AI. By subscribing to Node.js's native `res.on('finish')` event, it accurately computes round-trip latency in milliseconds without introducing blocking overhead.

---

## Data Flow

```
Client HTTP Request
   │
   ▼
correlationMiddleware (assigns correlationId)
   │
   ▼
requestLogger (records startTime = Date.now())
   │
   ▼
Route Controller & Database Queries Execute
   │
   ▼
Response Sent (res.status(...).json(...))
   │
   ▼
res.on('finish') Triggered
   ├── durationMs = Date.now() - startTime
   ├── Evaluates statusCode:
   │     • 2xx / 3xx ➔ logger.info()
   │     • 4xx       ➔ logger.warn()
   │     • 5xx       ➔ logger.error()
   └── Emits Structured JSON Log to STDOUT
```

---

## Parameters Logged

| Parameter | Type | Purpose |
|---|---|---|
| `correlationId` | `string` | Distributed tracing identifier (`FF-YYYYMMDD-XXXX`) |
| `method` | `string` | HTTP Verb (`GET`, `POST`, `PUT`, `DELETE`) |
| `path` | `string` | Endpoint route requested |
| `statusCode` | `number` | Response HTTP status code (`200`, `401`, `403`, `500`) |
| `durationMs` | `number` | Exact request processing latency in milliseconds |
| `userId` | `number` | Authenticated user ID (if request carried valid JWT) |
| `ip` | `string` | Originating client IP address |

---

## Mentor Questions

### Q1. Why use `res.on('finish')` instead of logging at the start of the request?
Logging at the start of the request cannot capture the final HTTP status code or total execution latency. Listening to `res.on('finish')` fires asynchronously once the response payload has been transmitted over the socket, giving true end-to-end processing time.

### Q2. Does request logging slow down API throughput?
No. Because `res.on('finish')` executes after the response has been flushed to the client socket, the client receives its response immediately. Structured JSON serialization takes less than 0.1ms and runs non-blockingly on the event loop.
