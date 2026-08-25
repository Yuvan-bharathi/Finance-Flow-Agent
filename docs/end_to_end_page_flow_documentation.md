# FinanceFlow AI — End-to-End Page & Application Flow Documentation

**Version:** 1.0.0  
**Target Architecture:** Full-Stack Agentic Financial Operations Platform  
**Frontend Framework:** React + Vite  
**Backend Framework:** Node.js + Express  
**Database:** MySQL 8.0 Cloud Database  
**AI Infrastructure:** Groq Llama-3.3 70B & Qwen 2.5 32B Multi-Agent Engine  

---

## 1. Overview & Architectural Data Flow

FinanceFlow AI is structured as a decoupled full-stack platform. Every user interaction on a React frontend page triggers an explicit data flow across the system:

```
[ React Page Component ]
         │ (UI Action / Form Submit)
         ▼
[ Axios API Service Layer (frontend/src/services/) ]
         │ (HTTP Request with JWT Cookie / Bearer Header)
         ▼
[ Express Router & Authentication/RBAC Middleware (backend/src/routes/) ]
         │ (Route Handler & Role Check)
         ▼
[ Express Controller (backend/src/controllers/) ]
         │ (Request Parsing & Input Validation)
         ▼
[ Service & Agent Layer (backend/src/services/ & backend/src/agents/) ]
         │ (Groq LLM / SQL Query Execution)
         ▼
[ MySQL Database (18 Tables) ] & [ Socket.IO WebSockets ]
```

---

## 2. Page-by-Page End-to-End System Specifications

---

### PAGE 1: User Login & Session Authentication

#### 1. Page Description
The entry point for system access. Authenticates user credentials, sets an HTTP-only secure cookie, issues a JWT token, and restores the user's role-based session.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/Login.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/Login.jsx)
- **Context Provider**: [`frontend/src/context/AuthContext.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/context/AuthContext.jsx)
- **Triggered UI Functions**: `handleLogin(e)`, `login(email, password)`
- **API Endpoint**: `POST /api/auth/login`
- **Backend Route File**: [`backend/src/routes/auth.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/auth.routes.js)
- **Express Controller File**: [`backend/src/controllers/auth.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/auth.controller.js) (`login`)
- **Backend Service File**: [`backend/src/services/auth.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/auth.service.js) (`loginUser`)
- **Token Helper File**: [`backend/src/utils/tokenHelper.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/utils/tokenHelper.js) (`generateToken`, `setAuthCookie`)
- **Database Model File**: [`backend/src/models/user.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/user.model.js) (`findUserByEmail`, `updateLastLogin`)
- **SQL Tables Used**: `users`, `roles`

#### 3. Step-by-Step Data Flow
1. User enters email & password on `Login.jsx` and clicks **Sign In**.
2. `Login.jsx` calls `login(email, password)` in `AuthContext.jsx`, issuing `POST /api/auth/login`.
3. `auth.controller.js` parses the body and passes credentials to `loginUser()` in `auth.service.js`.
4. `auth.service.js` queries `users` JOIN `roles` via `findUserByEmail()` to retrieve the user record and role name.
5. `bcrypt.compare()` verifies the hashed password.
6. `tokenHelper.generateToken()` signs a JWT containing `{ id, name, email, role_id, role_name }`.
7. `tokenHelper.setAuthCookie()` attaches an HTTP-only encrypted cookie named `token` to the response.
8. The server responds with `HTTP 200 OK` and `{ success: true, data: { user, token } }`.
9. `AuthContext.jsx` saves `user` state, and the React app navigates to the default `/reconciliations` dashboard.

---

### PAGE 2: Set Password / Account Activation

