# Idempotency Keys Table (`idempotency_keys`)

## Purpose
The `idempotency_keys` table enforces **ACID idempotency guarantees** on mutating financial endpoints (such as AI recommendation approvals, ledger allocations, payments, and AI Copilot action confirmations). 

If a network disconnection, user double-click, or automated retry sends the same operation twice with the same `Idempotency-Key` header, the system detects the duplicate, prevents double execution against the database, and returns the original cached response with the HTTP header `X-Cache-Lookup: HIT`.

---

## Data Flow

```
Client (Browser / PWA)
   │  (POST /api/reconciliations/approve with Idempotency-Key: ACT-8F21-99)
   ▼
idempotency.middleware.js
   │
   ├── Query idempotency_keys WHERE idempotency_key = 'ACT-8F21-99'
   │
   ├── [Case 1: Already Completed]
   │      └── Return cached status (200 OK) + cached response body immediately (X-Cache-Lookup: HIT)
   │
   ├── [Case 2: In-Flight / Processing]
   │      └── Return 409 Conflict ("Concurrent request in progress for this idempotency key")
   │
   └── [Case 3: New Key]
          ├── INSERT INTO idempotency_keys (status = 'processing', expires_at = NOW() + 24h)
          ├── Execute Controller & ACID Database Ledger Transaction
          ├── UPDATE idempotency_keys SET status = 'completed', response_status = 200, response_body = JSON
          └── Return Response (X-Cache-Lookup: MISS)
```

---

## Schema Structure

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `idempotency_key` | `VARCHAR(120)` | No | Unique client-provided idempotency token (Unique Index) |
| `user_id` | `INT UNSIGNED` | Yes | ID of the authenticated user who initiated the request |
| `request_method` | `VARCHAR(10)` | No | HTTP verb (`POST`, `PUT`, `PATCH`, `DELETE`) |
| `request_path` | `VARCHAR(255)` | No | Endpoint URL path (e.g. `/api/reconciliations/approve`) |
| `request_hash` | `VARCHAR(64)` | No | SHA-256 hash of payload to detect tampering/mismatched payloads |
| `status` | `ENUM('processing','completed','failed')` | No | Current execution lifecycle lock state |
| `response_status` | `INT` | Yes | HTTP status code returned to client upon completion (e.g. `200`, `201`) |
| `response_body` | `JSON` | Yes | Cached JSON response payload returned to client |
| `created_at` | `TIMESTAMP` | No | Timestamp when the key was first registered |
| `updated_at` | `TIMESTAMP` | No | Timestamp of state transition |
| `expires_at` | `TIMESTAMP` | No | TTL expiration timestamp (default 24 hours) |

---

## Indexes

- `PRIMARY KEY (id)`
- `UNIQUE INDEX (idempotency_key)`: Guarantees race-condition safety at the database engine level.
- `INDEX idx_idempotency_lookup (idempotency_key, status)`: Fast state resolution.
- `INDEX idx_idempotency_expires (expires_at)`: Efficient automated TTL cleanup sweeps.

---

## Mentor Questions

### Q1. Why is idempotency critical in financial software?
In financial operations, network timeouts or impatient users clicking "Approve" twice can cause double allocations, double debits, or corrupted ledger balances. Idempotency guarantees that executing the same operation $N$ times produces the exact same result as executing it once.

### Q2. How does FinanceFlow handle concurrent requests with the exact same key?
When a request begins, `idempotency_keys` enters the `processing` state. If a parallel request arrives before the first completes, the system returns `409 Conflict`, preventing race conditions.

### Q3. What happens if the request payload changes while reusing the same key?
The middleware computes an SHA-256 hash of the request body (`request_hash`). If a client attempts to reuse an existing idempotency key with a different payload, the request is rejected with `422 Unprocessable Entity` (payload mismatch).
