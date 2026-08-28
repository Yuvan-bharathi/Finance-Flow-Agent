# Idempotency Middleware (`idempotency.middleware.js`)

## Purpose
The `idempotency.middleware.js` module provides an automated, transparent idempotency layer for state-mutating HTTP operations (`POST`, `PUT`, `PATCH`, `DELETE`). It guarantees that duplicate API requests with the same `Idempotency-Key` return identical cached results without triggering redundant database operations or financial updates.

---

## Data Flow

```
HTTP Request (POST /api/reconciliations/approve)
Header: `Idempotency-Key: ACT-819A-B244`
   │
   ▼
idempotencyMiddleware()
   │
   ├── Compute SHA-256 Hash of Request Body
   ├── Query MySQL: `SELECT * FROM idempotency_keys WHERE idempotency_key = ?`
   │
   ├── [Case 1: Status = 'completed']
   │      ├── Check: Does body hash match stored hash?
   │      │     • YES ➔ Return cached status & JSON with `X-Cache-Lookup: HIT`
   │      │     • NO  ➔ Return 422 Unprocessable Entity (Tamper detected)
   │
   ├── [Case 2: Status = 'processing']
   │      └── Return 409 Conflict with `X-Cache-Lookup: IN_FLIGHT`
   │
   └── [Case 3: Key does not exist]
          ├── Insert `idempotency_keys` with status = 'processing'
          ├── Hook `res.json()`
          ├── Call `next()` ➔ Controller handler executes
          └── When `res.json()` is invoked:
                • Status < 400 ➔ Save body & status in MySQL, set status = 'completed'
                • Status >= 400 ➔ Release lock so client can retry
```

---

## Custom Response Headers

- `X-Cache-Lookup: HIT`: Response was served from the idempotency cache without re-executing business logic.
- `X-Cache-Lookup: MISS`: Operation was executed fresh and cached.
- `X-Cache-Lookup: IN_FLIGHT`: A parallel request is currently processing this key.
- `X-Idempotency-Key`: Confirms the idempotency key processed by the gateway.

---

## Mentor Questions

### Q1. How does the middleware prevent payload tampering when reusing keys?
The middleware computes an SHA-256 hash of `req.body` and stores it alongside the key. If an attacker or bug sends the same idempotency key with different payload arguments (e.g., changing allocation amount from ₹10,000 to ₹50,000), the middleware detects the hash mismatch and rejects the request with HTTP `422 Unprocessable Entity`.

### Q2. What happens if the controller throws an unhandled exception?
If the request fails with a status $\ge 400$ or an exception, the middleware invokes `releaseIdempotencyLock()`, removing the pending lock. This ensures temporary network or validation errors don't permanently prevent the user from resubmitting with valid data.