#### 1. Page Description
Allows new invited team members or password-reset requesters to set a secure password using a valid email token.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/SetPassword.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/SetPassword.jsx)
- **Triggered UI Functions**: `handleSetPassword(e)`
- **API Endpoint**: `POST /api/auth/set-password`
- **Backend Route File**: [`backend/src/routes/auth.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/auth.routes.js)
- **Express Controller File**: [`backend/src/controllers/auth.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/auth.controller.js) (`setPassword`)
- **Backend Service File**: [`backend/src/services/auth.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/auth.service.js) (`setPasswordWithToken`)
- **SQL Tables Used**: `users`

#### 3. Step-by-Step Data Flow
1. User opens the link `/set-password?token=<reset_token>` received via email.
2. User submits a new password on `SetPassword.jsx`.
3. Requests `POST /api/auth/set-password` with `{ token, password }`.
4. `auth.service.js` queries `users` table for a record with `reset_token = token` and `reset_token_expires > NOW()`.
5. Computes `bcrypt.hash(password, 10)` and updates `users` table, clearing the reset token.
6. Returns `HTTP 200 OK`, allowing the user to proceed to login.

---

### PAGE 3: Payment Reconciliation & Action Center Engine

#### 1. Page Description
The core operational hub for payment ingestion, mock bank deposits, Groq AI Agent 1 matching, and human-in-the-loop settlement allocation approvals.

#### 2. Technical Stack Mapping
- **Frontend Component Paths**: 
  - [`frontend/src/pages/PaymentIngestion.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/PaymentIngestion.jsx)
  - [`frontend/src/components/ActionCenterDrawer.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/components/ActionCenterDrawer.jsx)
- **Triggered UI Functions**: 
  - `handleIngestPayment(e)` (Manual Ingestion)
  - `handleMockDeposit()` (Bank Simulation)
  - `handleRunAgent()` (Agent 1 Trigger)
  - `handleApprove()` (Settlement Approval)
  - `handleReject()` (Recommendation Rejection)
  - `handleOverride(e)` (Accountant Manual Override)
- **API Endpoints Triggered**:
  - `POST /api/payments/ingest`
  - `POST /api/payments/mock-bank-deposit`
  - `GET /api/reconciliations/cases`
  - `POST /api/reconciliations/analyze/:caseId`
  - `POST /api/reconciliations/approve`
  - `POST /api/reconciliations/reject`
  - `POST /api/reconciliations/override`
- **Backend Route Files**:
  - [`backend/src/routes/payment.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/payment.routes.js)
  - [`backend/src/routes/reconciliation.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/reconciliation.routes.js)
- **Express Controller Files**:
  - [`backend/src/controllers/payment.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/payment.controller.js) (`ingestPayment`, `ingestMockBankDeposit`)
  - [`backend/src/controllers/reconciliation.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/reconciliation.controller.js) (`getCases`, `analyzeCase`)
  - [`backend/src/controllers/settlement.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/settlement.controller.js) (`approveRecommendation`, `rejectRecommendation`, `overrideRecommendation`)
- **Backend Services & Agents**:
  - [`backend/src/services/payment.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/payment.service.js)
  - [`backend/src/agents/reconciliationAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/reconciliationAgent.js) (**Agent 1: Groq Llama-3.3 70B**)
  - [`backend/src/services/settlement.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/settlement.service.js)
- **SQL Tables Used**: `payments`, `reconciliation_cases`, `ai_recommendations`, `payment_allocations`, `repayment_schedules`, `companies`, `loans`, `audit_logs`
- **Socket.IO Real-Time Events Emitted**: `PAYMENT_INGESTED`, `RECONCILIATION_STARTED`, `RECONCILIATION_COMPLETED`

#### 3. Step-by-Step Data Flow
1. **Payment Ingestion**:
   - User inputs transaction details or clicks **Simulate Deposit**.
   - `POST /api/payments/ingest` inserts a record into `payments` table and automatically opens a new `reconciliation_cases` record with status `open`.
   - Emits `PAYMENT_INGESTED` via Socket.IO to update all open dashboards.
2. **AI Agent 1 Execution**:
   - User or auto-trigger calls `POST /api/reconciliations/analyze/:caseId`.
   - `reconciliationAgent.js` fetches payment details and candidate loan schedules.
   - Prompts Groq LLM to compute match confidence scores based on reference text, bank account, and amount.
   - Inserts match result into `ai_recommendations` table and updates case status to `pending_review`. Emits `RECONCILIATION_COMPLETED`.
3. **Human Settlement Approval**:
   - Senior Accountant reviews the drawer and clicks **Approve & Allocate**.
   - `POST /api/reconciliations/approve` verifies authorization (`senior_accountant` or higher).
   - Inserts row into `payment_allocations` table, updates `repayment_schedules` (`paid_amount`, status `paid`), updates `reconciliation_cases` (`approved`), and logs an immutable audit trail in `audit_logs`.

---

### PAGE 4: AI Agent Control Center

#### 1. Page Description
Operational monitoring center displaying the live health status, recent execution history, token consumption, confidence scores, and step-by-step execution logs for all 6 AI agents.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/AgentControlCenter.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/AgentControlCenter.jsx)
- **Triggered UI Functions**: `fetchAgentData()`, `handleRunAgent(agentId)`, `handleApproveAlert(id)`
- **API Endpoints Triggered**:
  - `GET /api/agents/status`
  - `GET /api/agents/activity`
  - `GET /api/agents/:agentId/runs`
  - `GET /api/agents/:agentId/runs/:runId`
  - `POST /api/reconciliations/analyze-all-pending` (Agent 1)
  - `GET /api/risk/assess/:companyId` (Agent 2)
  - `POST /api/portfolio/analyze` (Agent 5)
  - `POST /api/notifications/escalate` (Agent 6)
- **Backend Route Files**:
  - [`backend/src/routes/agentControl.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/agentControl.routes.js)
