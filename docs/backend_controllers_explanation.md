# FinanceFlow AI — Backend Controllers Architecture & Master Reference

**Location:** `backend/src/controllers/`  
**Total Controller Modules:** 17  
**Architecture Pattern:** Express Controller Pattern (HTTP Request Parsing ➔ Service / Agent Invocation ➔ Standardized API Response)  

---

## 🧭 Controller Architecture Overview

Controllers in FinanceFlow AI act as the bridge between Express HTTP Routes (`/api/...`) and the underlying Services, AI Agents, and Database Models.

### Universal Controller Responsibilities
1. **HTTP Request Parsing**: Extracts path parameters (`req.params`), query parameters (`req.query`), and JSON body (`req.body`).
2. **Context Extraction**: Pulls session metadata from `req.user` (populated by `auth.middleware.js`).
3. **Input Sanitization**: Validates required parameters, returning `400 Bad Request` if invalid.
4. **Service / Agent Invocation**: Delegates business logic to services (`services/`) or AI agents (`agents/`).
5. **Standardized Response Wrapping**: Uses `sendSuccessResponse(res, status, message, data)` or passes errors to `next(error)` for centralized handling.

---

## 📑 Detailed Breakdown of All 17 Controller Modules

---

### 1. `auth.controller.js`
*File Path*: [`backend/src/controllers/auth.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/auth.controller.js)  
*Base Route*: `/api/auth`  

#### Functions:
- **`login(req, res, next)`**: Validates user credentials, authenticates via bcrypt, signs JWT token, sets HTTP-only `token` cookie, and returns user profile.
- **`logout(req, res, next)`**: Clears HTTP-only `token` cookie and terminates session.
- **`getMe(req, res, next)`**: Retrieves profile and assigned role of current logged-in user (`req.user`).
- **`getUsers(req, res, next)`**: Retrieves list of all platform users and their assigned roles.
- **`getDemoUsers(req, res, next)`**: Lists demo user credentials across all 7 roles for rapid testing.
- **`createUser(req, res, next)`**: Invites a new team member, assigns role, and generates an email activation setup token.
- **`setPassword(req, res, next)`**: Updates user password using a valid email token link.

---

### 2. `company.controller.js`
*File Path*: [`backend/src/controllers/company.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/company.controller.js)  
*Base Route*: `/api/companies`  

#### Functions:
- **`getCompanies(req, res, next)`**: Fetches all corporate borrower profiles, loan counts, and total exposure.
- **`getCompanyById(req, res, next)`**: Fetches detailed profile of a single corporate borrower by `id`.
- **`createCompany(req, res, next)`**: Registers a new corporate borrower profile (`company_name`, registration number, tax ID, bank account).
- **`updateCompany(req, res, next)`**: Modifies existing borrower company metadata.

---

### 3. `loan.controller.js`
*File Path*: [`backend/src/controllers/loan.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/loan.controller.js)  
*Base Route*: `/api/loans`  

#### Functions:
- **`getLoans(req, res, next)`**: Fetches list of active loan contracts and status.
- **`getLoanById(req, res, next)`**: Fetches full contract details and complete repayment installment breakdown for a loan ID.
- **`createLoan(req, res, next)`**: Issues a new loan facility, calculates total interest, and generates sequential monthly EMI repayment schedules.

---

### 4. `repayment.controller.js`
*File Path*: [`backend/src/controllers/repayment.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/repayment.controller.js)  
*Base Route*: `/api/repayments`  

#### Functions:
- **`getScheduleByLoanId(req, res, next)`**: Fetches installment breakdown for a specific loan ID.
- **`getDueInstallments(req, res, next)`**: Fetches all past-due and upcoming repayment installments.
- **`getScheduleById(req, res, next)`**: Fetches details for a single installment ID.

---

### 5. `payment.controller.js`
*File Path*: [`backend/src/controllers/payment.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/payment.controller.js)  
*Base Route*: `/api/payments`  

#### Functions:
- **`ingestPayment(req, res, next)`**: Ingests raw incoming bank deposit, creates payment record, opens reconciliation case, and emits `PAYMENT_INGESTED` WebSocket event.
- **`ingestMockBankDeposit(req, res, next)`**: Simulates a live bank deposit transaction for testing.
- **`getPayments(req, res, next)`**: Fetches list of ingested bank deposits.
- **`getPaymentById(req, res, next)`**: Fetches single deposit transaction details.

---

### 6. `reconciliation.controller.js`
*File Path*: [`backend/src/controllers/reconciliation.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/reconciliation.controller.js)  
*Base Route*: `/api/reconciliations`  

#### Functions:
- **`getStats(req, res, next)`**: Computes dashboard KPI cards (reconciliation accuracy, pending cases, settled amount).
- **`getCases(req, res, next)`**: Fetches reconciliation investigation cases with status/priority filters.
- **`getCaseById(req, res, next)`**: Fetches single reconciliation case details.
- **`analyzeCase(req, res, next)`**: Triggers Agent 1 (Payment Reconciliation) fuzzy match analysis on a single case.
- **`analyzeBulk(req, res, next)`**: Triggers Agent 1 analysis on an array of case IDs.
- **`analyzeAllPending(req, res, next)`**: Triggers Agent 1 analysis on all unanalyzed pending cases.

---

