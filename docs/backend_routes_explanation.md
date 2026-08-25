# FinanceFlow AI — Backend Express Routes Master Reference

**Location:** `backend/src/routes/`  
**Total Route Modules:** 15 Express Routers  
**Base Path Prefix:** Mounted in `app.js` under `/api/...`  
**Security Layers:** Express Router Pipeline (`authenticate` middleware ➔ `authorize([...roles])` RBAC middleware ➔ Controller Handler)  

---

## 🛣️ How Express Routers Work in FinanceFlow AI

The router files inside `backend/src/routes/` define the HTTP endpoint URI paths, HTTP methods (`GET`, `POST`, `PUT`, `DELETE`), and security middleware chains:

```
Browser / HTTP Request
         │
         ▼  (e.g., POST /api/reconciliations/approve)
  [ app.js ]  (Mounts /api/reconciliations -> reconciliation.routes.js)
         │
         ▼
[ reconciliation.routes.js ]
         │
         ├── 1. `authenticate` Middleware (Verifies JWT Session Cookie / Bearer Header)
         │
         ├── 2. `authorize(['senior_accountant', ...])` Middleware (Enforces RBAC Permissions)
         │
         └── 3. `approveRecommendation` Controller Handler (Executes Business Logic)
```

---

## 📑 Detailed Breakdown of All 15 Express Router Modules

---

