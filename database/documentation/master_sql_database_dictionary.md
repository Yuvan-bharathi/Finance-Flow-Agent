# FinanceFlow AI — Master MySQL Database Schema & Dictionary

**Engine:** MySQL 8.0+ InnoDB  
**Total Tables:** 18  
**Charset:** `utf8mb4_unicode_ci`  

---

## 📊 Summary of All 18 MySQL Database Tables

| # | Table Name | Purpose | Primary Data Stored |
| :-: | :--- | :--- | :--- |
| **1** | `roles` | System access roles for RBAC | Role names (`owner`, `super_admin`, `admin`, `manager`, `senior_accountant`, `accountant`, `viewer`) |
| **2** | `users` | User account management | Hashed passwords, email addresses, assigned role IDs, active status, last login timestamps |
| **3** | `companies` | Borrowing corporate master data | Company names, registration numbers, GSTIN/tax IDs, bank account numbers, contact details |
| **4** | `loans` | Credit facilities issued to borrowers | Loan numbers, principal amounts, interest rates, total payable amounts, start/end dates |
| **5** | `repayment_schedules` | Monthly installment breakdown | Installment numbers, due dates, scheduled amounts, paid amounts, payment status |
| **6** | `payments` | Raw incoming bank deposits | Bank transaction IDs, deposit amounts, payment dates, sender names, bank accounts, references |
| **7** | `reconciliation_cases` | AI payment investigation cases | Associated payment IDs, assigned user IDs, investigation status, priority, resolution notes |
| **8** | `ai_recommendations` | Agent 1 match candidate records | Case IDs, candidate company/loan/schedule IDs, confidence scores %, reasoning text, status |
| **9** | `payment_allocations` | Official financial ledger allocations | Payment IDs, schedule IDs, allocated amounts, approving user IDs, allocation types |
| **10** | `documents` | Financial files & OCR metadata | File names, URLs, storage providers (`local`, `s3`), MIME types, file sizes, uploader IDs |
| **11** | `audit_logs` | Immutable compliance audit trail | User IDs, action types, entity types, entity IDs, old vs. new JSON state diffs, client IP addresses |
| **12** | `notifications` | In-app user alerts | User IDs, alert titles, notification messages, entity references, read timestamps |
| **13** | `agent_runs` | Telemetry for the 6 AI agents | Agent IDs, trigger types (`manual`/`auto`), status, LLM models used, Groq token counts |
| **14** | `agent_execution_logs` | Tool invocation steps per agent run | Run IDs, step numbers, tool names called, JSON inputs, JSON outputs, LLM reasoning steps |
| **15** | `portfolio_snapshots` | Agent 5 macroeconomic health reports | Snapshot dates, total exposure, active loan counts, overdue totals, LLM narrative summaries |
| **16** | `notification_alerts` | Agent 6 SLA breach escalation notices | Severity (`CRITICAL`/`HIGH`), escalation route (`manager`/`executive`), overdue days, status |
| **17** | `user_settings` | User & system configuration store | Key-value settings (`confidence_threshold`, `agent_1_enabled`, `notification_email`) |
| **18** | `assistant_action_proposals` | Human-in-the-Loop action proposals | Action types (`FLAG_CASE`), target IDs, requested parameters, proposal status, expiry dates |

---

## 🗂️ Detailed Schema & Column Specifications

### 1. `roles`
*Purpose*: Stores system security access roles for Role-Based Access Control (RBAC).
- `id` (INT, Primary Key): Unique role identifier (`1`: admin, `2`: manager, `3`: senior_accountant, `4`: accountant, `5`: viewer, `90002`: owner, `90003`: super_admin).
- `name` (VARCHAR): Unique role name (e.g., `'senior_accountant'`).
- `description` (VARCHAR): Human-readable permission scope summary.
- `created_at`, `updated_at` (TIMESTAMP): System audit timestamps.

