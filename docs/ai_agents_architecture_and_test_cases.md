Agent 1 → What payment is this?
Agent 7 → Is this payment unusual?
Agent 2 → How risky is this loan?
Agent 3 → What collection action is needed?
Agent 4 → What does this document contain?
Agent 5 → How is the entire portfolio performing?
Agent 6 → Who needs to be notified/escalated?

# FinanceFlow AI — Multi-Agent System Architecture & Assessment Specification

---

## Executive Overview

**FinanceFlow AI** is an enterprise-grade agentic financial operating platform designed for non-banking financial companies (NBFCs), debt syndicates, and corporate loan service desks. It automates high-volume bank statement reconciliation, credit risk surveillance, borrower communications, document OCR, portfolio concentration analytics, and executive escalation governance.

The platform orchestrates **7 Autonomous AI Operational Agents** alongside a **Copilot Conversational Assistant**, combining deterministic SQL/financial math engines with Groq-powered large language models (**`llama-3.3-70b-versatile`** and **`qwen-2.5-32b`**) for human-in-the-loop agentic workflows.

```
                                  ┌──────────────────────────────────────────────┐
                                  │      FinanceFlow AI Orchestration Core       │
                                  └──────────────────────┬───────────────────────┘
                                                         │
         ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┬───────────────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼                   ▼                   ▼                   ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────┐
   │  AGENT 1  │       │  AGENT 7  │       │  AGENT 2  │       │  AGENT 3  │       │  AGENT 4  │       │  AGENT 5  │       │  AGENT 6  │
   │Reconcile &│       │Transaction│       │Credit Risk│       │Collection │       │ Document  │       │ Portfolio │       │Escalation │
   │ Matching  │       │  Anomaly  │       │  & EWS    │       │ & Notices │       │ Extraction│       │ Analytics │       │Governance │
   └───────────┘       └───────────┘       └───────────┘       └───────────┘       └───────────┘       └───────────┘       └───────────┘
```

---

# Table of Contents