### 1. `auth.routes.js`
*File Path*: [`backend/src/routes/auth.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/auth.routes.js)  
*Mounted at*: `/api/auth`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/login` | Public | All | `authController.login` | Authenticates email/password & sets JWT cookie. |
| `POST` | `/set-password` | Public | All | `authController.setPassword` | Sets new password via setup token. |
| `GET` | `/demo-users` | Public | All | `authController.getDemoUsers` | Lists demo user accounts for rapid testing. |
| `POST` | `/logout` | Authenticated | All Roles | `authController.logout` | Clears auth cookie & invalidates session. |
| `GET` | `/me` | Authenticated | All Roles | `authController.getMe` | Fetches current user profile and role details. |
| `GET` | `/users` | Authenticated | All Roles | `authController.getUsers` | Lists all platform users. |
| `POST` | `/users/create` | Authenticated | `owner`, `super_admin`, `admin` | `authController.createUser` | Invites team member & sends setup email. |

---

### 2. `company.routes.js`
*File Path*: [`backend/src/routes/company.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/company.routes.js)  
*Mounted at*: `/api/companies`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/` | Authenticated | All Roles | `companyController.getCompanies` | Lists corporate borrower master profiles. |
| `GET` | `/:id` | Authenticated | All Roles | `companyController.getCompanyById` | Gets detailed company profile by ID. |
| `POST` | `/` | Authenticated | `owner`, `super_admin`, `admin`, `manager` | `companyController.createCompany` | Registers a new borrowing company. |
| `PUT` | `/:id` | Authenticated | `owner`, `super_admin`, `admin`, `manager` | `companyController.updateCompany` | Modifies company details or standing. |

---

### 3. `loan.routes.js`
*File Path*: [`backend/src/routes/loan.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/loan.routes.js)  
*Mounted at*: `/api/loans`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/` | Authenticated | All Roles | `loanController.getLoans` | Lists active borrowing facilities. |
| `GET` | `/:id` | Authenticated | All Roles | `loanController.getLoanById` | Gets loan facility contract & schedule. |
| `POST` | `/` | Authenticated | `owner`, `super_admin`, `admin`, `manager` | `loanController.createLoan` | Issues loan & generates EMI schedule. |

---

### 4. `repayment.routes.js`
*File Path*: [`backend/src/routes/repayment.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/repayment.routes.js)  
*Mounted at*: `/api/repayments`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/loan/:loanId` | Authenticated | All Roles | `repaymentController.getScheduleByLoanId` | Gets installment breakdown for loan ID. |
| `GET` | `/due` | Authenticated | All Roles | `repaymentController.getDueInstallments` | Gets past-due and upcoming installments. |
| `GET` | `/:id` | Authenticated | All Roles | `repaymentController.getScheduleById` | Gets details for single installment. |

---

### 5. `payment.routes.js`
*File Path*: [`backend/src/routes/payment.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/payment.routes.js)  
*Mounted at*: `/api/payments`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/ingest` | Authenticated | Non-Viewer Roles | `paymentController.ingestPayment` | Ingests bank deposit & opens case. |
| `POST` | `/mock-bank-deposit` | Authenticated | Non-Viewer Roles | `paymentController.ingestMockBankDeposit` | Simulates live bank feed deposit. |
| `GET` | `/` | Authenticated | All Roles | `paymentController.getPayments` | Lists ingested deposit transactions. |
| `GET` | `/:id` | Authenticated | All Roles | `paymentController.getPaymentById` | Gets payment transaction details. |

---

### 6. `reconciliation.routes.js`
*File Path*: [`backend/src/routes/reconciliation.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/reconciliation.routes.js)  
*Mounted at*: `/api/reconciliations`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/stats` | Authenticated | All Roles | `reconciliationController.getStats` | Dashboard KPIs & match stats. |
| `GET` | `/cases` | Authenticated | All Roles | `reconciliationController.getCases` | Lists reconciliation cases. |
| `GET` | `/cases/:caseId` | Authenticated | All Roles | `reconciliationController.getCaseById` | Gets reconciliation case details. |
| `GET` | `/allocations` | Authenticated | All Roles | `settlementController.getAllocations` | Lists ledger allocation entries. |
| `POST` | `/analyze/:caseId` | Authenticated | Non-Viewer Roles | `reconciliationController.analyzeCase` | Triggers Agent 1 match on single case. |
| `POST` | `/analyze-bulk` | Authenticated | Non-Viewer Roles | `reconciliationController.analyzeBulk` | Triggers Agent 1 on array of case IDs. |
| `POST` | `/analyze-all-pending` | Authenticated | Non-Viewer Roles | `reconciliationController.analyzeAllPending` | Triggers Agent 1 on all new cases. |
| `POST` | `/approve` | Authenticated | `senior_accountant`+ | `settlementController.approveRecommendation` | 1-Click Human Settlement Approval. |
| `POST` | `/reject` | Authenticated | `senior_accountant`+ | `settlementController.rejectRecommendation` | Rejects AI recommendation match. |
| `POST` | `/override` | Authenticated | `senior_accountant`+ | `settlementController.overrideRecommendation` | Accountant manual override allocation. |

---

### 7. `risk.routes.js`
*File Path*: [`backend/src/routes/risk.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/risk.routes.js)  
*Mounted at*: `/api/risk`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/overview` | Authenticated | All Roles | `riskController.getRiskOverview` | Portfolio credit risk breakdown. |
| `GET` | `/assess/:companyId` | Authenticated | Non-Viewer Roles | `riskController.assessCompanyRisk` | Triggers Agent 2 Credit Risk Assessment. |

---

### 8. `collection.routes.js`
*File Path*: [`backend/src/routes/collection.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/collection.routes.js)  
*Mounted at*: `/api/collections`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/generate/:companyId` | Authenticated | `senior_accountant`+ | `collectionController.generateCollectionReminder` | Triggers Agent 3 Collection Notice Draft. |
| `POST` | `/send` | Authenticated | `senior_accountant`+ | `collectionController.sendCollectionReminder` | Dispatches collection notice email. |

---

### 9. `document.routes.js`
*File Path*: [`backend/src/routes/document.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/document.routes.js)  
*Mounted at*: `/api/documents`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/` | Authenticated | All Roles | `documentController.getDocuments` | Lists uploaded financial files. |
| `POST` | `/extract/:documentId` | Authenticated | Non-Viewer Roles | `documentController.extractDocumentTerms` | Triggers Agent 4 Document Extraction. |

---

### 10. `agentControl.routes.js`
*File Path*: [`backend/src/routes/agentControl.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/agentControl.routes.js)  
*Mounted at*: `/api/agents`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/status` | Authenticated | All Roles | `agentControlController.getAgentStatus` | Status & health of all 6 agents. |
| `GET` | `/activity` | Authenticated | All Roles | `agentControlController.getRecentAgentActivity` | Recent system agent activity feed. |
| `GET` | `/:agentId/runs` | Authenticated | All Roles | `agentControlController.getAgentRunHistory` | Run history for specific agent ID. |
| `GET` | `/:agentId/runs/:runId` | Authenticated | All Roles | `agentControlController.getRunDetail` | Step-by-step tool invocation traces. |

---

### 11. `portfolio.routes.js`
*File Path*: [`backend/src/routes/portfolio.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/portfolio.routes.js)  
*Mounted at*: `/api/portfolio`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/analyze` | Authenticated | `manager`+ | `portfolioController.analyzePortfolio` | Triggers Agent 5 Portfolio Analysis. |
| `GET` | `/snapshots` | Authenticated | All Roles | `portfolioController.getPortfolioSnapshots` | Snapshot history list. |
| `GET` | `/latest` | Authenticated | All Roles | `portfolioController.getLatestSnapshot` | Latest portfolio snapshot. |

---

### 12. `notification.routes.js`
*File Path*: [`backend/src/routes/notification.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/notification.routes.js)  
*Mounted at*: `/api/notifications`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/escalate` | Authenticated | `manager`+ | `notificationController.triggerEscalationScan` | Triggers Agent 6 SLA Breach Scan. |
| `GET` | `/alerts` | Authenticated | All Roles | `notificationController.getAlerts` | Lists escalation alerts & notices. |
| `PUT` | `/alerts/:id/approve` | Authenticated | `senior_accountant`+ | `notificationController.approveAlert` | Approves escalation notice. |
| `PUT` | `/alerts/:id/dismiss` | Authenticated | `senior_accountant`+ | `notificationController.dismissAlert` | Dismisses escalation alert. |

---

### 13. `settings.routes.js`
*File Path*: [`backend/src/routes/settings.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/settings.routes.js)  
*Mounted at*: `/api/settings`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/` | Authenticated | All Roles | `settingsController.getUserSettings` | Gets configuration settings. |
| `PUT` | `/` | Authenticated | All Roles | `settingsController.updateUserSettings` | Saves configuration settings. |
| `GET` | `/token-usage` | Authenticated | `owner`, `super_admin` | `settingsController.getAiTokenUsage` | Groq AI token telemetry & cost analytics. |
| `PUT` | `/active-model` | Authenticated | `owner`, `super_admin` | `settingsController.setActiveAiModel` | Switches live Groq LLM model dynamically. |

---

### 14. `assistant.routes.js`
*File Path*: [`backend/src/routes/assistant.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/assistant.routes.js)  
*Mounted at*: `/api/assistant`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/chat` | Authenticated | All Roles | `assistantController.chat` | AI Financial Copilot query & tool calls. |
| `GET` | `/wake/:recordType/:recordId` | Authenticated | All Roles | `assistantController.wakeContext` | Pre-loads record context badge. |
| `POST` | `/actions/confirm` | Authenticated | All Roles | `assistantActionController.confirmAction` | Confirms & executes Action Proposal. |
| `POST` | `/actions/dismiss` | Authenticated | All Roles | `assistantActionController.dismissAction` | Dismisses Action Proposal. |

---

### 15. `audit.routes.js`
*File Path*: [`backend/src/routes/audit.routes.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/routes/audit.routes.js)  
*Mounted at*: `/api/audit-logs`  

| HTTP Method | Endpoint Path | Authentication | Authorization Scope | Controller Handler | Purpose |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/` | Authenticated | Non-Viewer Roles | `auditController.getAuditLogs` | Compliance audit trail log list. |
