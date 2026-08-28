# Agent 6: Notification & SLA Escalation Governance Agent

---

## 1. Executive Summary
The **Notification & SLA Escalation Governance Agent** (`agent_6_notification`) is the automated compliance surveillance, service level agreement (SLA) monitoring, and executive dunning governance engine of FinanceFlow AI. It scans repayment schedules across all borrowing companies to detect SLA delinquency breaches, uses Groq LLM to classify escalation severity and draft formal notice letters, and provides an interactive Human-in-the-Loop desk for one-click notice approval and email dispatch.

* **System ID**: `agent_6_notification`
* **Agent Role**: Autonomous SLA Surveillance & Executive Escalation Governance Engine
* **Execution Model**: Deterministic SQL SLA Engine + Groq Contextual Classifier + Interactive Email Inspection & Approval

```
   ┌───────────────────────────────────────────────────────────┐
   │ Trigger: Manual Run (/agents) OR Daily Scheduled Job     │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Deterministic SLA Breach Engine (Pure SQL):               │
   │  - Scans all borrowing companies & active loan schedules  │
   │  - Computes exact Overdue Days & Outstanding Amount       │
   │  - Filters for past-due milestone breaches                │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Groq LLM Contextual Classification & Email Drafting:      │
   │  - Severity: CRITICAL / HIGH / MEDIUM / LOW               │
   │  - Target Recipient: Finance Director / CFO / Legal Desk  │
   │  - AI Reasoning & Risk Justification                      │
   │  - Full Formal Escalation Email Draft                     │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Stored in `notification_alerts` Table (Status: 'pending') │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Interactive UI Card in `/agents` (Click to Expand Draft)  │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
   ┌───────────────────────────────┐   ┌───────────────────────┐
   │ [⚡ Approve & Dispatch Email] │   │    [Dismiss Alert]    │
   │ - Marks alert 'approved'      │   │ - Marks 'dismissed'   │
   │ - Dispatches formal notice    │   │ - Closes without mail │
   │ - Shows confirmation toast    │   └───────────────────────┘
   └───────────────────────────────┘
```

---

## 2. Problem Solved & Business Use Case
In multi-million dollar corporate debt facilities:
1. **Escalation Gaps**: Delinquencies often linger in operational email chains for weeks before senior management or legal counsel are notified.
2. **Lack of Central Governance**: Without a human-in-the-loop escalation desk, automated systems either spam borrowers with inappropriate threats or fail to document mandatory compliance cure windows.
3. **Audit Trail Deficits**: In court or bankruptcy proceedings, lenders must prove exactly when formal default notices were served.
* **Agent 6 Solution**: Automatically detects breaches, drafts the precise formal legal escalation letter, and presents it in a dedicated control panel where a manager can inspect the full email before triggering transmission with a single click.

---

## 3. Technical Configuration & Parameters
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
* **Temperature**: `0.2` (Strict, authoritative legal communication)
* **Max Tokens**: `2,048`
* **Concurrency Lock**: `NOTIFICATION_SCAN_GLOBAL` (Prevents duplicate concurrent alert creation)
* **System Prompt**: `NOTIFICATION_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/notification.prompt.js`

### Tools Used
* **`getOverdueLoans`**: Deterministic SQL query fetching all companies with active overdue installments.
* **`computeSLABreach`**: Calculates exact overdue days and delinquent amount per borrower.
* **`getCompanyProfile`**: Retrieves registered contact name, email, and facility numbers.

---

## 4. Database Schema & Data Dependencies

```
  ┌───────────────────────┐          ┌───────────────────────────┐
  │       companies       ├─────────►│    notification_alerts    │
  └───────────┬───────────┘          └───────────────────────────┘
              │                                    ▲
              ▼                                    │
  ┌───────────────────────┐                        │
  │  repayment_schedules  ├────────────────────────┘
  └───────────────────────┘
```

### Table Schema Mappings (`notification_alerts`)
* `id`: Primary key ID.
* `agent_run_id`: Linked run ID in `agent_runs`.
* `company_id`: Borrower company foreign key.
* `loan_id`: Active loan contract foreign key.
* `repayment_id`: Specific breached schedule foreign key.
* `severity`: Alert severity (`'CRITICAL'`, `'HIGH'`, `'MEDIUM'`, `'LOW'`).
* `overdue_days`: Integer days past due.
* `outstanding_amount`: Delinquent balance (INR Decimal).
* `recommended_recipient`: Target recipient (`'Finance Director'`, `'Managing Director'`, `'Legal Recovery Team'`).
* `recommended_action`: Required action (e.g. *Issue statutory cure notice under Sec 138*).
* `ai_reasoning`: Contextual explanation from Groq LLM.
* `notification_status`: Workflow status (`'pending'`, `'approved'`, `'dismissed'`).
* `approved_by`: User ID who approved the notice.
* `approved_at`: Exact timestamp of approval and dispatch.

---

## 5. UI Integration & Interactive Email Inspection
In [`AgentControlCenter.jsx`](file:///c:/Users/hemav/OneDrive/Desktop/Yuvan/Week-7/frontend/src/pages/AgentControlCenter.jsx):
1. **Interactive Expandable Cards**: Clicking on any alert card expands the preview to show the full AI-drafted email notice.
2. **Draft Email Header**: Shows `From: risk-alerts@financeflow.ai`, `To: {recipient} <{email}>`, and formal subject line.
3. **Structured Body Preview**: Displays overdue exposure summary, AI risk rationale, mandated cure actions, and 48-hour compliance warning.
4. **Action Trigger**: Clicking **`⚡ Approve & Dispatch Email Now`** calls `PUT /api/notifications/alerts/:id/approve`, marks the alert as approved in the database, displays a green success confirmation toast, and clears the alert from the pending queue.

---

## 6. Comprehensive Test Cases & Scenarios

| Test ID | Scenario | Input Data / Condition | Expected Behavior | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **TC-6.1** | Critical SLA Breach Detection | `Apex Logistics Pvt Ltd` (70+ days overdue) | Generates `CRITICAL` alert with recommended recipient `Finance Director` / `Legal Desk`. | Check `/agents` Active Escalation Alerts panel. |
| **TC-6.2** | High Severity Warning | `BlueOcean Freight Services` (23 days overdue) | Generates `HIGH` severity alert with formal cure notice recommendation. | Inspect alert card severity badge. |
| **TC-6.3** | Interactive Drafted Email Inspection | Click on alert card in UI | Card expands smoothly to reveal full formal email letter draft with borrower details and AI reasoning. | Click alert card in browser. |
| **TC-6.4** | Human Approval & Dispatch Trigger | Click `[⚡ Approve & Dispatch Email Now]` | Status updates to `'approved'` in DB, `approved_at = NOW()`, alert is dismissed, green toast appears. | Inspect database record and UI toast. |
| **TC-6.5** | Alert Dismissal Workflow | Click `[Dismiss]` on an alert | Status updates to `'dismissed'` in DB with audit trail; no email is sent. | Verify `notification_alerts` status. |
| **TC-6.6** | Zero Overdue Clean State | Run escalation scan when all accounts are current | Completes with 0 tokens consumed and logs `"Escalation scan complete — no overdue loans found."` | Inspect execution log entry. |
