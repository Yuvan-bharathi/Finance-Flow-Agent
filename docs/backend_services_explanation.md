# FinanceFlow AI — Backend Services Architecture & Master Specification

**Location:** `backend/src/services/`  
**Total Service Modules:** 11  
**Architecture Pattern:** Domain Service Layer (Business Logic ➔ Model Execution ➔ Transactional Consistency ➔ Audit Trail & WebSockets)  

---

## ⚙️ What is the Services Layer in FinanceFlow AI?

The Service Layer inside `backend/src/services/` contains the **core business logic** of the application. 

### Why Services Exist (Skinny Controllers, Heavy Services):
1. **Business Logic Encapsulation**: Controllers only handle HTTP request parsing and response formatting. The actual domain calculations, financial allocations, and workflows live inside services.
2. **Multi-Model Orchestration**: A single service operation often coordinates multiple database models. For example, approving a settlement (`settlement.service.js`) updates 4 tables simultaneously: `payment_allocations`, `repayment_schedules`, `reconciliation_cases`, and `audit_logs`.
3. **Real-Time & Communication Triggers**: Services emit Socket.IO WebSocket events (`PAYMENT_INGESTED`, `RECONCILIATION_COMPLETED`) and trigger SMTP email sending via `emailService.js`.
4. **Reusability**: Service functions can be called by Controllers, AI Agents, or CLI background jobs without duplicating code.

```
[ Express Controller ]
         │ (Calls Service Function)
         ▼
  [ Service Layer (backend/src/services/) ]
         │
         ├── 1. Business Logic & Financial Calculations
         ├── 2. Model Calls (user.model, payment.model, etc.)
         ├── 3. Audit Trail Logging (auditLog.model)
         └── 4. Socket.IO Real-Time Event Emission
```

---

## 📑 Detailed Breakdown of All 11 Service Modules & Use Cases

---

### 1. `auth.service.js`
*File Path*: [`backend/src/services/auth.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/auth.service.js)  

#### Primary Use Cases:
- **User Authentication**: Validates login credentials against bcrypt password hashes, updates last login timestamps, signs JWT tokens, and structures user session payloads.
- **Hierarchical Team Member Invitation**: Enforces role hierarchy rules (e.g., `admin` cannot create `super_admin`), generates cryptographic invitation tokens, and dispatches activation setup emails via SMTP.
- **Password Setup & Reset**: Validates token expiration and sets encrypted passwords for activated accounts.

#### Key Functions:
- `loginUser(email, password)`
- `getCurrentUser(userId)`
- `getAllUsersService()`
- `createInvitedUserService(adminUser, userData)`
- `setPasswordWithToken(token, newPassword)`

---

### 2. `company.service.js`
*File Path*: [`backend/src/services/company.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/company.service.js)  

#### Primary Use Cases:
- **Corporate Borrower Management**: Validates corporate registration numbers (CIN), GSTIN tax identifiers, and bank account numbers.
- **Exposure Aggregation**: Calculates active loan counts and total outstanding debt exposure for each corporate borrower.

#### Key Functions:
- `getCompaniesService()`
- `getCompanyByIdService(id)`
- `createCompanyService(companyData)`
- `updateCompanyService(id, companyData)`

---

### 3. `loan.service.js`
*File Path*: [`backend/src/services/loan.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/loan.service.js)  

#### Primary Use Cases:
- **Loan Contract Creation & Amortization**: Takes loan principal, annual interest rate, and term length to compute total interest payable and monthly EMI amounts.
- **Automated Installment Schedule Generation**: Batch generates sequential monthly EMI rows in `repayment_schedules` table with exact due dates.

#### Key Functions:
- `createLoanWithScheduleService(loanData)`
- `getLoansService()`
- `getLoanByIdService(id)`

---

### 4. `repayment.service.js`
*File Path*: [`backend/src/services/repayment.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/repayment.service.js)  

#### Primary Use Cases:
- **Repayment Schedule Tracking**: Retrieves installment breakdowns, calculates past-due delinquent days, and filters pending vs. overdue schedules.

#### Key Functions:
- `getScheduleByLoanIdService(loanId)`
- `getDueInstallmentsService()`
- `getScheduleByIdService(id)`