### 2. `users`
*Purpose*: User identity records, bcrypt hashed passwords, and session tokens.
- `id` (INT, Primary Key): Unique user ID.
- `role_id` (INT, Foreign Key ➔ `roles.id`): Role assigned to user.
- `name` (VARCHAR): Full user display name (e.g., `'Sunil Verma'`).
- `email` (VARCHAR, Unique): Login email address.
- `password_hash` (VARCHAR): Bcrypt 10-round encrypted password hash.
- `is_active` (BOOLEAN): Active account flag (`TRUE`/`FALSE`).
- `reset_token` (VARCHAR, Nullable): Hashed password reset token.
- `reset_token_expires` (DATETIME, Nullable): Reset token expiration time.
- `last_login_at` (TIMESTAMP, Nullable): Timestamp of user's last login.

### 3. `companies`
*Purpose*: Corporate borrower master profiles and bank information.
- `id` (INT, Primary Key): Company identifier.
- `company_name` (VARCHAR): Legal entity name (e.g., `'Apex Logistics Pvt Ltd'`).
- `registration_number` (VARCHAR, Unique): Government registration / CIN number.
- `tax_identifier` (VARCHAR, Unique): GSTIN or TAX ID.
- `bank_account_number` (VARCHAR): Primary corporate bank account number.
- `contact_name`, `contact_email`, `contact_phone` (VARCHAR): Finance department contact.
- `status` (ENUM): Corporate standing (`'active'`, `'inactive'`, `'blacklisted'`).

### 4. `loans`
*Purpose*: Loan facility contracts issued to corporate borrowers.
- `id` (INT, Primary Key): Loan facility identifier.
- `company_id` (INT, Foreign Key ➔ `companies.id`): Borrower company.
- `loan_number` (VARCHAR, Unique): Contract code (e.g., `'LN-2026-001'`).
- `principal_amount` (DECIMAL): Initial principal disbursed in Rupees (₹).
- `interest_rate` (DECIMAL): Annual interest percentage (e.g., `10.50%`).
- `total_payable` (DECIMAL): Total principal + interest scheduled.
- `start_date`, `end_date` (DATE): Term start and completion dates.
- `status` (ENUM): Contract status (`'active'`, `'completed'`, `'defaulted'`, `'cancelled'`).

### 5. `repayment_schedules`
*Purpose*: Monthly EMI installment schedule per loan facility.
- `id` (INT, Primary Key): Installment identifier.
- `loan_id` (INT, Foreign Key ➔ `loans.id`): Parent loan contract.
- `installment_number` (INT): Installment sequence number (1, 2, 3...).
- `due_date` (DATE): Scheduled repayment deadline.
- `scheduled_amount` (DECIMAL): Scheduled EMI payment amount (₹).
- `paid_amount` (DECIMAL): Cumulative paid amount allocated to this installment.
- `status` (ENUM): Payment state (`'pending'`, `'partially_paid'`, `'paid'`, `'overdue'`, `'cancelled'`).

### 6. `payments`
*Purpose*: Raw incoming bank deposits and payment transaction feed.
- `id` (INT, Primary Key): Payment transaction ID.
- `transaction_id` (VARCHAR, Unique): Bank UTR / Transaction reference code.
- `amount` (DECIMAL): Gross deposit amount received in bank (₹).
- `payment_date` (DATE): Deposit timestamp.
- `sender_name` (VARCHAR): Name on bank transfer.
- `sender_account` (VARCHAR): Bank account number from which payment originated.
- `reference` (VARCHAR): Remittance reference text (e.g., `'EMI-AUG-2026'`).
- `source` (ENUM): Channel (`'api'`, `'manual'`, `'bank_import'`, `'excel_upload'`).
- `status` (ENUM): Case matching state (`'unmatched'`, `'processing'`, `'pending'`, `'completed'`, `'rejected'`).

