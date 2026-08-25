# Idempotency Model (`idempotency.model.js`)

## Purpose
The `idempotency.model.js` repository interacts directly with the `idempotency_keys` table to guarantee that financial mutations (such as allocation approvals, adjustments, and AI Copilot confirmations) are recorded atomically and never executed redundantly.

---

## Data Flow

```
idempotency.middleware.js
   │
   ├── 1. findIdempotencyKey(key) ➔ Query MySQL for existing key
   │
   ├── 2. createIdempotencyLock(...) ➔ Inserts row with status='processing'
   │
   └── 3. completeIdempotencyKey(...) ➔ Updates row with status='completed' & response JSON
```

---

## Functions

### `findIdempotencyKey(key)`
- **Purpose**: Checks if an idempotency key was previously submitted and has not expired.
- **Returns**: Found record object or `null`.

### `createIdempotencyLock({ key, userId, method, path, requestHash, ttlHours })`
- **Purpose**: Establishes an atomic lock on the idempotency key before controller logic starts.

### `completeIdempotencyKey({ key, responseStatus, responseBody })`
- **Purpose**: Caches the successful HTTP response status and JSON payload for immediate playback on subsequent duplicate requests.

### `releaseIdempotencyLock(key)`
- **Purpose**: Purges or releases the in-flight lock if an unhandled 500 error or validation failure occurs, allowing the client to retry.

---

## Mentor Questions

### Q1. Why is the response body stored as JSON in the database?
Caching the response body in `idempotency_keys` allows the middleware to replay the exact response payload that was returned during the initial execution, including IDs, timestamps, and generated confirmation codes, ensuring complete transparency to the client.

### Q2. How is TTL (Time-To-Live) managed?
Keys are inserted with an expiration timestamp (`expires_at = NOW() + 24 hours`). The query ignores expired rows (`expires_at > CURRENT_TIMESTAMP`), preventing old keys from locking new requests indefinitely while allowing periodic background purging.