- **Express Controller File**:
  - [`backend/src/controllers/agentControl.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/agentControl.controller.js)
- **Database Model Files**:
  - [`backend/src/models/agentRun.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/agentRun.model.js) (`findAgentRuns`, `findAgentRunById`, `findExecutionLogsByRunId`)
- **SQL Tables Used**: `agent_runs`, `agent_execution_logs`, `reconciliation_cases`, `portfolio_snapshots`, `notification_alerts`
- **AI Agents**: All 6 Operational AI Agents (`agent_1` through `agent_6`)

#### 3. Step-by-Step Data Flow
1. On page mount, `AgentControlCenter.jsx` calls `GET /api/agents/status` and `GET /api/agents/activity`.
2. `agentControl.controller.js` queries `agent_runs` table for aggregate execution counts, average confidence scores, and token counts per agent ID.
3. Clicking **Test Run** on an agent card checks user RBAC role (disabling for `viewer`) and fires the corresponding agent API endpoint.
4. Clicking **Inspect Run** fires `GET /api/agents/:agentId/runs/:runId`, fetching step-by-step tool invocation inputs/outputs from `agent_execution_logs`.

---

### PAGE 5: Borrowing Companies Master Data

#### 1. Page Description
Master catalog of corporate borrowers, registration numbers, tax identifiers, bank account numbers, credit health scores, and automated collection notices.

#### 2. Technical Stack Mapping
- **Frontend Component Paths**:
  - [`frontend/src/pages/CompanyList.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/CompanyList.jsx)
  - [`frontend/src/components/RiskAssessmentDrawer.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/components/RiskAssessmentDrawer.jsx)
  - [`frontend/src/components/CollectionReminderModal.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/components/CollectionReminderModal.jsx)
- **Triggered UI Functions**:
  - `fetchCompanies()`
  - `handleCreateCompany(e)`
  - `handleRunRiskAssessment()` (Agent 2 Trigger)
  - `handleGenerateNotice()` (Agent 3 Trigger)
  - `handleSendNotice()` (Dispatch Notice)
- **API Endpoints Triggered**:
  - `GET /api/companies`
  - `GET /api/companies/:id`
  - `POST /api/companies`
  - `PUT /api/companies/:id`
  - `GET /api/risk/assess/:companyId` (Agent 2)
  - `GET /api/collections/generate/:companyId` (Agent 3)
  - `POST /api/collections/send` (Dispatch)
- **Backend Route Files**:
  - [`backend/src/routes/company.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/company.routes.js)
  - [`backend/src/routes/risk.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/risk.routes.js)
  - [`backend/src/routes/collection.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/collection.routes.js)
- **Express Controller Files**:
  - [`backend/src/controllers/company.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/company.controller.js)
  - [`backend/src/controllers/risk.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/risk.controller.js)
  - [`backend/src/controllers/collection.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/collection.controller.js)
- **Backend Agents & Services**:
  - [`backend/src/agents/riskAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/riskAgent.js) (**Agent 2: Credit Risk**)
  - [`backend/src/agents/collectionAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/collectionAgent.js) (**Agent 3: Collection Strategy**)
  - [`backend/src/utils/emailService.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/utils/emailService.js)
- **SQL Tables Used**: `companies`, `loans`, `repayment_schedules`, `agent_runs`, `audit_logs`

