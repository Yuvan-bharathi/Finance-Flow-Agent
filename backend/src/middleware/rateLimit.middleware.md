# Middleware: In-Memory Sliding-Window Rate Limiting (`rateLimit.middleware.js`)

## Purpose
Enforces sliding-window request throttling per client IP to safeguard authentication endpoints, financial endpoints, and LLM agent triggers from abuse, brute force, and runaway loops.

---

## Architectural Tiers & Limits

| Tier Limiter | Window | Max Requests | Target Endpoints | Purpose |
|---|---|---|---|---|
| **`authRateLimiter`** | 60s | 30 | `/api/v1/auth/login`, `/api/v1/auth/refresh` | Prevents credential stuffing & password brute-force. |
| **`agentRateLimiter`** | 60s | 20 | `/api/v1/agents/pipeline/run`, `/api/v1/reconciliations/analyze-bulk` | Protects external Groq API tokens & limits costs. |
| **`apiRateLimiter`** | 60s | 120 | Standard CRUD endpoints (`/loans`, `/companies`, `/audit`) | General API abuse & infinite frontend polling guard. |

---

## HTTP Standard Headers Emitted

* `X-RateLimit-Limit`: Maximum requests allowed in current window (e.g. `20`).
* `X-RateLimit-Remaining`: Remaining request quota in current window (e.g. `14`).
* `X-RateLimit-Reset`: UNIX timestamp in seconds when the window resets.
* `Retry-After`: Seconds to wait before retrying (emitted on HTTP `429 Too Many Requests`).

---

## Single-Instance vs. Distributed Scalability Limitation

```
Current Single-Instance Architecture (Phase 6):
  Client Request ──► [ Node Server (In-Memory Map) ] ──► Allowed / 429

Distributed Multi-Instance Architecture (Phase 8 Production):
                 Load Balancer
                  │          │
                  ▼          ▼
             Server 1      Server 2
                  │          │
                  └──► Redis ◄──┘
                  (Shared Atomic Tokens)
```

> [!NOTE]
> In this Phase 6 single-instance deployment, rate counters reside in process memory. In a horizontally scaled cluster behind a load balancer (Phase 8), counters evolve to an atomic Redis token bucket (`redis-rate-limiter`) so all instances share the exact same client quota.

---

## Mentor & Technical Assessment Interview Questions

### 1. Why use different rate limits for different endpoints?
Authentication endpoints (`/auth/login`) are vulnerable to credential stuffing and need low thresholds (30/min). AI agent triggers consume external Groq LLM API quota and cost money, so they need strict limits (20/min). Standard read queries (`/loans`) can safely allow higher throughput (120/min).

### 2. What happens if a rate limit is exceeded?
The server immediately halts execution and returns HTTP status `429 Too Many Requests` with a `Retry-After` header and structured JSON body containing the active `correlation_id` without touching the database or external APIs.
