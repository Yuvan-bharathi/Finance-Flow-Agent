# FinanceFlow AI — PWA Security & Compliance Specification

## 1. Executive Security Statement

FinanceFlow AI is an enterprise financial operations platform governing high-value commercial loans, multi-party bank deposit reconciliations, and autonomous AI-assisted operations.

**Fundamental Security Invariant:**
> The Progressive Web App (PWA) is strictly an **online-first, authenticated client interface**. Under no circumstances are financial mutations, ledger writes, AI agent executions, or AI action proposal confirmations permitted in an offline or unauthenticated state.

---

## 2. Threat Model & Architectural Mitigations

| Threat Vector | Risk Description | FinanceFlow AI Architectural Mitigation |
|---|---|---|
| **Stale Ledger Double-Allocation** | An accountant approves a payment allocation while offline, unaware that another user already settled the loan schedule. | **Strict Online Guard**: Reconciliations approvals/rejections require active online connectivity. Service worker uses `NetworkOnly` for all `/api/*` endpoints. |
| **Replay & Out-of-Order Execution** | Write requests queued during offline connectivity are sent in batch upon reconnection, executing out-of-order or with stale exchange rates. | **Zero Background Sync**: Workbox background sync is strictly disabled for financial API mutations. No writes are auto-queued. |
| **Sensitive Financial Data Caching** | Unencrypted borrower exposures, bank account numbers, or transaction UTRs stored in browser cache/IndexedDB accessible via physical device theft. | **Zero Financial Caching**: Service worker caches only safe static assets (HTML/CSS/JS/Icons/Fonts). API data is never cached in Service Worker cache storage. |
| **Autonomous AI Financial Drift** | An AI Agent or Push Notification triggers financial ledger adjustments without human review. | **Phase 3 Human-in-the-Loop Protocol**: All AI recommendations and action proposals require explicit human confirmation with RBAC enforcement and backend audit logging. |
| **Client-Side Role Tampering** | Malicious user attempts to bypass UI restrictions to approve critical loan adjustments. | **Backend RBAC Enforcement**: Backend Express middleware (`authorizeRole`) independently validates JWT tokens and permissions in MySQL on every request. |

---

## 3. Data Classification & Caching Boundaries

### 3.1 Permitted in PWA Cache (Safe Static Shell)
- Pre-compiled React/Vite JavaScript chunks (`dist/assets/*.js`)
- Application stylesheets (`dist/assets/*.css`)
- Root Application Shell (`index.html`)
- Brand SVGs and PNG icons (`favicon.svg`, `pwa-192x192.png`, etc.)
- Google Fonts webfont assets (`https://fonts.gstatic.com/*`)

### 3.2 Prohibited from PWA Cache (Strictly Network-Only)
- Borrowing company profiles and tax IDs (`/api/companies/*`)
- Loan schedules, principal exposures, and interest rates (`/api/loans/*`)
- Bank deposit records, sender accounts, and UTR hashes (`/api/payments/*`)
- Reconciliation cases, AI match reasoning, and confidence metrics (`/api/reconciliations/*`)
- Real-time agent execution outputs and token counters (`/api/agents/*`)
- System compliance logs and user audit trails (`/api/audit-logs/*`)
- AI Copilot prompt history and multi-turn chat sessions (`/api/assistant/*`)

---

## 4. Authentication, RBAC, and Audit Logging Guarantees

1. **Authentication Session**:
   - Authentication is maintained via secure HTTP-Only JWT cookies or standard Bearer authorization headers.
   - PWA respects existing session timeout policies. Session invalidation on the server immediately denies API requests on the PWA.

2. **Role-Based Access Control (RBAC)**:
   - **Accountant**: Permitted to investigate entities, view recommendations, and confirm standard reconciliations.
   - **Manager**: Permitted to perform escalations, approve high-risk overrides, and trigger batch workflows.
   - **Admin / Super Admin**: Full administrative visibility, agent configuration, and audit inspection.
   - PWA UI dynamically respects roles, but backend Express RBAC middleware acts as the authoritative gatekeeper.

3. **Audit Compliance**:
   - Every human action (Approve, Reject, Override, Flag, Escalate) executed from the PWA generates an immutable record in the `audit_logs` table containing `user_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, and timestamp.
