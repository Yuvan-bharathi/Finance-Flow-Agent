# FinanceFlow AI — Backend Database Models Master Specification

**Location:** `backend/src/models/`  
**Total Model Modules:** 11  
**Architecture Pattern:** Data Access Object (DAO) / Repository Pattern using `mysql2/promise` Connection Pool  

---

## 🏛️ What are Database Models in FinanceFlow AI?

The files inside `backend/src/models/` contain the **Data Access Layer (DAO)**. 

### Why Models exist:
- **Separation of Concerns**: Controllers and Services do NOT write raw SQL strings. They call clean JavaScript functions provided by these model files.
- **SQL Prepared Statements**: All model functions use parameterized MySQL queries (`pool.query('SELECT ... WHERE id = ?', [id])`) to prevent **SQL Injection** vulnerabilities.
- **Data Transformation**: Converts raw MySQL row tuples into structured JavaScript objects.

```
[ Express Controller / Service / AI Agent ]
                    │
                    ▼  (Calls JavaScript Function, e.g. `findCompanyById(1)`)
       [ Model File: company.model.js ]
                    │
                    ▼  (Executes Parameterized SQL Query)
     [ MySQL Cloud Database (`financeflow_db`) ]
```

---

## 📑 Detailed Breakdown of All 11 Model Files

---

### 1. `user.model.js`
*File Path*: [`backend/src/models/user.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/user.model.js)  
*Associated SQL Tables*: `users`, `roles`

#### Purpose:
Manages user accounts, bcrypt password verification queries, role joins, and session authentication data.

#### Key Exported Functions:
- `findUserByEmail(email)` — Performs a `JOIN` on `users` and `roles` to return user profile, hashed password, and role name (`admin`, `manager`, `senior_accountant`, `viewer`, etc.).
- `findUserById(id)` — Retrieves user profile details by primary key ID.
- `updateLastLogin(userId)` — Updates `last_login_at = NOW()` upon successful login.
- `getAllUsers()` — Returns list of all platform users and their assigned roles.
- `createUser(userData)` — Inserts a new user record with role ID and optional activation token.

---

### 2. `company.model.js`
*File Path*: [`backend/src/models/company.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/company.model.js)  
*Associated SQL Table*: `companies`

#### Purpose:
Handles CRUD operations and multi-criteria searches for corporate borrowing companies.

#### Key Exported Functions:
- `findAllCompanies()` — Returns all corporate borrowers with total active loan counts and aggregate loan exposure.
- `findCompanyById(id)` — Fetches detailed borrower profile including tax identifier (GSTIN), registration number (CIN), and primary bank account number.
- `createCompanyModel(data)` — Inserts a new corporate borrower record.
- `updateCompanyModel(id, data)` — Updates corporate contact details or borrower standing (`active`, `blacklisted`).
- `searchCompaniesByNameOrAccount(query)` — Performs fuzzy text search on company name, registration number, or bank account number (used by AI Copilot & Pre-Check Engine).

---

### 3. `loan.model.js`
*File Path*: [`backend/src/models/loan.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/loan.model.js)  
*Associated SQL Table*: `loans`

#### Purpose:
Manages credit facility contracts, principal exposure amounts, interest rates, and loan statuses.

#### Key Exported Functions:
- `findAllLoans()` — Returns list of all borrowing contracts joined with company names.
- `findLoanById(id)` — Fetches loan facility contract details.
- `findActiveLoanByCompanyId(companyId)` — Retrieves the primary active loan facility for a specific borrower company.
- `createLoanModel(data)` — Inserts a new loan facility record.

---

### 4. `repayment.model.js`
*File Path*: [`backend/src/models/repayment.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/repayment.model.js)  
*Associated SQL Table*: `repayment_schedules`

#### Purpose:
Manages monthly installment EMI schedules, due dates, scheduled vs. paid balances, and delinquency statuses (`pending`, `paid`, `overdue`).

#### Key Exported Functions:
- `findSchedulesByLoanId(loanId)` — Retrieves all installment schedule rows for a loan ID sorted by installment number.
- `findDueSchedulesByLoanId(loanId)` — Retrieves un-paid (`pending` / `overdue`) installments for a loan.
- `findScheduleById(id)` — Fetches details for a single installment ID.
- `createRepaymentSchedules(schedulesArray)` — Batch inserts generated monthly EMI installment rows when a loan is created.
- `updateSchedulePaidAmount(id, paidAmount, status)` — Updates paid amount and status (`paid` / `partially_paid`) upon settlement approval.

---

