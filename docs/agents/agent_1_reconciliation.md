# Agent 1: Payment Reconciliation & Ledger Settlement Agent

---

## 1. Executive Summary
The **Payment Reconciliation & Ledger Settlement Agent** (`agent_1_reconciliation`) is the autonomous financial matching and accounting engine of FinanceFlow AI. It ingests unallocated bank statement credits, matches them against borrowing company accounts and active loan facilities, computes multi-schedule FIFO allocations, and executes ledger mutations under human approval.

* **System ID**: `agent_1_reconciliation`
* **Agent Role**: Autonomous Bank Deposit Matcher & Financial Settlement Engine
* **Execution Model**: Hybrid Deterministic Matching + LLM Semantic Disambiguation + Human-in-the-Loop Approval

```
   ┌──────────────────────┐
   │ Ingested Bank Credit │
   └──────────┬───────────┘
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Deterministic Match Engine:                               │
   │  - Exact Bank Account Match                               │
   │  - Fuzzy Registered Company Name Match                    │
   │  - Invoice / Bank Ref Parse                               │
   │  - Amount & Installment Due Date Match                    │
   └──────────┬────────────────────────────────────────────────┘
              │
         ┌────┴───────────────────────────┐
         ▼                                ▼
┌──────────────────┐            ┌─────────────────────────────┐
│  Exact Match     │            │  Ambiguous / Truncated Match│
│ (Confidence >=85)│            │  (LLM Semantic Analysis)    │
└────────┬─────────┘            └─────────────┬───────────────┘
         │                                    │
         └──────────────────┬─────────────────┘
                            ▼
         ┌─────────────────────────────────────┐
         │ Case Staged in Action Center        │
         │ (Status: 'pending_review')          │
         └──────────────────┬──────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      ┌─────────────────┐       ┌─────────────────┐
      │  Human Approve  │       │  Human Reject   │
      │ (Ledger Settle) │       │ (Ledger Revert) │
      └─────────────────┘       └─────────────────┘
```

---

## 2. Problem Solved & Business Use Case
In commercial lending and NBFC operations, thousands of NEFT, RTGS, IMPS, and NACH payments hit escrow accounts daily. Borrowers often use truncated sender names (e.g. `AXIS-NEFT-APX-CORP`), pay through sister entities, remit partial amounts, or make bulk lump-sum payments covering multiple installments.
* **Manual Bottleneck**: Loan accountants manually cross-reference bank receipts with PDF amortization charts, resulting in delayed ledger settlement, misallocated late penalties, and reconciliation backlogs.
* **Agent 1 Solution**: Automates 95%+ of matches with deterministic fuzzy search and Groq-powered contextual reasoning, calculates exact schedule allocations, and ensures zero-loss ledger consistency with full bidirectional rollback capability.

---

## 3. Technical Configuration & Parameters
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile` / `qwen-2.5-32b`)
* **Temperature**: `0.1` (Strict, deterministic financial parsing)
* **Max Tokens**: `2,048`
* **Concurrency Lock**: `RECON_PAYMENT_{payment_id}` (Prevents duplicate settlement race conditions)
* **System Prompt**: `RECONCILIATION_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/reconciliation.prompt.js`

### Registered Tool Specifications
1. **`findBorrowingCompanyByAccount`**: Searches `companies` table using `sender_account_number`.
2. **`searchBorrowingCompaniesByName`**: Executes fuzzy match using trigram similarity on `company_name`.
3. **`findActiveLoans`**: Retrieves all loans and repayment schedules for a borrower ordered by `due_date ASC` (FIFO).
4. **`calculateScheduleAllocations`**: Computes principal, interest, and partial payment splits across schedules.

---

## 4. Database Schema & Data Dependencies

```
  ┌────────────────┐         ┌──────────────────────┐         ┌───────────────────────┐
  │    payments    │◄────────┤ reconciliation_cases │────────►│  payment_allocations  │
  └────────────────┘         └──────────┬───────────┘         └───────────┬───────────┘
                                        │                                 │
                                        ▼                                 ▼
                             ┌──────────────────────┐         ┌───────────────────────┐
                             │      companies       │         │  repayment_schedules  │
                             └──────────┬───────────┘         └───────────────────────┘
                                        │                                 ▲
                                        ▼                                 │
                             ┌──────────────────────┐                     │
                             │        loans         ├─────────────────────┘
                             └──────────────────────┘