### 7. `reconciliation_cases`
*Purpose*: Investigation cases created per un-reconciled bank deposit.
- `id` (INT, Primary Key): Case identifier.
- `payment_id` (INT, Foreign Key ➔ `payments.id`): Unmatched bank deposit.
- `assigned_to` (INT, Foreign Key ➔ `users.id`): Assigned accountant.
- `status` (ENUM): Lifecycle state (`'open'`, `'ai_processing'`, `'pending_review'`, `'approved'`, `'rejected'`, `'resolved'`).
- `priority` (ENUM): Case urgency (`'low'`, `'medium'`, `'high'`, `'critical'`).
- `resolution_reason` (TEXT): Auditor explanation upon closing case.

### 8. `ai_recommendations`
*Purpose*: Candidate match predictions output by Groq Agent 1 (Payment Reconciliation).
- `id` (INT, Primary Key): Recommendation identifier.
- `reconciliation_case_id` (INT, Foreign Key ➔ `reconciliation_cases.id`): Parent case.
- `recommended_company_id` (INT, Foreign Key ➔ `companies.id`): AI matched company.
- `recommended_loan_id` (INT, Foreign Key ➔ `loans.id`): AI matched loan facility.
- `recommended_schedule_id` (INT, Foreign Key ➔ `repayment_schedules.id`): AI matched installment.
- `confidence_score` (DECIMAL): Groq LLM match confidence percentage (e.g., `98.50%`).
- `reasoning` (TEXT): Natural language explanation of fuzzy match criteria.
- `status` (ENUM): Review state (`'pending'`, `'approved'`, `'rejected'`, `'overridden'`).

### 9. `payment_allocations`
*Purpose*: Official financial ledger allocations created strictly upon human approval.
- `id` (INT, Primary Key): Allocation ledger entry ID.
- `payment_id` (INT, Foreign Key ➔ `payments.id`): Source bank deposit.
- `repayment_schedule_id` (INT, Foreign Key ➔ `repayment_schedules.id`): Destination installment.
- `allocated_amount` (DECIMAL): Amount settled against installment (₹).
- `approved_by` (INT, Foreign Key ➔ `users.id`): Senior Accountant user who approved settlement.
- `allocation_type` (ENUM): Approval mode (`'ai_approved'`, `'manual'`, `'ai_overridden'`, `'overpayment'`).

### 10. `documents`
*Purpose*: Metadata for uploaded contracts, invoices, and bank statements.
- `id` (INT, Primary Key): Document ID.
- `company_id`, `payment_id` (INT, Nullable): Linked company or payment.
- `document_type` (ENUM): Type (`'bank_statement'`, `'payment_proof'`, `'invoice'`, `'loan_agreement'`, `'company_document'`).
- `file_name`, `file_url` (VARCHAR): Storage filepath or URL.
- `storage_provider` (ENUM): Engine (`'local'`, `'s3'`, `'gcs'`).
- `mime_type` (VARCHAR): File MIME type (`application/pdf`, `image/png`).
- `uploaded_by` (INT, Foreign Key ➔ `users.id`): User who uploaded file.

### 11. `audit_logs`
*Purpose*: Immutable compliance log tracking WHO, WHAT, WHEN, and state diffs.
- `id` (BIGINT, Primary Key): Audit log ID.
- `user_id` (INT, Foreign Key ➔ `users.id`): User who performed operation.
- `action` (VARCHAR): Operation code (e.g., `'APPROVE_RECONCILIATION_RECOMMENDATION'`).
- `entity_type`, `entity_id`: Target entity name and primary key.
- `old_values`, `new_values` (JSON): Before & after state snapshot diffs.
- `ip_address` (VARCHAR): Client IP address.

### 12. `notifications`
*Purpose*: In-app task queue and user notification alerts.
- `id` (BIGINT, Primary Key): Notification ID.
- `user_id` (INT, Foreign Key ➔ `users.id`): Recipient user.
- `type`, `title`, `message` (VARCHAR/TEXT): Alert title and message body.
- `is_read` (BOOLEAN): Read status (`TRUE`/`FALSE`).