1. [Agent 1: Payment Reconciliation & Ledger Settlement Agent](#agent-1-payment-reconciliation--ledger-settlement-agent)
2. [Agent 7: Financial Transaction Anomaly Detection Agent](#agent-7-financial-transaction-anomaly-detection-agent)
3. [Agent 2: Credit Risk Assessment & Early Warning Surveillance (EWS) Agent](#agent-2-credit-risk-assessment--early-warning-surveillance-ews-agent)
4. [Agent 3: Autonomous Collections & Multi-Tier Notice Generator Agent](#agent-3-autonomous-collections--multi-tier-notice-generator-agent)
5. [Agent 4: Financial Document Extraction & OCR Parsing Agent](#agent-4-financial-document-extraction--ocr-parsing-agent)
6. [Agent 5: Portfolio Health & Concentration Risk Analytics Agent](#agent-5-portfolio-health--concentration-risk-analytics-agent)
7. [Agent 6: Notification & SLA Escalation Governance Agent](#agent-6-notification--sla-escalation-governance-agent)
8. [AI Copilot: Conversational Natural Language Assistant](#ai-copilot-conversational-natural-language-assistant)
9. [Multi-Agent Pipeline Orchestration Architecture](#multi-agent-pipeline-orchestration-architecture)
10. [Comprehensive Test Scenarios & Assessment Matrix](#comprehensive-test-scenarios--assessment-matrix)

---

# Agent 1: Payment Reconciliation & Ledger Settlement Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_1_reconciliation`
- **Agent Role**: Autonomous Bank Deposit Matcher & Financial Settlement Engine
- **Execution Paradigm**: Hybrid Deterministic Matching + LLM Semantic Disambiguation + Human-in-the-Loop Approval

### 2. Business Problem Solved

In corporate lending, thousands of bank statement line items arrive daily with truncated narration (e.g. `NEFT-AXIS-009827-APX-CORP`), unlinked virtual accounts, partial amounts, or split bulk payments. Human accountants spend 4–8 hours manually matching payments against schedules, leading to delayed ledger updates and compliance breaches.
**Agent 1 solves this** by executing multi-tier deterministic matching (fuzzy company name, account number, amount, invoice ref), analyzing unmatched deposits with LLM reasoning, allocating payments across repayment schedules (FIFO principle), and maintaining ledger audit rollbacks.

### 3. Technical Configuration

- **LLM Engine**: Groq API (`llama-3.3-70b-versatile` / `qwen-2.5-32b`)
- **Temperature**: `0.1` (Strict, deterministic financial reasoning)
- **Max Tokens**: `2,048`
- **Lock Key**: `RECON_PAYMENT_{payment_id}` (prevents double settlement race conditions)
- **System Prompt**: `RECONCILIATION_AGENT_SYSTEM_PROMPT`
- **Tools Used**:
  - `findBorrowingCompanyByAccount`: Looks up company by bank account number.
  - `searchBorrowingCompaniesByName`: Fuzzy search across registered corporate names.
  - `findActiveLoans`: Retrieves open loans and pending repayment schedules.
  - `calculateScheduleAllocations`: Computes FIFO installment principal & interest allocations.

### 4. Data Sources & Schema Dependencies

| Table                  | Columns Used                                                                                       | Operation       |
| :--------------------- | :------------------------------------------------------------------------------------------------- | :-------------- |
| `payments`             | `id`, `amount`, `payment_date`, `sender_name`, `sender_account_number`, `bank_reference`, `status` | READ / UPDATE   |
| `companies`            | `id`, `company_name`, `bank_account_number`, `registration_number`, `tax_identifier`               | READ            |
| `loans`                | `id`, `company_id`, `loan_number`, `principal_amount`, `total_payable`, `status`                   | READ            |
| `repayment_schedules`  | `id`, `loan_id`, `installment_number`, `due_date`, `scheduled_amount`, `paid_amount`, `status`     | READ / UPDATE   |
| `reconciliation_cases` | `id`, `payment_id`, `company_id`, `loan_id`, `status`, `ai_confidence_score`, `ai_reasoning`       | INSERT / UPDATE |
| `payment_allocations`  | `id`, `case_id`, `schedule_id`, `allocated_amount`, `allocation_type`                              | INSERT / DELETE |

### 5. Detailed Execution Flow

```mermaid
sequenceDiagram
    participant B as Bank Statement / UI
    participant A1 as Agent 1 (Reconciliation)
    participant DB as TiDB Cloud Database
    participant H as Human Accountant

    B->>A1: Ingest Unmatched Payment (amount, sender, narration)
    A1->>DB: Query exact account match & fuzzy name match
    A1->>DB: Fetch active loan repayment schedules (FIFO)
    A1->>A1: Calculate Confidence Score (0-100%)
    alt Confidence >= 85% & Exact Match
        A1->>DB: Create Auto-Match Recommendation
    else Ambiguous or Partial Amount
        A1->>A1: Groq LLM Disambiguation (Reasoning + Suggestion)
        A1->>DB: Save Case with Status: 'pending_review'
    end
    H->>A1: Click [Approve] / [Reject] / [Override]
    A1->>DB: Atomic Ledger Mutation (Update schedules, payments, allocations)
```

### 6. Test Cases & Verification Scenarios

- **Scenario 1.1 (Exact Account & Amount Match)**:
  - _Input_: Deposit `₹2,24,000.00`, Sender Account: `987654321098` (XYZ Logistics).
  - _Expected Output_: Confidence `98%`, Matches Installment #2 of Loan `LN-2026-002`. Status: `approved` upon human click.
- **Scenario 1.2 (Narration Truncation & Fuzzy Match)**:
  - _Input_: Deposit `₹1,58,200.00`, Sender: `METRO COLD VASHI`, Account: `Unlisted`.
  - _Expected Output_: Fuzzy match to `Metro Cold Storage Networks` (#18), Confidence `88%`, AI reasoning notes matching location and installment amount.
- **Scenario 1.3 (Full Financial Ledger Rollback on Reject)**:
  - _Action_: User clicks [Reject] on an approved case.
  - _Expected Output_: `repayment_schedules.paid_amount` reversed to previous state, `payment_allocations` deleted, `payments.status` set to `'unmatched'`.

---

# Agent 7: Financial Transaction Anomaly Detection Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_7_anomaly`
- **Agent Role**: Autonomous Payment Anomaly Detector & Behavioral Fraud Signal Layer
- **Execution Paradigm**: Two-Stage Detection (Stage A: Pre-Match + Stage B: Post-Match) + Deterministic Scoring Math + Groq Contextual Explainer
- **Strict Boundary**: **READ-ONLY**. Does NOT instruct or execute money movement. Waterfall Settlement Engine remains the sole authority for ledger changes.

### 2. Business Problem Solved

Payment operations encounter transactions with abnormal amounts (e.g. 7× regular EMI), duplicate deposits submitted within hours, payments from unlisted third-party bank accounts, or repeated partial installments indicating borrower distress. Without early anomaly signals, erroneous settlements or suspicious payments get posted to the loan ledger before investigation.
**Agent 7 solves this** by calculating an explainable composite **Anomaly Score (0–100)** with deterministic breakdown across 6 financial checks, classifying severity (`CLEAR`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and generating a human-readable AI explanation for operations teams.

### 3. Technical Configuration

- **LLM Engine**: Groq API (`llama-3.3-70b-versatile` / `qwen-2.5-32b`)
- **Temperature**: `0.15` (Deterministic explanation, zero hallucination)
- **Scoring Engine**: 100% Pure Deterministic Math (Groq explains findings, does NOT score)
- **Lock Key**: `agent_7_anomaly_stageA_{payment_id}` / `agent_7_anomaly_stageB_{payment_id}`
- **System Prompt**: `ANOMALY_AGENT_SYSTEM_PROMPT`
- **Tools Used**:
  - `checkDuplicateFingerprint`: Checks for amount + date ±1 day duplicate deposits.
  - `getKnownPayerAccounts`: Verifies sender account against registered company master.
  - `getTotalOutstandingBalance`: Computes total open exposure across all milestones.
  - `getExpectedEMI`: Fetches next scheduled installment amount.
  - `getPaymentHistory`: Fetches time-series payment cadence for timing & partial pattern analysis.

### 4. Data Sources & Schema Dependencies

| Table | Columns Used | Operation |
| :--- | :--- | :--- |
| `payments` | `id`, `amount`, `payment_date`, `sender_name`, `sender_account`, `transaction_id`, `status` | READ |
| `companies` | `id`, `company_name`, `bank_account_number`, `registration_number` | READ |
| `loans` | `id`, `loan_number`, `principal_amount`, `status` | READ |
| `repayment_schedules` | `id`, `scheduled_amount`, `paid_amount`, `due_date`, `status` | READ |
| `payment_anomalies` | `id`, `payment_id`, `case_id`, `company_id`, `loan_id`, `anomaly_detected`, `anomaly_types`, `anomaly_score`, `deterministic_score`, `score_breakdown`, `severity`, `explanation`, `recommendation`, `safe_to_proceed`, `status`, `dismiss_reason`, `reviewed_by`, `reviewed_at` | INSERT / UPDATE |

### 5. Detailed Execution Flow

```mermaid
sequenceDiagram
    participant P as Payment Ingestion
    participant A1 as Agent 1 (Reconciliation)
    participant A7 as Agent 7 (Anomaly Detector)
    participant H as Human Reviewer
    participant W as Waterfall Settlement Engine

    P->>A7: Stage A Check (Pre-match: duplicate, unknown payer)
    P->>A1: Reconcile Payment (Find borrower company & loan)
    A1-->>A7: Matched Company & Loan Context
    A7->>A7: Stage B Check (Amount vs total overdue, partial trend, timing)
    A7->>A7: Calculate Deterministic Anomaly Score (0-100) & Severity
    alt Score < 20 (CLEAR)
        A7->>W: Safe to proceed → Automated Waterfall Allocation
    else Score >= 20 (LOW / MEDIUM / HIGH / CRITICAL)
        A7->>H: Flag Anomaly + Explain in UI Control Center
        H->>W: Approve & Release to Waterfall OR Dismiss
    end
```

### 6. Test Cases & Verification Scenarios

- **Scenario 7.1 (Standard Expected Payment)**:
  - _Input_: Deposit `₹1,10,000.00`, Sender Account: `123456789012` (ABC Technologies).
  - _Expected Output_: Anomaly Score: `0–15`, Severity: `CLEAR`, Safe to Proceed: `true`.
- **Scenario 7.2 (Unknown Third-Party Account)**:
  - _Input_: Deposit `₹1,10,000.00`, Sender Account: `999999999999` (Unregistered).
  - _Expected Output_: `UNKNOWN_PAYER` flag, Score: `30+`, Severity: `LOW/MEDIUM`, AI Explanation highlights account discrepancy.
- **Scenario 7.3 (Near-Instant Duplicate Deposit)**:
  - _Input_: Identical deposit `₹85,000.00` from same company within same date window.
  - _Expected Output_: `DUPLICATE_PAYMENT` flag, Score: `30+`, Severity: `MEDIUM/HIGH`.
- **Scenario 7.4 (Smart Multi-Installment Payment vs True Overpayment)**:
  - _Input A_: Deposit `₹4,00,000.00` against `₹6,60,000.00` total overdue balance across 6 installments $\rightarrow$ Anomaly: `CLEAR` (Valid multi-installment clearance).
  - _Input B_: Deposit `₹2,50,00,000.00` on a loan with total outstanding `₹15,00,000.00` $\rightarrow$ `AMOUNT_ANOMALY` + `OVERPAYMENT` (Excess routed to unallocated credit).

---

# Agent 2: Credit Risk Assessment & Early Warning Surveillance (EWS) Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_2_risk`
- **Agent Role**: Autonomous Borrower Risk Profiler & Default Predictor
- **Execution Paradigm**: Multi-Tool Data Retrieval + Financial Ratio Analysis + Probability of Default (PD) Modeling

### 2. Business Problem Solved

Lenders discover defaults only after checks bounce or EMIs are 90+ days delinquent. Early warning indicators (deteriorating repayment cadence, high utilization, sector headwinds, multiple partial payments) are buried across spreadsheets.
**Agent 2 solves this** by calculating real-time delinquency metrics, debt service coverage indicators, historical bounce rates, and generating an AI Risk Grade (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with Probability of Default (PD %) and credit mitigation actions.

### 3. Technical Configuration

- **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
- **Temperature**: `0.2`
- **System Prompt**: `RISK_AGENT_SYSTEM_PROMPT`
- **Tools Used**:
  - `getCompanyFinancials`: Fetches borrowing volume, active facilities, tenure.
  - `getRepaymentHistory`: Calculates on-time payment ratio, average days late, overdue installments.
  - `getRecentAuditEvents`: Checks for suspicious reallocations or covenant breaches.

### 4. Data Sources & Schema Dependencies

| Table                 | Columns Used                                                                                                 |
| :-------------------- | :----------------------------------------------------------------------------------------------------------- |
| `companies`           | `id`, `company_name`, `registration_number`, `status`                                                        |
| `loans`               | `id`, `principal_amount`, `interest_rate`, `total_payable`, `start_date`, `end_date`, `status`               |
| `repayment_schedules` | `due_date`, `scheduled_amount`, `paid_amount`, `status`                                                      |
| `risk_assessments`    | `id`, `company_id`, `risk_score`, `risk_level`, `probability_of_default`, `ai_analysis_report`, `created_at` |

### 5. Detailed Test Scenarios

- **Scenario 2.1 (Pristine Borrower Assessment)**:
  - _Borrower_: `ABC Technologies Pvt Ltd` (All EMIs paid on time, 0 days overdue).
  - _Expected Output_: Risk Level: `LOW`, Risk Score: `12/100`, PD: `2.4%`, Recommendation: `"Approved for credit limit expansion"`.
- **Scenario 2.2 (High-Risk Delinquency Breach)**:
  - _Borrower_: `Apex Logistics Pvt Ltd` (3 consecutive overdue installments, 70+ days past due).
  - _Expected Output_: Risk Level: `CRITICAL`, Risk Score: `88/100`, PD: `78.4%`, Recommendation: `"Issue legal notice under Sec 138, freeze credit facility"`.

---

# Agent 3: Autonomous Collections & Multi-Tier Notice Generator Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_3_collection`
- **Agent Role**: Intelligent Delinquency Resolution & Communication Agent
- **Execution Paradigm**: Context-Aware Letter Drafting + Communication Tier Escalation

### 2. Business Problem Solved

Traditional collection emails are generic, easily ignored, or sent with the wrong tone, violating regulatory compliance or failing to offer restructuring alternatives for distressed but viable businesses.
**Agent 3 solves this** by evaluating the borrower's risk profile and delinquency days to automatically draft tailored, legally structured communications across **3 Escalation Tiers**:

1. **Tier 1 (Friendly Reminder)**: 1–15 days overdue. Polite notice with quick UPI/NEFT repayment instructions.
2. **Tier 2 (Formal Demand Notice)**: 16–45 days overdue. Formal notice of penalty interest surcharge and credit rating impact.
3. **Tier 3 (Pre-Legal Final Notice)**: 45+ days overdue. Statutory notice citing contract clauses, collateral enforcement, and legal remedies.

### 3. Technical Configuration

- **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
- **Temperature**: `0.3` (Professional, authoritative legal drafting)
- **System Prompt**: `COLLECTION_AGENT_SYSTEM_PROMPT`
- **Tools Used**:
  - `getOverdueInstallments`: Retrieves overdue schedules, penalty days, outstanding balance.
  - `getBorrowerContact`: Fetches primary finance contact, email, registered address.

### 4. Data Sources & Schema Dependencies

| Table                 | Columns Used                                                                      |
| :-------------------- | :-------------------------------------------------------------------------------- |
| `repayment_schedules` | `installment_number`, `due_date`, `scheduled_amount`, `paid_amount`, `status`     |
| `companies`           | `company_name`, `contact_name`, `contact_email`, `address`                        |
| `collection_notices`  | `id`, `company_id`, `notice_tier`, `subject`, `body_content`, `status`, `sent_at` |

---

# Agent 4: Financial Document Extraction & OCR Parsing Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_4_document`
- **Agent Role**: Multimodal Bank Statement & Invoice Parser
- **Execution Paradigm**: Document Vision / Text Ingestion + Structured JSON Schema Extraction

### 2. Business Problem Solved

Borrowers upload bank statements, GST invoices, and sanction letters in varied PDF/image formats. Manual data entry is slow, prone to transposition errors, and creates massive reconciliation backlogs.
**Agent 4 solves this** by extracting bank account numbers, IFSC codes, transaction timestamps, credit/debit amounts, UTR references, and invoice metadata directly into normalized schema records.

### 3. Technical Configuration

- **LLM Engine**: Groq Multimodal / Vision API or structured Qwen tokenizer
- **Output Format**: Enforced JSON schema with validation gates.
- **Tools Used**:
  - `validateExtractedFields`: Verifies checksums, account numbers, and currency balances.
  - `stageIngestedPayments`: Inserts extracted records into `payments` table for Agent 1 processing.

---

# Agent 5: Portfolio Health & Concentration Risk Analytics Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_5_portfolio`
- **Agent Role**: Macro Portfolio Risk Analyst & Concentration Surveillance Engine
- **Execution Paradigm**: Deterministic SQL Financial Aggregation + Groq Macro Interpretation

### 2. Business Problem Solved

Executive leadership and risk committees need continuous portfolio visibility: delinquency rates, top-borrower concentration risk, industry sector exposure, and collection efficiency. Generating these reports manually takes days.
**Agent 5 solves this** by computing full portfolio aggregations across all loans and repayment schedules in real-time, assigning a **Portfolio Health Grade** (`EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `CRITICAL`), and generating macro commentary for CROs and CFOs.

### 3. Technical Configuration

- **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
- **Execution Frequency**: Triggered on demand or recurring background schedule.
- **Data Stored In**: `portfolio_snapshots` table.
- **Computed Metrics**:
  - `total_portfolio_principal`: Sum of all active loan principals.
  - `total_overdue_amount`: Sum of all unpaid overdue installments.
  - `delinquency_rate`: $(\text{Total Overdue} / \text{Total Portfolio}) \times 100$.
  - `collection_efficiency`: $(\text{Total Amount Collected} / \text{Total Amount Billed}) \times 100$.
  - `top_borrower_concentration`: Percentage of portfolio held by top 3 borrowers.
  - `health_grade` & `health_score` (0–100).

---

# Agent 6: Notification & SLA Escalation Governance Agent

### 1. Identity & System ID

- **Agent Identifier**: `agent_6_notification`
- **Agent Role**: Autonomous SLA Surveillance & Executive Escalation Engine
- **Execution Paradigm**: Deterministic SQL SLA Engine + Groq Contextual Severity Classification + Interactive Draft Dispatch

### 2. Business Problem Solved

When high-value accounts breach 30, 60, or 90-day delinquency milestones, escalations are often delayed in email threads. Management lacks a centralized approval desk to review and dispatch formal notices.
**Agent 6 solves this** by continuously scanning all loans for SLA breaches, assigning severity (`CRITICAL`, `HIGH`, `MEDIUM`), drafting the exact escalation notice, and providing an interactive **Human-in-the-Loop Control Center** to inspect the email and trigger dispatch in 1 click.

### 3. Technical Configuration

- **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
- **Interactive UI**: Expandable cards in `AgentControlCenter.jsx` with full email draft preview and instant `[Approve & Dispatch]` trigger.
- **Data Stored In**: `notification_alerts` table.

---

# AI Copilot: Conversational Natural Language Assistant

### 1. Identity & Capabilities

- **System Prompt**: `ASSISTANT_AGENT_SYSTEM_PROMPT`
- **Role**: Natural language interface across the entire FinanceFlow database.
- **Capabilities**:
  - Answering queries like: _"Which borrowers are more than 30 days overdue?"_
  - Generating ad-hoc summaries: _"Give me the repayment status of XYZ Logistics Corp."_
  - Proposing safe actions with human approval confirmation.

---

# Multi-Agent Pipeline Orchestration Architecture

FinanceFlow AI coordinates its autonomous agents through versioned, transactional multi-agent orchestration pipelines. Rather than executing isolated agent runs, operational teams can trigger composite pipelines with priority queueing and step-by-step observability.

```text
                                PAYMENT
                                   ↓
                             Agent 1
                          Reconciliation
                      "Who does this belong to?"
                                   ↓
                             Agent 7
                        Anomaly Detection
                      "Is this payment unusual?"
                                   ↓
                        Waterfall Settlement
                      "How should money be allocated?"
                                   ↓
                         ┌─────────┴─────────┐
                         ↓                   ↓
                      Agent 2             Agent 3
                   Risk Assessment      Collection
                  "How risky is the       "What collection
                     borrower?"             action?"
                         │                   │
                         └─────────┬─────────┘
                                   ↓
                                Agent 6
                         Notification/
                           Escalation
```

### Supported Multi-Agent Pipelines:

1. **Payment Reconciliation & Risk Pipeline (`RECONCILIATION_AND_RISK`)**:
   - **Sequence**: `Agent 1` (Reconciliation) $\rightarrow$ `Agent 7` (Anomaly Detection) $\rightarrow$ `Waterfall Settlement` $\rightarrow$ `Agent 2` (Credit Risk) $\rightarrow$ `Agent 3` (Collection Notice)
   - **Use Case**: Primary loan servicing workflow triggered on incoming bank deposits.

2. **Portfolio & Escalation Pipeline (`PORTFOLIO_AND_ESCALATION`)**:
   - **Sequence**: `Agent 5` (Portfolio Analytics) $\rightarrow$ `Agent 6` (Escalation & SLA Scanner)
   - **Use Case**: Periodic macro portfolio risk assessment and executive SLA governance.

3. **Full 7-Agent Compliance Pipeline (`END_TO_END_COMPLIANCE`)**:
   - **Sequence**: `Agent 1` $\rightarrow$ `Agent 7` $\rightarrow$ `Agent 2` $\rightarrow$ `Agent 3` $\rightarrow$ `Agent 4` $\rightarrow$ `Agent 5` $\rightarrow$ `Agent 6`
   - **Use Case**: Comprehensive sequential audit across all 7 operational agents for regulatory compliance and periodic portfolio review.

---

# Comprehensive Test Scenarios & Assessment Matrix

| Test ID   | Agent   | Test Scenario Description             | Input Data / Trigger                                            | Expected Outcome                                                                                 | Verification Method                              |
| :-------- | :------ | :------------------------------------ | :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------- |
| **TC-01** | Agent 1 | Clean Auto-Match with FIFO Allocation | Payment #1: `₹1,10,000.00`, Sender: `ABC Technologies`          | Case auto-matched to Loan 1, Installment 2. Status: `approved`.                                  | Check `repayment_schedules.paid_amount` updated. |
| **TC-02** | Agent 1 | Full Reversal & Ledger Rollback       | Click [Reject] on an approved case                              | Schedule paid amount decremented; payment reset to `unmatched`.                                  | Run `backend/src/tests/test_full_lifecycle.js`.  |
| **TC-03** | Agent 2 | Credit Risk Early Warning Profiling   | GET `/api/risk/assess/4` (Apex Logistics)                       | Risk Level: `CRITICAL`, Score: `88/100`, PD: `78.4%`.                                            | Verify risk badge and assessment drawer in UI.   |
| **TC-04** | Agent 3 | Multi-Tier Notice Generation          | GET `/api/collection/generate/4`                                | Generates Tier 3 Pre-Legal Notice with statutory demand clauses.                                 | Verify drafted email text in Collection Modal.   |
| **TC-05** | Agent 4 | PDF / UTR Statement Ingestion         | Ingest bank feed with 5 lines                                   | Extracts 5 normalized payments with timestamps and UTR numbers.                                  | Verify 5 rows staged in `payments` table.        |
| **TC-06** | Agent 5 | Portfolio Concentration Analytics     | POST `/api/portfolio/analyze`                                   | Calculates delinquency rate, top-3 concentration, assigns grade.                                 | Check `portfolio_snapshots` table and UI panel.  |
| **TC-07** | Agent 6 | SLA Escalation Alert Email Preview    | Click alert card in `/agents`                                   | Expands card to reveal full AI-drafted email notice to borrower.                                 | Inspect expanded email preview in UI.            |
| **TC-08** | Agent 6 | Executive Approval & Email Trigger    | Click `[Approve & Dispatch]`                                    | Updates alert to `approved`, triggers email dispatch toast.                                      | Verify toast banner and database `approved_at`.  |
| **TC-09** | Copilot | Natural Language Multi-Entity Query   | Ask: _"What is the outstanding balance of Metro Cold Storage?"_ | Responds with exact principal `₹14,00,000`, EMI `₹1,58,200`, and remaining balance `₹14,23,800`. | Interactive Assistant Chat Drawer.               |
| **TC-10** | System  | Cross-Device Responsive Layout        | View on Mobile (`375px`), Tablet (`768px`), Desktop (`1920px`)  | Tables scroll horizontally, drawers open full width on mobile, no overflows.                     | Browser developer tools device emulator.         |
| **TC-11** | Agent 7 | Unknown Payer & Duplicate Detection   | Ingest payment with unregistered account or duplicate amount    | Anomaly score `30+`, `UNKNOWN_PAYER` / `DUPLICATE_PAYMENT` flag, UI badge displayed.             | Run `backend/src/tests/test_anomaly_agent.js`.   |
| **TC-12** | Agent 7 | Smart Multi-Installment & Overpayment | Payment ₹4L vs ₹6.6L overdue (CLEAR); Payment ₹2.5Cr (OVERPAY)  | Valid multi-installment clears with score < 20; Overpayment flags surplus for unallocated credit.| Run `backend/src/tests/test_anomaly_agent.js`.   |
| **TC-13** | Agent 7 | Human Dismissal with Audit Trail      | PUT `/api/anomaly/:id/dismiss` with dismiss reason               | Sets status to `dismissed`, stores `dismiss_reason`, `reviewed_by`, `reviewed_at`.              | Verify `payment_anomalies` record in database.   |

---

_Documentation Version_: `2.5.0-PROD`  
_Maintained By_: **FinanceFlow AI Core Engineering Team**  
_Repository_: `https://github.com/Yuvan-bharathi/Finance-Flow-Agent`