#### 3. Step-by-Step Data Flow
1. User views borrower list (`GET /api/companies`).
2. Clicking **Add Borrower Company** checks RBAC permissions (`owner`, `super_admin`, `admin`, `manager`) and issues `POST /api/companies`.
3. Clicking **Assess Credit Risk** triggers `GET /api/risk/assess/:companyId`. `riskAgent.js` analyzes repayment velocity and delinquent days to compute Probability of Default (PD %) and Risk Grade (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
4. Clicking **Draft Collection Notice** triggers `GET /api/collections/generate/:companyId`. `collectionAgent.js` drafts a personalized legal recovery letter using Groq LLM.
5. Clicking **Approve & Send Notice** fires `POST /api/collections/send`, dispatching the email via SMTP and recording an audit trail.

---

### PAGE 6: Loan Facilities & Repayment Breakdown

#### 1. Page Description
Manages corporate borrowing contracts, principal amounts, interest rates, total payable amounts, and automated monthly installment schedules.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/LoanList.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/LoanList.jsx)
- **Triggered UI Functions**: `fetchLoans()`, `handleCreateLoan(e)`, `handleFetchLoanDetails(loanId)`
- **API Endpoints Triggered**:
  - `GET /api/loans`
  - `GET /api/loans/:id`
  - `POST /api/loans`
  - `GET /api/repayments/loan/:loanId`
- **Backend Route Files**:
  - [`backend/src/routes/loan.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/loan.routes.js)
  - [`backend/src/routes/repayment.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/repayment.routes.js)
- **Express Controller Files**:
  - [`backend/src/controllers/loan.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/loan.controller.js)
  - [`backend/src/controllers/repayment.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/repayment.controller.js)
- **Backend Service File**:
  - [`backend/src/services/loan.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/loan.service.js) (`createLoanWithScheduleService`)
- **SQL Tables Used**: `loans`, `companies`, `repayment_schedules`, `audit_logs`

#### 3. Step-by-Step Data Flow
1. `LoanList.jsx` loads active loan contracts via `GET /api/loans`.
2. Admin/Manager submits **Create Loan Facility** form (`POST /api/loans`).
3. `loan.service.js` inserts a row into `loans` table and calculates total interest and monthly EMI installments.
4. Generates $N$ rows in `repayment_schedules` table with sequential due dates and scheduled amounts.
5. Logs loan issuance in `audit_logs` and returns loan details to UI.

---

### PAGE 7: Document Intelligence & File Repository

#### 1. Page Description
Uploads, stores, and inspects financial documents (loan agreements, bank statements, payment proofs) using Groq Agent 4 OCR Extraction.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/DocumentList.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/DocumentList.jsx)
- **Triggered UI Functions**: `fetchDocuments()`, `handleInspectDocument(doc)`
- **API Endpoints Triggered**:
  - `GET /api/documents`
  - `POST /api/documents/extract/:documentId` (Agent 4)
- **Backend Route File**: [`backend/src/routes/document.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/document.routes.js)
- **Express Controller File**: [`backend/src/controllers/document.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/document.controller.js)
- **Backend Agent File**: [`backend/src/agents/documentAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/documentAgent.js) (**Agent 4: Document Intelligence**)
- **SQL Tables Used**: `documents`, `companies`, `payments`, `agent_runs`

#### 3. Step-by-Step Data Flow
1. `DocumentList.jsx` retrieves uploaded documents via `GET /api/documents`.
2. User selects a document and clicks **Extract Financial Terms**.
3. Fires `POST /api/documents/extract/:documentId`.
4. `documentAgent.js` processes document metadata and extracts key financial terms (borrower name, principal exposure, interest terms, repayment dates) via Groq LLM.
5. Returns structured JSON extracted terms to UI.

---

### PAGE 8: Real-Time Notification & Escalation Center

#### 1. Page Description
Monitors SLA breaches, delinquent borrowers, and routes multi-tiered escalation notices to accountants, managers, and executives.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/Notifications.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/Notifications.jsx)
- **Triggered UI Functions**: `fetchAlerts()`, `handleRunScan()` (Agent 6 Trigger), `handleApprove(id)`, `handleDismiss(id)`
- **API Endpoints Triggered**:
  - `GET /api/notifications/alerts`
  - `POST /api/notifications/escalate` (Agent 6)
  - `PUT /api/notifications/alerts/:id/approve`
  - `PUT /api/notifications/alerts/:id/dismiss`
