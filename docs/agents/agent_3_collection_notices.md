# Agent 3: Autonomous Collections & Multi-Tier Notice Generator Agent

---

## 1. Executive Summary
The **Autonomous Collections & Multi-Tier Notice Generator Agent** (`agent_3_collection`) is the automated borrower communication, dunning, and debt cure management engine of FinanceFlow AI. It evaluates overdue installments, delinquency severity, and borrower risk status to generate compliant, context-aware debt collection notices across 3 distinct escalation tiers.

* **System ID**: `agent_3_collection`
* **Agent Role**: Intelligent Delinquency Resolution & Communication Generator
* **Execution Model**: Context-Aware Letter Drafting + Communication Tier Escalation + Human Approval Transmission

```
   ┌──────────────────────┐
   │ Borrower Profile ID  │
   └──────────┬───────────┘
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Overdue Evaluation:                                       │
   │  - Days Past Due (DPD)                                    │
   │  - Total Delinquent Amount & Penalty Interest             │
   │  - Borrower Contact Details (Email, Person, Address)      │
   └──────────┬────────────────────────────────────────────────┘
              │
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Escalation Tier Selection Engine:                         │
   │  - Tier 1: Friendly Reminder (1 - 15 DPD)                 │
   │  - Tier 2: Formal Demand Notice (16 - 45 DPD)             │
   │  - Tier 3: Pre-Legal Statutory Notice (45+ DPD)           │
   └──────────┬────────────────────────────────────────────────┘
              │
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Groq LLM Drafting (llama-3.3-70b-versatile):              │
   │  - Formal Subject Line & Case Reference ID                │
   │  - Itemized Overdue Schedules Table                       │
   │  - Statutory Compliance Language (Sec 138 / SARFAESI)     │
   │  - Instant Settlement Links & Bank Remittance Instructions│
   └──────────┬────────────────────────────────────────────────┘
              │
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Staged in UI Modal -> Human Approval -> Dispatched        │
   └───────────────────────────────────────────────────────────┘
```

---

## 2. Problem Solved & Business Use Case
Debt collection teams struggle with:
1. **Generic Templates**: Sending aggressive legal threats to reliable clients with minor 2-day bank transfer delays destroys borrower relationships.
2. **Delayed Escalation**: Sending soft reminders to habitual defaulters past 60 days causes severe balance write-offs.
3. **Regulatory Non-Compliance**: Unstructured notices that fail to document exact interest surcharges or statutory cure windows violate consumer finance and RBI/Fair Practices Code regulations.
* **Agent 3 Solution**: Automatically selects the exact appropriate tone and legal framework based on mathematical overdue metrics, drafts structured correspondence, and queues it for one-click human sign-off.

---

## 3. Technical Configuration & Parameters
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
* **Temperature**: `0.3` (Authoritative, legally structured drafting)
* **Max Tokens**: `2,048`
* **System Prompt**: `COLLECTION_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/collection.prompt.js`

### Multi-Tier Escalation Framework
| Escalation Tier | Overdue Threshold | Tone & Legal Weight | Key Contents & Clauses |
| :--- | :--- | :--- | :--- |
| **Tier 1: Reminder** | $1 - 15 \text{ DPD}$ | Courteous, helpful | Account summary, UPI/NEFT payment link, request for remittance advice. |
| **Tier 2: Formal Demand** | $16 - 45 \text{ DPD}$ | Firm, urgent | Notice of late penalty surcharge ($2.0\%$ p.a.), credit bureau reporting warning (CIBIL/Equifax). |
| **Tier 3: Pre-Legal Notice** | $45+ \text{ DPD}$ | Severe, statutory | 7-day cure window, reference to Section 138 Negotiable Instruments Act / SARFAESI collateral enforcement, legal escalation warning. |

---

## 4. Database Schema & Data Dependencies

```
  ┌───────────────────────┐          ┌───────────────────────┐
  │       companies       ├─────────►│  collection_notices   │
  └───────────┬───────────┘          └───────────────────────┘
              │                                 ▲
              ▼                                 │
  ┌───────────────────────┐                     │
  │  repayment_schedules  ├─────────────────────┘
  └───────────────────────┘
```

### Table Schema Mappings
* **`companies`**: `id`, `company_name`, `contact_name`, `contact_email`, `address`, `bank_account_number`.
* **`repayment_schedules`**: `id`, `loan_id`, `installment_number`, `due_date`, `scheduled_amount`, `paid_amount`, `status`.
* **`collection_notices`**: `id`, `company_id`, `loan_id`, `notice_tier` (`'TIER_1'`, `'TIER_2'`, `'TIER_3'`), `subject`, `body_content`, `status` (`'drafted'`, `'approved'`, `'sent'`), `created_at`, `sent_at`.

---

## 5. Execution Lifecycle & Human Approval Flow
1. `TRIGGER`: User clicks **`[Collection]`** button on Company List or Risk Drawer, or automated background batch executes.
2. `FETCH_OVERDUE_SCHEDULES`: Ingests delinquent records for borrower.
3. `TIER_DETERMINATION`: Computes maximum DPD and selects appropriate notice template tier.
4. `GROQ_LETTER_SYNTHESIS`: Drafts personalized email letter.
5. `MODAL_PRESENTATION`: Displays preview in `CollectionReminderModal.jsx` allowing the human officer to review, edit, or customize before sending.
6. `DISPATCH_AND_LOG`: Inserts record in `collection_notices` and updates audit log.

---

## 6. Comprehensive Test Cases & Scenarios

| Test ID | Scenario | Input Borrower Data | Expected Generated Communication | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **TC-3.1** | Tier 1 Friendly Reminder | Borrower with 5 days overdue installment | Subject: `Payment Reminder: Upcoming Installment #2 for {Company}`. Tone: Courteous, includes payment coordinates. | Check Collection Modal in UI. |
| **TC-3.2** | Tier 2 Formal Demand Notice | Borrower with 25 days overdue installment | Subject: `URGENT DEMAND NOTICE: Overdue Loan Repayment — 25 Days Past Due`. Includes penalty clause. | Inspect drafted body text. |
| **TC-3.3** | Tier 3 Pre-Legal Final Notice | `Apex Logistics Pvt Ltd` (70+ days overdue) | Subject: `FINAL STATUTORY NOTICE BEFORE LEGAL ACTION — 70 Days Delinquency`. Cites 7-day cure window and Section 138 remedies. | Verify Pre-Legal notice draft. |
| **TC-3.4** | Clean Borrower Safeguard | Borrower with 0 overdue installments | Returns informative message: `"No overdue installments found for this company. Collection notice is not required."` | Test with Company #1 (`ABC Tech`). |
| **TC-3.5** | Multi-Installment Itemization | Borrower with 3 overdue milestones | Accurately generates tabular list of all 3 unpaid installments with cumulative total in email body. | Inspect table format in preview. |