### 7. `settlement.controller.js`
*File Path*: [`backend/src/controllers/settlement.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/settlement.controller.js)  
*Base Route*: `/api/reconciliations`  

#### Functions:
- **`approveRecommendation(req, res, next)`**: Human-in-the-Loop 1-Click Approval. Executes financial ledger allocation, marks installment PAID, and updates case status to `approved`.
- **`rejectRecommendation(req, res, next)`**: Rejects AI match recommendation and flags case for manual review.
- **`overrideRecommendation(req, res, next)`**: Performs manual accountant allocation override against a target schedule.
- **`getAllocations(req, res, next)`**: Fetches list of official financial ledger allocation records.

---

### 8. `risk.controller.js`
*File Path*: [`backend/src/controllers/risk.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/risk.controller.js)  
*Base Route*: `/api/risk`  

#### Functions:
- **`getRiskOverview(req, res, next)`**: Computes portfolio-wide borrower risk score distribution.
- **`assessCompanyRisk(req, res, next)`**: Triggers Agent 2 (Credit Risk Assessment), calculating Default Probability (PD %) and Risk Grade (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

---

### 9. `collection.controller.js`
*File Path*: [`backend/src/controllers/collection.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/collection.controller.js)  
*Base Route*: `/api/collections`  

#### Functions:
- **`generateCollectionReminder(req, res, next)`**: Triggers Agent 3 (Collection Strategy) to draft a tailored legal recovery notice under Section 138 NI Act.
- **`sendCollectionReminder(req, res, next)`**: Dispatches the drafted collection notice email via SMTP and records an audit log.

---

### 10. `document.controller.js`
*File Path*: [`backend/src/controllers/document.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/document.controller.js)  
*Base Route*: `/api/documents`  

#### Functions:
- **`getDocuments(req, res, next)`**: Fetches uploaded financial contracts, invoices, and bank statements.
- **`extractDocumentTerms(req, res, next)`**: Triggers Agent 4 (Document Intelligence) OCR extraction to pull financial terms and amounts from PDF/Image documents.

---

### 11. `agentControl.controller.js`
*File Path*: [`backend/src/controllers/agentControl.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/agentControl.controller.js)  
*Base Route*: `/api/agents`  

#### Functions:
- **`getAgentStatus(req, res, next)`**: Retrieves operational status, total runs, average confidence, and token count for all 6 agents.
- **`getRecentAgentActivity(req, res, next)`**: Fetches recent execution activity feed across the system.
- **`getAgentRunHistory(req, res, next)`**: Fetches run history for a specific agent ID.
- **`getRunDetail(req, res, next)`**: Fetches step-by-step tool invocation traces and LLM reasoning steps for a run ID.

---

### 12. `portfolio.controller.js`
*File Path*: [`backend/src/controllers/portfolio.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/portfolio.controller.js)  
*Base Route*: `/api/portfolio`  

#### Functions:
- **`analyzePortfolio(req, res, next)`**: Triggers Agent 5 (Portfolio Intelligence) to analyze portfolio concentration, overdue totals, and macroeconomic trends.
- **`getPortfolioSnapshots(req, res, next)`**: Fetches historical portfolio snapshot reports.
- **`getLatestSnapshot(req, res, next)`**: Fetches the most recent portfolio snapshot.

---

### 13. `notification.controller.js`
*File Path*: [`backend/src/controllers/notification.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/notification.controller.js)  
*Base Route*: `/api/notifications`  

#### Functions:
- **`triggerEscalationScan(req, res, next)`**: Triggers Agent 6 (Notification & Escalation) to scan past-due accounts and generate tiered escalation alerts.
- **`getAlerts(req, res, next)`**: Fetches escalation alerts with status and severity filters.
- **`approveAlert(req, res, next)`**: Human sign-off approving escalation notice dispatch.
- **`dismissAlert(req, res, next)`**: Dismisses escalation alert.

---

### 14. `settings.controller.js`
*File Path*: [`backend/src/controllers/settings.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/settings.controller.js)  
*Base Route*: `/api/settings`  

#### Functions:
- **`getUserSettings(req, res, next)`**: Fetches user and system configuration settings.
- **`updateUserSettings(req, res, next)`**: Saves updated configuration settings (`confidence_threshold`, `agent_1_enabled`).
- **`getAiTokenUsage(req, res, next)`**: Aggregates Groq AI token telemetry and cost analytics by agent.
- **`setActiveAiModel(req, res, next)`**: Dynamically switches the live Groq LLM model (`llama-3.3-70b-versatile` vs `qwen/qwen3.6-27b`).

---

### 15. `assistant.controller.js`
*File Path*: [`backend/src/controllers/assistant.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/assistant.controller.js)  
*Base Route*: `/api/assistant`  

#### Functions:
- **`chat(req, res, next)`**: Processes AI Financial Copilot messages, executing function-calling tools against database facts and returning answers with source citations.
- **`wakeContext(req, res, next)`**: Pre-loads record context badge when user clicks **Investigate with Copilot**.

---

### 16. `assistantAction.controller.js`
*File Path*: [`backend/src/controllers/assistantAction.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/assistantAction.controller.js)  
*Base Route*: `/api/assistant/actions`  

#### Functions:
- **`confirmAction(req, res, next)`**: Confirms and executes Human-in-the-Loop Action Proposals (`FLAG_CASE`, `ADD_CASE_NOTE`, `TRIGGER_REANALYSIS`, `ESCALATE_ALERT`).
- **`dismissAction(req, res, next)`**: Dismisses an Action Proposal without executing mutations.

---

### 17. `audit.controller.js`
*File Path*: [`backend/src/controllers/audit.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/audit.controller.js)  
*Base Route*: `/api/audit-logs`  

#### Functions:
- **`getAuditLogs(req, res, next)`**: Retrieves compliance audit trail records, joining user data and formatted action tags.
