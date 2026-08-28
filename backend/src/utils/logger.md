# Structured JSON Logger (`logger.js`)

## Purpose
The `logger.js` utility provides enterprise-grade structured JSON logging. Instead of unstructured `console.log()` calls, every log statement is serialized into a machine-readable JSON object enriched with timestamp, log level, service name, duration in milliseconds, and the active request `correlationId`.

---

## Data Flow

```
HTTP Request / Agent Execution / Database Event
   │
   ▼
logger.info(message, { correlationId, userId, durationMs, extra })
   │
   ▼
JSON Serialization
   │
   ▼
{
  "timestamp": "2026-08-25T15:40:12.104Z",
  "level": "INFO",
  "service": "financeflow-backend",
  "correlationId": "FF-20260825-9A821",
  "message": "AI Payment Reconciliation analysis completed successfully",
  "userId": 1,
  "durationMs": 1420,
  "caseId": 16
}
   │
   ▼
STDOUT / Centralized Log Collector (Datadog, CloudWatch, Grafana Loki)
```

---

## Functions

### `logger.info(message, meta)`
- **Purpose**: Records normal business operations and completed lifecycle steps.
- **Parameters**: `message` (string), `meta` (object with correlationId, userId, etc.).

### `logger.warn(message, meta)`
- **Purpose**: Records non-fatal warnings, rate-limiting triggers, or fallback activations.

### `logger.error(message, error, meta)`
- **Purpose**: Records exceptions, database query failures, and AI provider errors with stack traces.

### `logger.debug(message, meta)`
- **Purpose**: Detailed developer debugging statements (enabled in `development` environment).

---

## Mentor Questions

### Q1. Why is structured JSON logging preferred over plain text console logs?
Plain text logs require complex regex parsing and break easily when log formats change. Structured JSON logs are natively indexed by log aggregation tools (Elasticsearch, CloudWatch, Grafana Loki), enabling sub-second filtering by `correlationId`, `userId`, `durationMs > 1000`, or `level = 'ERROR'`.

### Q2. How does the logger handle error stack traces between environments?
In `development`, the full error stack is included in the JSON output to accelerate debugging. In `production`, stack traces can be omitted or sanitized to avoid exposing internal filesystem paths and sensitive credentials.