```

### Table Schema Mappings
* **`payments`**: `id`, `amount`, `payment_date`, `sender_name`, `sender_account_number`, `bank_reference`, `status` (`'unmatched'`, `'matched'`, `'partially_matched'`).
* **`reconciliation_cases`**: `id`, `payment_id`, `company_id`, `loan_id`, `status` (`'pending_review'`, `'approved'`, `'resolved'`, `'rejected'`), `ai_confidence_score`, `ai_reasoning`.
* **`repayment_schedules`**: `id`, `loan_id`, `installment_number`, `due_date`, `scheduled_amount`, `paid_amount`, `status` (`'pending'`, `'paid'`, `'partially_paid'`, `'overdue'`).
* **`payment_allocations`**: `id`, `case_id`, `schedule_id`, `allocated_amount`, `allocation_type` (`'ai_recommended'`, `'ai_overridden'`).

---

## 5. Decision Engine & Mathematical Formulations

### FIFO Allocation Algorithm
When a deposit amount $A$ is approved for a loan with schedules $S_1, S_2, \dots, S_n$:
1. For each schedule $S_i$ ordered by `due_date ASC`:
   $$\text{Unpaid Amount } U_i = S_i.\text{scheduled\_amount} - S_i.\text{paid\_amount}$$
2. Amount allocated to $S_i$:
   $$\text{Allocated}_i = \min(A, U_i)$$
3. Update schedule:
   $$S_i.\text{paid\_amount} \leftarrow S_i.\text{paid\_amount} + \text{Allocated}_i$$
   $$S_i.\text{status} \leftarrow \begin{cases} \text{'paid'} & \text{if } S_i.\text{paid\_amount} = S_i.\text{scheduled\_amount} \\ \text{'partially\_paid'} & \text{if } S_i.\text{paid\_amount} < S_i.\text{scheduled\_amount} \end{cases}$$
4. Remaining deposit balance:
   $$A \leftarrow A - \text{Allocated}_i$$
5. Repeat until $A = 0$ or all schedules are satisfied.

### Bidirectional Ledger Reversal (On Reject / Override)
When a case transition is reversed ($Approved \rightarrow Rejected$):
1. For each `payment_allocations` record tied to `case_id`:
   $$S_i.\text{paid\_amount} \leftarrow S_i.\text{paid\_amount} - \text{allocation.allocated\_amount}$$
   $$S_i.\text{status} \leftarrow \begin{cases} \text{'pending'} & \text{if } S_i.\text{paid\_amount} = 0 \land \text{due\_date} \ge \text{NOW}() \\ \text{'overdue'} & \text{if } S_i.\text{paid\_amount} = 0 \land \text{due\_date} < \text{NOW}() \\ \text{'partially\_paid'} & \text{if } S_i.\text{paid\_amount} > 0 \end{cases}$$
2. Delete allocation records: `DELETE FROM payment_allocations WHERE case_id = ?`
3. Reset payment status: `UPDATE payments SET status = 'unmatched' WHERE id = ?`

---

## 6. Execution Lifecycle & Logging
Each run generates audit records in `agent_runs` and `agent_execution_logs`:
1. `RUN_STARTED`: Acquires lock and records trigger payload.
2. `FETCH_PAYMENT_METADATA`: Reads incoming transaction.
3. `DETERMINISTIC_ACCOUNT_LOOKUP`: Queries company records.
4. `SCHEDULE_RECONCILIATION`: Fetches pending installment milestones.
5. `LLM_REASONING` (if ambiguous): Generates confidence score and rationale.
6. `RECOMMENDATION_STAGED`: Emits WebSocket event `CASE_CREATED`.
7. `RUN_COMPLETED`: Records execution duration and token usage.

---

## 7. Comprehensive Test Cases & Scenarios

| Test ID | Scenario | Input Payload | Expected Agent Behavior | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **TC-1.1** | Exact Account & Exact Amount Match | Payment ₹2,24,000, Account `987654321098` | Matches XYZ Logistics Corp (#2) Installment #2 with 98% confidence. Staged as `pending_review`. | Check `/api/reconciliations` response. |
| **TC-1.2** | Fuzzy Narration Disambiguation | Payment ₹1,58,200, Narration `"METRO COLD VASHI"` | Matches Metro Cold Storage Networks (#18) with 88% confidence citing location and installment match. | Action Center drawer AI explanation. |
| **TC-1.3** | Partial Payment Split | Payment ₹1,00,000 against scheduled ₹2,24,000 | Allocates ₹1,00,000 to Installment #2, marks schedule as `partially_paid`. | Inspect `repayment_schedules` paid amount. |
| **TC-1.4** | Over-Payment / Multi-Installment Allocation | Payment ₹4,48,000 against scheduled ₹2,24,000 | Marks Installment #2 as `paid` (₹2,24,000) and Installment #3 as `paid` (₹2,24,000). | Verify 2 rows in `payment_allocations`. |
| **TC-1.5** | Full Ledger Rollback on Reject | Click [Reject] on approved case | Reverses paid amounts on repayment schedules, deletes allocations, sets `payments.status = 'unmatched'`. | Run `backend/src/tests/test_full_lifecycle.js`. |
| **TC-1.6** | Manual Company Reallocation Override | Click [Override] and select Company #3 | Reverses Company #2 schedule, reallocates deposit to Company #3 schedule with type `ai_overridden`. | Check `reconciliation_cases.status = 'resolved'`. |
