# Service: `agentQueue.service.js` Documentation

---

## 1. Overview & Architectural Role

The `agentQueue.service.js` module provides an **in-process priority and concurrency queue** designed to govern the timing and worker dispatching of AI agent tasks.

### Core Capabilities:
1. **Priority Scheduling**: Enforces 4 priority bands (`CRITICAL` = 1, `HIGH` = 2, `MEDIUM` = 3, `LOW` = 4), ensuring urgent user triggers take precedence over background bulk scans.
2. **Concurrency Throttling**: Limits active simultaneous worker jobs to `MAX_CONCURRENCY = 5`, protecting the Groq LLM API against 429 rate limit exceptions.
3. **Exponential Backoff Retries**: Automatically retries transient network or LLM errors up to 3 times with exponentially increasing delays ($300ms \times 2^{\text{attempt}-1}$).
4. **Telemetry & Metrics**: Emits runtime EventEmitter events and exposes real-time queue depth and active worker telemetry.

---

## 2. Priority Hierarchy Specification

| Priority Band | Level | Intended Workload | Precedence |
|---|:---:|---|:---:|
| **`CRITICAL`** | 1 | Manual on-demand single-case analysis in Action Center / Ingestion UI | Top Priority |
| **`HIGH`** | 2 | Real-time inbound webhook bank deposit ingestion | High Priority |
| **`MEDIUM`** | 3 | Dynamic risk recalculations & collection reminder drafting | Standard Priority |
| **`LOW`** | 4 | Nightly batch scans, full compliance audits, portfolio snapshots | Background Priority |

---

## 3. Mentor Interview Questions & Answers

### Q1: What is the architectural distinction between the Queue and the Orchestrator?
**Answer**:
* **The Queue** (`agentQueue.service.js`) decides **WHEN** a job executes (governing priority order, concurrency limits, and retry backoffs).
* **The Orchestrator** (`orchestrator.service.js`) decides **WHAT** work executes (defining the dependency sequence, step conditions, and data passing between Agent 1, Agent 2, and Agent 3).

### Q2: What are the trade-offs of an in-process queue versus Redis / BullMQ?
**Answer**:
* **In-process Queue Advantages**: Zero external infrastructure dependencies, runs seamlessly on local developer laptops without requiring a Redis daemon, and near-zero memory/CPU overhead.
* **Limitations**: Waiting in-memory queue jobs do not survive server restarts/crashes, and multiple scaled Node.js replicas cannot share an in-process queue. (In Phase 8 Production/DevOps, this can evolve to Redis/BullMQ).

### Q3: How does exponential backoff protect external LLM APIs?
**Answer**: If the Groq API returns a transient 429 Too Many Requests error, executing an immediate retry would immediately fail again and worsen congestion. Exponential backoff introduces progressively larger pauses ($300ms \rightarrow 600ms \rightarrow 1200ms$), allowing the rate limit token bucket to replenish.
