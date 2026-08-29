# FinanceFlow AI — Full-Stack Agentic Financial Operations Platform
## Master Architecture, Data Flow & System Specification Document

**System Version:** 1.0.0 (Production Release)  
**Target Platform:** B2B Commercial Lending & Autonomous Financial Operations  
**Frontend Framework:** React 18 + Vite  
**Backend Framework:** Node.js + Express (ESM)  
**Database:** MySQL 8.0 Cloud Database (`mysql2/promise` Parameterized Prepared SQL Queries)  
**AI Infrastructure:** Groq Llama-3.3 70B & Qwen 2.5 32B Multi-Agent Engine  
**Real-Time Layer:** Socket.IO Bi-Directional WebSockets  

---

## 1. Executive Summary & System Purpose

FinanceFlow AI is an autonomous, full-stack financial operations application designed to eliminate human latency and error in commercial lending, B2B payment reconciliation, credit risk evaluation, recovery collections, and portfolio monitoring. 

Traditional financial institutions suffer from massive operational backlogs due to manual bank statement matching, delayed credit assessments, and missed SLA recovery deadlines. FinanceFlow AI solves this by integrating:
- **6 Specialized Operational AI Agents** powered by Groq Llama-3.3 70B.
- **Zero-Token Pre-Check Validation Engine** (`preCheckEngine.js`) for instant < 10ms matching.
- **Interactive AI Financial Copilot** with 23 function-calling database tools.
- **Human-in-the-Loop Settlement Engine** for 1-click ledger allocations with immutable compliance audit logging.

---

## 2. System Architecture & End-to-End Data Flow