- **Backend Route File**: [`backend/src/routes/notification.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/notification.routes.js)
- **Express Controller File**: [`backend/src/controllers/notification.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/notification.controller.js)
- **Backend Agent File**: [`backend/src/agents/notificationAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/notificationAgent.js) (**Agent 6: Notification & Escalation**)
- **SQL Tables Used**: `notification_alerts`, `companies`, `loans`, `repayment_schedules`, `audit_logs`
- **Socket.IO Events Emitted**: `ESCALATION_SCAN_COMPLETE`, `NEW_ESCALATION_ALERTS`

#### 3. Step-by-Step Data Flow
1. Clicking **Run Escalation Scan** fires `POST /api/notifications/escalate`.
2. `notificationAgent.js` queries `repayment_schedules` for past-due installments.
3. Classifies severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and assigns escalation routes (`accountant`, `manager`, `executive`).
4. Inserts alert rows into `notification_alerts` table and emits `NEW_ESCALATION_ALERTS` via Socket.IO.
5. User clicks **Approve & Dispatch Notice** (`PUT /api/notifications/alerts/:id/approve`), updating alert status to `approved` and logging audit data.

---

### PAGE 9: Reports & Executive Analytics

#### 1. Page Description
Provides macroeconomic portfolio-wide financial intelligence, collection efficiency trends, risk concentration metrics, and historical snapshots.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/ReportsAnalytics.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/ReportsAnalytics.jsx)
- **Triggered UI Functions**: `fetchReports()`, `handleRunPortfolioAnalysis()` (Agent 5 Trigger)
- **API Endpoints Triggered**:
  - `GET /api/portfolio/latest`
  - `GET /api/portfolio/snapshots`
  - `POST /api/portfolio/analyze` (Agent 5)
- **Backend Route File**: [`backend/src/routes/portfolio.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/portfolio.routes.js)
- **Express Controller File**: [`backend/src/controllers/portfolio.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/portfolio.controller.js)
- **Backend Agent File**: [`backend/src/agents/portfolioAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/portfolioAgent.js) (**Agent 5: Portfolio Intelligence**)
- **SQL Tables Used**: `portfolio_snapshots`, `companies`, `loans`, `repayment_schedules`, `payments`, `agent_runs`
- **Socket.IO Event Emitted**: `PORTFOLIO_SNAPSHOT_READY`

#### 3. Step-by-Step Data Flow
1. `ReportsAnalytics.jsx` fetches latest snapshot via `GET /api/portfolio/latest`.
2. Clicking **Generate Portfolio Snapshot** fires `POST /api/portfolio/analyze`.
3. `portfolioAgent.js` aggregates total portfolio principal, overdue exposure, collection rate, and risk grade distribution.
4. Generates an executive summary narrative using Groq LLM and saves a new row in `portfolio_snapshots` table.

---

### PAGE 10: Audit Logs & Compliance Trail

#### 1. Page Description
Displays an immutable compliance log tracking every user operation, action type, affected record, IP address, and JSON diffs of before & after states.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/AuditLogs.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/AuditLogs.jsx)
- **Triggered UI Functions**: `fetchAuditLogs()`, `handleFilterChange()`
- **API Endpoint Triggered**: `GET /api/audit-logs`
- **Backend Route File**: [`backend/src/routes/audit.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/audit.routes.js)
- **Express Controller File**: [`backend/src/controllers/audit.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/audit.controller.js)
- **Database Model File**: [`backend/src/models/auditLog.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/auditLog.model.js)
- **SQL Tables Used**: `audit_logs`, `users`

#### 3. Step-by-Step Data Flow
1. Component loads `GET /api/audit-logs`.
2. `audit.controller.js` queries `audit_logs` JOIN `users` to fetch compliance records.
3. UI renders filterable table with action tags (`APPROVE_RECONCILIATION_RECOMMENDATION`, `CREATE_LOAN`, `DISPATCH_COLLECTION_NOTICE`), user name, and expandable old/new JSON state previews.

---

### PAGE 11: Settings & System Telemetry

#### 1. Page Description
Manages platform preferences, AI confidence thresholds, Groq API token consumption telemetry, and live Groq LLM model switcher.

#### 2. Technical Stack Mapping
- **Frontend Component Path**: [`frontend/src/pages/Settings.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/Settings.jsx)
- **Triggered UI Functions**: `loadSettings()`, `handleSaveSettings()`, `handleSwitchModel()`, `handleFetchTokenUsage()`
- **API Endpoints Triggered**:
  - `GET /api/settings`
  - `PUT /api/settings`
  - `GET /api/settings/token-usage` (Owner/Super Admin)
  - `PUT /api/settings/active-model` (Owner/Super Admin)