### 13. `agent_runs`
*Purpose*: Operational telemetry for all 6 AI agents.
- `id` (INT, Primary Key): Agent execution run ID.
- `agent_id` (VARCHAR): Agent code (e.g., `'agent_1_reconciliation'`, `'agent_2_risk'`).
- `trigger_type` (ENUM): Trigger mode (`'manual'`, `'automated'`, `'event'`).
- `status` (ENUM): Execution state (`'running'`, `'completed'`, `'failed'`).
- `ai_model_used` (VARCHAR): Groq LLM model (`'qwen/qwen3.6-27b'`).
- `total_tokens` (INT): Total Groq API tokens consumed.
- `confidence_score` (DECIMAL): Overall run confidence %.

### 14. `agent_execution_logs`
*Purpose*: Step-by-step tool invocation traces for AI transparency.
- `id` (INT, Primary Key): Step log ID.
- `agent_run_id` (INT, Foreign Key ➔ `agent_runs.id`): Parent run.
- `step_number` (INT): Sequence step number (1, 2, 3...).
- `tool_called` (VARCHAR): Tool function executed (e.g., `'getPaymentDetails'`).
- `tool_input`, `tool_output` (JSON): Tool call input arguments and return data.
- `reasoning` (TEXT): LLM reasoning prompt.

### 15. `portfolio_snapshots`
*Purpose*: Macroeconomic health reports generated by Agent 5 (Portfolio Intelligence).
- `id` (INT, Primary Key): Snapshot ID.
- `snapshot_date` (DATE): Snapshot timestamp.
- `total_principal_exposure` (DECIMAL): Total portfolio principal (₹).
- `active_loans_count` (INT): Count of active borrowing facilities.
- `total_overdue_amount` (DECIMAL): Total past-due delinquent balance (₹).
- `collection_rate_percentage` (DECIMAL): Collection efficiency rate.
- `executive_summary` (TEXT): Groq LLM macroeconomic analysis text.

### 16. `notification_alerts`
*Purpose*: SLA breach escalation notices generated by Agent 6.
- `id` (INT, Primary Key): Alert ID.
- `company_id` (INT, Foreign Key ➔ `companies.id`): Delinquent borrower.
- `severity` (ENUM): Urgency (`'CRITICAL'`, `'HIGH'`, `'MEDIUM'`, `'LOW'`).
- `escalation_level` (ENUM): Recipient tier (`'accountant'`, `'manager'`, `'executive'`).
- `title`, `ai_reasoning` (VARCHAR/TEXT): Alert title and reasoning text.
- `outstanding_amount` (DECIMAL): Past-due exposure (₹).
- `overdue_days` (INT): Number of days overdue (e.g., `70`).
- `notification_status` (ENUM): Review state (`'pending'`, `'approved'`, `'dismissed'`).

### 17. `user_settings`
*Purpose*: Key-value configuration store for user and system preferences.
- `id` (INT, Primary Key): Setting ID.
- `user_id` (INT, Foreign Key ➔ `users.id`, Nullable): User or system scope.
- `setting_key` (VARCHAR): Key name (e.g., `'confidence_threshold'`).
- `setting_value` (VARCHAR): Setting value (e.g., `'85'`).
- `setting_scope` (ENUM): Scope (`'user'`, `'system'`).

### 18. `assistant_action_proposals`
*Purpose*: Human-in-the-Loop action proposals generated by AI Copilot tool calls.
- `id` (VARCHAR, Primary Key): Proposal code (e.g., `'ACT-000123'`).
- `action_type` (ENUM): Action category (`'FLAG_CASE'`, `'ADD_CASE_NOTE'`, `'TRIGGER_REANALYSIS'`, `'ESCALATE_ALERT'`).
- `target_entity`, `target_id`: Entity type (`'reconciliation_case'`) and primary key.
- `requested_params` (JSON): Parameters requested by AI for mutation.
- `proposal_reason` (TEXT): Justification generated by AI.
- `status` (ENUM): Lifecycle state (`'pending_confirmation'`, `'executed'`, `'dismissed'`, `'expired'`, `'failed'`).
- `expires_at` (TIMESTAMP): Expiration deadline (15 minutes).
