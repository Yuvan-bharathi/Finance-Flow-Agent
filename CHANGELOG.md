# Changelog — FinanceFlow AI

## [1.6.0-Phase6] - 2026-08-25 (OpenAPI Documentation, Observability, Security Hardening & Full E2E Verification)

### Added
- **Interactive Swagger / OpenAPI 3.0.3 Documentation Suite (`swagger.config.js`)**:
  - Mounted interactive Swagger UI at `/api-docs` with custom styling and raw OpenAPI 3.0 JSON spec at `/api-docs.json`.
  - Configured security schemes: `BearerAuth` (JWT Token), `CorrelationIdHeader` (`X-Correlation-ID`), and `IdempotencyKeyHeader` (`Idempotency-Key`).
  - Added full JSDoc OpenAPI annotations across all routes (Auth, Companies, Loans, Payments, Reconciliations, Agents, Documents, Portfolio, Notifications, Audit).
- **Tiered Sliding-Window Rate Limiting (`rateLimit.middleware.js`)**:
  - `authRateLimiter`: 30 requests/min (credential stuffing guard).
  - `agentRateLimiter`: 20 requests/min (Groq token protection).
  - `apiRateLimiter`: 120 requests/min (general API protection).
  - Standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`. Emits HTTP 429 with Correlation ID.
  - Documented single-instance in-memory limitation vs. Phase 8 Redis distributed scaling.
- **Lightweight System Health & Observability Probe (`health.controller.js` & `health.routes.js`)**:
  - Mounted at `/health`, `/api/health`, `/api/v1/health`.
  - Checks MySQL ping latency, process uptime, memory RSS/Heap, and agent queue depth.
- **Production Graceful Shutdown (`server.js`)**:
  - Handled `SIGTERM` and `SIGINT` signals by stopping HTTP requests, checking active in-flight worker queue jobs, closing MySQL pool, and terminating cleanly.
- **Resilient WebSocket Gateway (`socketService.js`)**:
  - Configured with automatic exponential backoff reconnection (`reconnectionDelay: 1000ms` to `5000ms`).
- **Master Full-System Automated Integration Test Suite (`phase6_full_system.test.js`)**:
  - 100% test coverage across Health probe, Swagger JSON schema, Rate Limiting (HTTP 429), End-to-End Financial Lifecycle (Ingestion $\rightarrow$ AI Match $\rightarrow$ Human Approval $\rightarrow$ Ledger $\rightarrow$ Audit), and Multi-Agent Orchestrator Pipeline.

---

## [1.5.0-Phase5] - 2026-08-25 (Multi-Agent Orchestration & Real-Time Event Pipeline)

### Added
- **Persistent Orchestration Database Schema (`005_phase5_orchestration.sql`)**:
  - `pipeline_executions`: Macro-level workflow execution ledger (`id`, `pipeline_name`, `trigger_source`, `status`, `context_data`, `correlation_id`, `total_tokens`, `duration_ms`, `started_at`, `completed_at`).
  - `pipeline_steps`: Micro-level agent step ledger (`id`, `pipeline_id`, `step_index`, `agent_name`, `status`, `input_payload`, `output_payload`, `tokens_used`, `duration_ms`, `error_message`).
  - Schema documentation files: `pipeline_executions.md` and `pipeline_steps.md`.
- **In-Process Priority & Concurrency Queue (`agentQueue.service.js`)**:
  - 4 Priority bands (`CRITICAL` = 1, `HIGH` = 2, `MEDIUM` = 3, `LOW` = 4) ensuring urgent human tasks jump ahead of background batch scans.
  - Concurrency Limiter: Enforces maximum 5 concurrent active worker tasks to protect external Groq API rate limits.
  - Exponential Backoff Retries: 3 attempts with progressive delay ($300\text{ms} \times 2^{\text{attempt}-1}$).
- **Multi-Agent Pipeline Orchestrator Service (`orchestrator.service.js`)**:
  - Predefined multi-agent pipelines:
    1. `RECONCILIATION_AND_RISK`: **Agent 1** (Payment Reconciliation) $\rightarrow$ **Agent 2** (Risk Assessment) $\rightarrow$ **Agent 3** (Collection Follow-up).
    2. `PORTFOLIO_AND_ESCALATION`: **Agent 5** (Portfolio Analytics) $\rightarrow$ **Agent 6** (Notification & Escalation).
    3. `END_TO_END_COMPLIANCE`: Full 6-agent sequential audit pipeline.
  - Context Chaining & Failure Isolation mechanisms.
- **Real-Time WebSocket Telemetry Gateway**:
  - Emits `PIPELINE_STARTED`, `PIPELINE_STEP_STARTED`, `PIPELINE_STEP_COMPLETED`, `PIPELINE_STEP_FAILED`, and `PIPELINE_COMPLETED` events for live client synchronization.
- **Frontend Live Execution Timeline & Visualizer (`PipelineVisualizer.jsx`)**:
  - Real-time animated graph nodes with status rings, execution timers in ms, token usage metrics, and inspectable input/output JSON payload modals.
  - Enhanced `AgentControlCenter.jsx` with 1-click workflow launch buttons, live queue worker status, and historical execution records table.
- **Automated Integration Test Suite (`phase5_orchestrator.test.js`)**:
  - 100% passing tests for queue priority ordering, multi-agent pipeline state machine, REST API trigger, step inspector, and queue metrics telemetry.

---

## [1.4.0-Phase4] - 2026-08-25 (Enterprise Architecture & Resilience)

### Added
- **Distributed Correlation ID Interceptor (`correlation.middleware.js`)**:
  - Automatically generates and propagates `X-Correlation-ID` (`FF-YYYYMMDD-<uuid8>`) across HTTP headers, structured logs, DB audit records, and client responses.
- **Structured JSON Observability Logger (`logger.js` & `requestLogger.middleware.js`)**:
  - Replaces unstructured console logs with JSON log output with timestamps, log levels (`INFO`, `WARN`, `ERROR`, `DEBUG`), correlation IDs, and millisecond latency measurements.
- **Granular Permission-Based Access Control (PBAC)**:
  - Introduced `permissions.js` with fine-grained capabilities (`CASE_APPROVE`, `PAYMENT_CREATE`, `AI_ACTION_CONFIRM`, `AGENT_RUN`, `AUDIT_VIEW`, etc.).
  - Added `permission.middleware.js` providing `requirePermission()` and `requireAnyPermission()`.
- **Financial Idempotency Layer (`idempotency.middleware.js` & `idempotency.model.js`)**:
  - Protects mutating financial endpoints against duplicate network requests and double-clicks via `Idempotency-Key` tracking and SHA-256 payload tamper detection.
  - Added database migration `004_phase4_enterprise.sql` for `idempotency_keys` table.
- **Strategic Database Compound Indexes**:
  - Added compound B-Tree indexes on `audit_logs(correlation_id)`, `payments(status, created_at)`, and `reconciliation_cases(status, priority, created_at)`.
- **Standardized Pagination Utility (`paginationHelper.js`)**:
  - Implemented SQL-injection-safe pagination parser and standard response envelope `{ success: true, data: [...], pagination: { page, limit, totalRecords, totalPages, hasNext, hasPrev } }`.
- **Versioned API Gateway (`/api/v1` & `/api`)**:
  - Mounted `/api/v1` for enterprise routing while maintaining full `/api` backwards compatibility.
- **Frontend Client Resilience & Traceability**:
  - Updated `api.js` Axios instance to generate and forward `X-Correlation-ID` and provide `createIdempotentPost()` helper.
  - Enhanced `AuditLogs.jsx` with Correlation ID display, copy-to-clipboard, and server-side pagination.
- **Automated Integration Test Suite**:
  - Added `phase4_enterprise.test.js` validating correlation ID propagation, PBAC authorization guards, idempotency caching, tamper detection, and pagination.

---

## [1.0.0-Phase1] - 2026-08-18

### Added
- **Frozen 12-Table Database Architecture**:
  - `schema.sql` (MySQL DDL script with foreign key constraints, data types `DECIMAL(15,2)`, and B-Tree indexes).
  - `seed.sql` (Initial data for roles, admin/manager/accountant/viewer users, companies, active loans, repayment schedules, raw payments).
  - Comprehensive documentation files for all 12 tables under `database/documentation/` with Mentor Questions sections.
- **Node.js + Express Backend Foundation**:
  - MySQL connection pool wrapper (`db.js`) using `mysql2/promise`.
  - Environment configuration (`env.js`).
  - Standardized API response helpers (`apiResponse.js`) and JWT token helpers (`tokenHelper.js`).
  - Authentication middleware (`auth.middleware.js`) and RBAC authorization middleware (`rbac.middleware.js`).
  - Centralized Express error handler (`error.middleware.js`).
  - User model & repository (`user.model.js`).
  - Authentication service (`auth.service.js`) and controller (`auth.controller.js`).
  - Authentication routes (`auth.routes.js`) for `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
  - Express `app.js` and `server.js` entry points.
- **Root Documentation**:
  - `README.md`, `CHANGELOG.md`, `ARCHITECTURE_DECISIONS.md`, `AI_DEVELOPMENT_GUIDELINES.md`.