- **Backend Route File**: [`backend/src/routes/settings.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/settings.routes.js)
- **Express Controller File**: [`backend/src/controllers/settings.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/settings.controller.js)
- **Backend Service File**: [`backend/src/services/settings.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/settings.service.js)
- **SQL Tables Used**: `user_settings`, `agent_runs`, `users`

#### 3. Step-by-Step Data Flow
1. Loads settings via `GET /api/settings`.
2. User updates confidence threshold or notification emails and clicks **Save Configuration** (`PUT /api/settings`).
3. Platform Owner accesses **Infrastructure Telemetry** tab (`GET /api/settings/token-usage`), which queries `agent_runs` to aggregate total prompt/completion tokens and estimated cost.
4. Switching active LLM (`PUT /api/settings/active-model`) updates system model setting (`llama-3.3-70b-versatile` or `qwen/qwen3.6-27b`) for all subsequent agent invocations.

---

### COMPONENT: AI Financial Copilot & Action Proposals

#### 1. Component Description
Floating executive Copilot drawer available across all pages. Answers natural language queries over database facts via 19 read tools and generates human-in-the-loop Action Proposals via 4 action proposal tools.

#### 2. Technical Stack Mapping
- **Frontend Component Paths**:
  - [`frontend/src/components/AICopilotPanel.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/components/AICopilotPanel.jsx)
  - [`frontend/src/components/ActionProposalCard.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/components/ActionProposalCard.jsx)
- **Triggered UI Functions**:
  - `handleSend()`
  - `handleConfirmProposal(proposalId)`
  - `handleDismissProposal(proposalId)`
- **API Endpoints Triggered**:
  - `POST /api/assistant/chat`
  - `GET /api/assistant/wake/:recordType/:recordId`
  - `POST /api/assistant/actions/confirm`
  - `POST /api/assistant/actions/dismiss`
- **Backend Route File**: [`backend/src/routes/assistant.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/assistant.routes.js)
- **Express Controller Files**:
  - [`backend/src/controllers/assistant.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/assistant.controller.js) (`chat`, `wakeContext`)
  - [`backend/src/controllers/assistantAction.controller.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/controllers/assistantAction.controller.js) (`confirmAction`, `dismissAction`)
- **Backend Agent & Tools**:
  - [`backend/src/agents/assistantAgent.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/agents/assistantAgent.js)
  - [`backend/src/tools/assistantTools.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/tools/assistantTools.js) (**23 Tools**)
  - [`backend/src/services/assistantAction.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/assistantAction.service.js)
- **SQL Tables Used**: `assistant_action_proposals`, `audit_logs`, `reconciliation_cases`, `payments`, `companies`, `loans`, `repayment_schedules`, `agent_runs`, `documents`
- **Socket.IO Events Emitted**: `ACTION_PROPOSAL_EXECUTED`, `notification:alert`

#### 3. Step-by-Step Data Flow
1. User types query in Copilot panel (e.g. *"Flag Case #16 as critical priority"*).
2. Fires `POST /api/assistant/chat`.
3. `assistantAgent.js` passes message to Groq LLM with 23 tools declared in `assistantTools.js`.
4. Groq calls `proposeFlagCase(caseId: 16, priority: "critical", reason: "SLA breach")`.
5. `assistantTools.js` executes `proposeFlagCase`, inserting a proposal record into `assistant_action_proposals` with status `pending_confirmation`.
6. UI renders `<ActionProposalCard />` displaying the proposal ID, rationale, and 15-minute countdown timer.
7. User clicks **[✓ Confirm Action]**, firing `POST /api/assistant/actions/confirm { proposalId: "ACT-000123" }`.
8. `assistantAction.service.js` verifies proposal non-expiration and status, validates user RBAC permissions, updates `reconciliation_cases` priority to `critical`, updates proposal status to `executed`, and logs an audit record in `audit_logs`.