### 2.1 High-Level Full-Stack Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                           REACT 18 + VITE FRONTEND APPLICATION                            │
│  [ Dashboard ] [ Payment Ingestion ] [ Agent Control Center ] [ Borrower Companies ]      │
│  [ Loan Facilities ] [ Documents ] [ Escalations ] [ Reports ] [ Copilot Assistant Drawer ] │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ HTTP Credentials (JWT Cookie / Bearer Header)
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS API & SECURITY MIDDLEWARE LAYER                          │
│  • authenticate Middleware (JWT verification via tokenHelper.js)                         │
│  • authorize([...roles]) RBAC Middleware (7 Security Roles Enforcement)                   │
│  • 15 Express Routers (/api/auth, /api/payments, /api/reconciliations, etc.)              │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Validated Request Object (req.user, req.body)
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                      CONTROLLERS, SERVICES & AI AGENT ENGINE LAYER                        │
│  • 17 Express Controllers (HTTP Request Parsing & Standardized API Responses)             │
│  • 11 Service Modules (Business Logic, EMI Amortization, Ledger Allocations)               │
│  • Pre-Check Engine (Deterministic Hard Check & Scoring: Dup check, Bank match)           │
│  • 6 Operational AI Agents (Reconciliation, Risk, Collection, Doc, Portfolio, Escalation) │
│  • AI Copilot Engine (Groq Llama-3.3 70B Function Calling over 23 Database Tools)         │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────┐
│      MYSQL 8.0 CLOUD DATABASE (InnoDB)       │ │     SOCKET.IO REAL-TIME WEBSOCKETS       │
│  18 Tables with FK Constraints & Indexes     │ │  Bi-Directional Event Emission           │
│  (payments, schedules, allocations, audit)   │ │  (PAYMENT_INGESTED, RECONCILIATION_DONE) │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────┘
```

### 2.2 Payment Reconciliation Lifecycle Data Flow
1. **Ingestion**: Bank deposit arrives via `POST /api/payments/ingest`. Payment record saved (`unmatched`) and reconciliation case opened.
2. **Pre-Check Engine**: Checks duplicates, bank account match, and EMI schedule match. If Score $\ge 85\%$, generates instant `CLEAR_MATCH` (<10ms, 0 tokens).
3. **Groq Agent 1 Fallback**: If Score $< 85\%$, Groq Agent 1 executes tool-calling loop over candidate loan schedules.
4. **Human Approval**: Senior Accountant clicks **Approve & Allocate**. Settlement Service writes allocation to `payment_allocations`, updates schedule `paid_amount` to `paid`, and logs an audit record in `audit_logs`.
5. **WebSocket Broadcast**: Socket.IO emits `PAYMENT_INGESTED` and `RECONCILIATION_COMPLETED` to refresh UI live.

---

## 3. Complete Feature Implementation Matrix

| Feature Category | Implemented Capabilities | Backend & Agent Components | Frontend UI Integration |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | Bcrypt hashing, JWT HTTP-only cookies, 7-tier role security, invitation tokens | `auth.service.js`, `tokenHelper.js`, `rbac.middleware.js` | `Login.jsx`, `AuthContext.jsx`, `GlobalToastContainer` |
| **Payment Ingestion** | Manual payment entry, mock bank deposit simulation, duplicate detection | `payment.service.js`, `preCheckEngine.js` | `PaymentIngestion.jsx`, `ActionCenterDrawer.jsx` |
| **AI Reconciliation (Agent 1)** | Fuzzy reference matching, confidence scoring, 1-click human settlement approval | `reconciliationAgent.js`, `settlement.service.js` | `ActionCenterDrawer.jsx`, `StatusBadge.jsx` |
| **Credit Risk Assessment (Agent 2)** | Default Probability (PD %) computation, 4-tier risk grading (`LOW` to `CRITICAL`) | `riskAgent.js`, `riskTools.js` | `CompanyList.jsx`, `RiskAssessmentDrawer.jsx` |
| **Collection Strategy (Agent 3)** | Sec 138 NI Act notice drafting, automated SMTP email recovery dispatch | `collectionAgent.js`, `emailService.js` | `CompanyList.jsx`, `CollectionReminderModal.jsx` |
| **Document Intelligence (Agent 4)** | PDF loan contract OCR term extraction, facility amount & penalty rate parsing | `documentAgent.js`, `document.prompt.js` | `DocumentList.jsx` |
| **Portfolio Intelligence (Agent 5)** | Macroeconomic exposure analysis, risk distribution, executive summary narrative | `portfolioAgent.js`, `portfolio.service.js` | `ReportsAnalytics.jsx` |
| **Escalation Center (Agent 6)** | SLA breach scanning (>30/60/90 days), multi-tier manager notification routing | `notificationAgent.js`, `notification.controller.js` | `Notifications.jsx` |
| **AI Financial Copilot** | Interactive chat drawer, 23 database tools, human-in-the-loop action proposals | `assistantAgent.js`, `assistantTools.js`, `assistantAction.service.js` | `AICopilotPanel.jsx`, `ActionProposalCard.jsx` |
| **System Telemetry & Settings** | Groq AI token usage analytics, live LLM model switcher (Llama 70B vs Qwen 32B) | `settings.service.js`, `settings.controller.js` | `Settings.jsx` |
| **Compliance Audit Trail** | Immutable logging of WHO, WHAT, WHEN, IP address, before/after JSON diffs | `auditLog.model.js`, `audit.controller.js` | `AuditLogs.jsx` |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Role Name | Hierarchy Tier | Allowed Operations | Restricted Operations |
| :--- | :--- | :--- | :--- |
| **`owner`** | Tier 1 (System Owner) | Full Administrative Access, LLM Model Switcher, Token Telemetry, Global Settings | None |
| **`super_admin`** | Tier 2 (Super Admin) | Full System Admin Access, User Invitations, Token Telemetry | Owner-only Root Settings |
| **`admin`** | Tier 3 (Admin) | User Invitations, Company Creation, Loan Creation, Agent Triggers | Token Telemetry & Model Switch |
| **`manager`** | Tier 4 (Manager) | Company Creation, Loan Creation, Agent Triggers, Portfolio Analysis | User Management & Telemetry |
| **`senior_accountant`** | Tier 5 (Senior Accountant) | 1-Click Settlement Approval, Manual Override, Collection Notice Dispatch | Company & Loan Creation |
| **`accountant`** | Tier 6 (Accountant) | Payment Ingestion, Agent Triggers, View Dashboard & Reports | Settlement Approval & Loan Creation |
| **`viewer`** | Tier 7 (Viewer / Auditor) | Read-Only Dashboard View, Read Documents & Reports | ALL Write Actions, Ingestion & Agent Triggers |

---

## 5. Master MySQL Database Schema (18 Tables)

1. **`roles`**: System access control roles (`owner`, `super_admin`, `admin`, `manager`, `senior_accountant`, `accountant`, `viewer`).
2. **`users`**: User identity records, bcrypt password hashes, role IDs, active status, reset tokens, last login timestamps.
3. **`companies`**: Corporate borrower master data (company name, CIN registration, GSTIN tax ID, bank account, contact).
4. **`loans`**: Credit facility contracts (loan number, principal, interest rate, total payable amount, start/end dates).
5. **`repayment_schedules`**: Monthly EMI installment breakdown (installment number, due date, scheduled amount, paid amount, status).
6. **`payments`**: Raw incoming bank deposits (transaction UTR ID, deposit amount, date, sender bank account, reference, status).
7. **`reconciliation_cases`**: AI payment investigation cases opened per un-matched deposit (assigned user, status, priority, resolution reason).
8. **`ai_recommendations`**: Groq Agent 1 candidate match records (case ID, recommended company/loan/schedule ID, confidence %, reasoning).
9. **`payment_allocations`**: Official financial ledger allocations written upon human approval (payment ID, schedule ID, allocated amount).
10. **`documents`**: Financial file repository & OCR metadata (file name, URL, storage engine, MIME type, file size, uploader ID).
11. **`audit_logs`**: Immutable compliance audit log tracking WHO, WHAT, WHEN, IP address, and before/after JSON diffs.
12. **`notifications`**: In-app user notification alerts and task queue items.
13. **`agent_runs`**: Performance telemetry for 6 AI agents (agent ID, trigger type, status, LLM model used, Groq token count, confidence %).
14. **`agent_execution_logs`**: Step-by-step tool invocation traces per agent run (tool called, input JSON, output JSON, LLM reasoning).
15. **`portfolio_snapshots`**: Agent 5 portfolio health reports (snapshot date, total principal, overdue totals, LLM narrative summary).
16. **`notification_alerts`**: Agent 6 SLA breach escalation notices (borrower ID, severity, escalation tier, overdue days, status).
17. **`user_settings`**: Key-value configuration store (`confidence_threshold`, `active_llm_model`, `notification_email`).
18. **`assistant_action_proposals`**: Human-in-the-Loop action proposals generated by AI Copilot (`FLAG_CASE`, target ID, requested params, expiry).

---

## 6. Step-by-Step Mentor Review Test Flow (Live Demo Guide)

1. **Step 1: Role Authentication & Login**: Log in as Senior Accountant (`senior_accountant@financeflow.com`). Verify JWT token cookie generation and session restoration (`GET /api/auth/me`).
2. **Step 2: Payment Ingestion & Duplicate Protection**: Navigate to Payment Ingestion page. Click **Simulate Deposit**. Verify duplicate transaction check prevents duplicate entry and emits `PAYMENT_INGESTED` via Socket.IO.
3. **Step 3: Pre-Check Engine vs. Groq Agent 1 Dispatch**: Click **Run AI Reconciliation**. If payment matches bank account & EMI amount exactly, Pre-Check Engine yields 100% confidence in < 10ms with 0 LLM tokens. Ambiguous payments invoke Groq Agent 1 tool loop.
4. **Step 4: 1-Click Human Settlement Approval**: Open Action Center drawer. Review AI match reasoning and click **Approve & Allocate**. Verify `payment_allocations` row is written, schedule `paid_amount` is updated to `paid`, and immutable audit log is created.
5. **Step 5: Borrower Credit Risk & Collection Notice**: Navigate to Borrower Companies page. Click **Assess Credit Risk** (Agent 2) to view PD % and Risk Grade. Click **Draft Collection Notice** (Agent 3) to generate legal recovery letter and send email via SMTP.
6. **Step 6: Document Terms OCR Extraction**: Navigate to Documents page. Select a contract PDF and click **Extract Financial Terms** (Agent 4). Verify parsed facility amount, penalty rates, and governing clauses.
7. **Step 7: Portfolio Analytics & SLA Breach Escalation**: Navigate to Reports & Escalations pages. Click **Generate Portfolio Snapshot** (Agent 5) and **Run Escalation Scan** (Agent 6) to detect past-due borrowers exceeding SLA limits.
8. **Step 8: AI Financial Copilot Chat & Action Proposals**: Open Copilot drawer. Type *"Flag Case #16 as critical priority"*. Verify Copilot calls `proposeFlagCase`, renders Action Proposal card, and executing action updates database with audit logging.
9. **Step 9: Telemetry, Token Usage & Compliance Trail**: Log in as Owner. Navigate to Settings to inspect Groq token consumption analytics and switch live LLM models. Navigate to Audit Logs to view full compliance trail.