---

### 5. `payment.service.js`
*File Path*: [`backend/src/services/payment.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/payment.service.js)  

#### Primary Use Cases:
- **Bank Deposit Ingestion Engine**: Ingests raw incoming bank transactions (UTR numbers, deposit amounts, bank accounts).
- **Automated Case Opening**: Automatically creates a new `reconciliation_cases` record with status `open` for every ingested deposit.
- **Real-Time Push**: Emits `PAYMENT_INGESTED` via Socket.IO so all open user dashboards update live.

#### Key Functions:
- `ingestPaymentService(paymentData)`
- `ingestMockBankDepositService(mockData)`
- `getPaymentsService()`
- `getPaymentByIdService(id)`

---

### 6. `reconciliation.service.js`
*File Path*: [`backend/src/services/reconciliation.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/reconciliation.service.js)  

#### Primary Use Cases:
- **Dashboard KPI Aggregation**: Calculates reconciliation accuracy %, total pending cases, and total settled volume.
- **Agent 1 Orchestration**: Dispatches Agent 1 (Payment Reconciliation Agent) for single cases, bulk case arrays, or all unanalyzed pending cases.

#### Key Functions:
- `getStatsService()`
- `getCasesService(status, priority)`
- `getCaseByIdService(caseId)`
- `analyzeCaseService(caseId, userId, mode)`
- `analyzeBulkService(caseIds, userId)`
- `analyzeAllPendingService(userId)`

---

### 7. `settlement.service.js`
*File Path*: [`backend/src/services/settlement.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/settlement.service.js)  

#### Primary Use Cases:
- **Human-in-the-Loop Financial Settlement Engine**: Executes 1-click human approvals for AI recommendations. Writes official ledger entries to `payment_allocations`, marks repayment installments `PAID`, updates case status to `approved`, and appends an immutable compliance audit record in `audit_logs`.
- **Manual Override Engine**: Allows Accountants to manually override AI match recommendations against custom target schedules.

#### Key Functions:
- `approveRecommendationService(recommendationId, approvedByUserId, notes, ipAddress)`
- `rejectRecommendationService(recommendationId, rejectedByUserId, reason, ipAddress)`
- `overrideRecommendationService(caseId, overrideData, user, ipAddress)`
- `getAllAllocationsService()`

---

### 8. `risk.service.js`
*File Path*: [`backend/src/services/risk.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/risk.service.js)  

#### Primary Use Cases:
- **Credit Risk Distribution**: Aggregates borrower risk ratings and dispatches Agent 2 (Credit Risk Assessment) to compute Probability of Default (PD %).

#### Key Functions:
- `getRiskOverviewService()`
- `assessCompanyRiskService(companyId, userId)`

---

### 9. `collection.service.js`
*File Path*: [`backend/src/services/collection.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/collection.service.js)  

#### Primary Use Cases:
- **Legal Recovery & Email Dispatch**: Dispatches Agent 3 (Collection Strategy) to generate recovery notices under Section 138 NI Act, and sends emails to delinquent corporate borrowers via SMTP.

#### Key Functions:
- `generateCollectionReminderService(companyId, userId)`
- `sendCollectionReminderService(companyId, noticeText, userId)`

---

### 10. `document.service.js`
*File Path*: [`backend/src/services/document.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/document.service.js)  

#### Primary Use Cases:
- **Document Management**: Fetches financial documents and dispatches Agent 4 (Document Intelligence) OCR term extraction.

#### Key Functions:
- `getDocumentsService()`
- `extractDocumentTermsService(documentId, userId)`

---

### 11. `assistantAction.service.js`
*File Path*: [`backend/src/services/assistantAction.service.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/services/assistantAction.service.js)  

#### Primary Use Cases:
- **AI Copilot Action Proposal Confirmation Engine**: Validates 15-minute proposal expiration timers, checks user RBAC permissions, executes requested database mutations (`FLAG_CASE`, `ADD_CASE_NOTE`, `TRIGGER_REANALYSIS`, `ESCALATE_ALERT`), and logs compliance audit entries.

#### Key Functions:
- `confirmActionProposal(proposalId, user, ipAddress)`
- `dismissActionProposal(proposalId, user)`