### 5. `payment.model.js`
*File Path*: [`backend/src/models/payment.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/payment.model.js)  
*Associated SQL Table*: `payments`

#### Purpose:
Handles raw incoming bank deposit transactions (Bank UTR numbers, amounts, sender bank accounts, dates, references).

#### Key Exported Functions:
- `createPaymentModel(data)` — Inserts a raw bank deposit record with initial status `unmatched`.
- `findPaymentById(id)` — Fetches payment transaction details.
- `findAllPayments()` — Returns list of all ingested bank payments.
- `findDuplicatePayment(transactionId, amount)` — Checks if a transaction with the same UTR number or exact amount already exists (used by Pre-Check Engine).
- `updatePaymentStatus(id, status)` — Updates payment status (`unmatched` ➔ `completed` / `rejected`).

---

### 6. `reconciliationCase.model.js`
*File Path*: [`backend/src/models/reconciliationCase.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/reconciliationCase.model.js)  
*Associated SQL Table*: `reconciliation_cases`

#### Purpose:
Manages investigation cases opened per payment transaction, tracking assigned accountants, status, priority, and resolution notes.

#### Key Exported Functions:
- `createCaseModel(data)` — Opens a new reconciliation case for an ingested payment.
- `findCaseById(id)` — Fetches case details joined with payment data and latest AI recommendation.
- `findAllCases(status, priority)` — Returns filterable list of reconciliation cases.
- `updateCaseStatus(id, status, priority, reason)` — Updates case state (`open` ➔ `pending_review` ➔ `approved`).

---

### 7. `aiRecommendation.model.js`
*File Path*: [`backend/src/models/aiRecommendation.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/aiRecommendation.model.js)  
*Associated SQL Table*: `ai_recommendations`

#### Purpose:
Stores candidate matching recommendations generated by Groq Agent 1 (Payment Reconciliation Agent), including LLM confidence score % and reasoning explanation text.

#### Key Exported Functions:
- `createRecommendationModel(data)` — Inserts Agent 1 match prediction (`confidence_score`, `reasoning`, candidate `company_id`, `loan_id`, `schedule_id`).
- `findRecommendationById(id)` — Fetches single recommendation details.
- `findRecommendationsByCaseId(caseId)` — Retrieves AI recommendations for a specific case ID.
- `updateRecommendationStatus(id, status, reviewedBy, comment)` — Updates recommendation state (`pending` ➔ `approved` / `rejected` / `overridden`).

---

### 8. `allocation.model.js`
*File Path*: [`backend/src/models/allocation.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/allocation.model.js)  
*Associated SQL Table*: `payment_allocations`

#### Purpose:
Stores official financial ledger allocation entries created **ONLY** upon human settlement approval.

#### Key Exported Functions:
- `createAllocationModel(data)` — Inserts a ledger allocation row (`payment_id`, `repayment_schedule_id`, `allocated_amount`, `approved_by`, `allocation_type`).
- `findAllAllocations()` — Returns list of all settled ledger allocation entries joined with company and loan details.
- `findAllocationsByPaymentId(paymentId)` — Retrieves allocation records for a payment transaction.

---

### 9. `auditLog.model.js`
*File Path*: [`backend/src/models/auditLog.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/auditLog.model.js)  
*Associated SQL Table*: `audit_logs`

#### Purpose:
Creates and queries immutable compliance audit records tracking WHO, WHAT, WHEN, client IP address, and before & after JSON state diffs.

#### Key Exported Functions:
- `createAuditLog(user_id, action, entity_type, entity_id, old_values, new_values, ip_address)` — Appends an immutable audit entry for state mutations.
- `findAuditLogs(limit, offset)` — Fetches compliance audit records joined with user names.

---

### 10. `agentRun.model.js`
*File Path*: [`backend/src/models/agentRun.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/agentRun.model.js)  
*Associated SQL Table*: `agent_runs`

#### Purpose:
Records execution performance telemetry, status, LLM model used, total Groq API tokens consumed, confidence scores, and duration for all 6 AI agents.

#### Key Exported Functions:
- `createAgentRun(agentId, triggerType, modelUsed)` — Inserts an initial agent execution record (`status: 'running'`).
- `updateAgentRun(id, status, totalTokens, confidenceScore, resultSummary)` — Updates agent run metrics upon execution completion.
- `findAgentRuns(agentId, limit)` — Fetches recent run history for an agent ID or system-wide.
- `findAgentRunById(id)` — Fetches single agent run metadata.

---

### 11. `agentExecutionLog.model.js`
*File Path*: [`backend/src/models/agentExecutionLog.model.js`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/backend/src/models/agentExecutionLog.model.js)  
*Associated SQL Table*: `agent_execution_logs`

#### Purpose:
Stores step-by-step tool invocation traces, inputs, outputs, and reasoning steps for complete AI decision transparency.

#### Key Exported Functions:
- `logStep(agentRunId, agentId, stepType, stepName, status, inputData, outputData, durationMs)` — Appends a step execution log for an agent run.
- `findExecutionLogsByRunId(runId)` — Fetches all step execution logs for an agent run ID sorted by step sequence number.
