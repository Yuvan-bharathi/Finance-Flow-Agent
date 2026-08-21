# FinanceFlow AI Financial Operations Copilot — Complete Architectural Guide

## 1. Executive Summary & Philosophy

The **FinanceFlow AI Financial Operations Copilot** is a contextual, role-aware operational assistant embedded across the FinanceFlow platform.

Unlike standard chatbots, the Copilot adheres to the core principle:

> **"The Assistant does not guess or answer generally. It inspects the user's role + current page + selected business record + database state to provide grounded financial intelligence and propose safe operational actions."**

```text
                        FINANCEFLOW AI COPILOT
                                  │
     ┌────────────────────────────┼────────────────────────────┐
     ↓                            ↓                            ↓
READ INTELLIGENCE          REASONING MODES              ACTION PROTOCOL
(18 Controlled DB Tools)   (5 Investigation Modes)      (Proposal ID + Human Click)
     │                            │                            │
     ↓                            ↓                            ↓
🗄️ MySQL Truth            💡 Financial Synthesis        🛡️ Audited DB Mutation
```

---

## 2. Multi-Entity Context Awareness

The Copilot is directly accessible across the 4 key business entities:

```text
Borrowing Company (🏢 #1)  ─────────┐
Loan Facility (💰 LN-001)   ─────────┼──►  AI COPILOT (Pre-loaded with Record Metadata)
Payment Deposit (💳 TXN-99) ─────────┤     - Quick tailored prompts
Reconciliation (📋 Case #16) ─────────┘     - Direct tool dispatch
```

When a user clicks `[Ask AI]` / `[Investigate]`, the context is pre-warmed via `GET /api/assistant/wake/:recordType/:recordId`, dynamically displaying entity badges and customized suggestion chips.

---

## 3. Dual Tool-Calling Architecture

To ensure 100% compatibility with both frontier JSON models and open-source reasoning models (e.g. Qwen / DeepSeek via Groq), the backend engine implements a **Dual Tool-Calling Parser**:

1. **Native OpenAI Function Calls**: Catches `message.tool_calls` parameter.
2. **Text-Based XML Parser (`parseTextToolCalls`)**: Parses XML tags (`<tool_call><function=name><parameter=k>v</parameter></function></tool_call>`) emitted in plain-text output, executes the query, and feeds data back in multi-turn loops.

---

## 4. Controlled Database Tool Suite (19 Read Tools + 4 Action Proposal Tools = 23 Total Tools)

| Category | Tool | Description |
| :--- | :--- | :--- |
| **Core Entity (6)** | `getPaymentDetails(id)` | Fetches payment amount, date, sender bank account, narration |
| | `getReconciliationCase(id)` | Confidence score, pre-check score, matched company/loan |
| | `getCompanyProfile(id)` | Registration, contacts, active loans, total exposure |
| | `getActiveLoan(companyId)` | Active facility details and repayment terms |
| | `getLoanDetails(loanId)` | Full schedule breakdown, paid vs overdue count |
| | `getRepaymentHistory(companyId)` | 12-month installment schedule and overdue duration |
| **Cross-Agent (6)** | `getLatestAgentRuns(agentId, limit)` | Latest execution runs across all agents or for a specific agent |
| | `getAgentRunsByCase(caseId)` | Traces all agent runs (Agent 1–6) and recommendations for a case |
| | `getAgentRun(runId)` | Token usage, execution status, and duration |
| | `getAgentExecutionLogs(runId)` | Step-level input/output execution logs |
| | `searchCompanyByName(query)` | Natural language fuzzy search on borrower registry |
| | `getDocumentSummary(documentId)` | OCR-extracted metadata and document type |
| **Analytics (7)** | `queryOverdueCompanies(minAmt, minDays)` | Threshold filter for overdue borrowers |
| | `getHighRiskBorrowers(limit)` | Ranked list of delinquent borrowers by exposure |
| | `getMonthlyCollectionSummary(y, m)` | Collection efficiency and total collected vs scheduled |
| | `getPortfolioSummary()` | Total portfolio principal, active loans, overdue amount |
| | `getOverduePayments(limit)` | Platform-wide overdue installment schedule list |
| | `getPendingCasesForUser(limit)` | User's pending reconciliation review queue |
| | `getTokenUsageSummary(days)` | Agent token costs and usage analytics |
| **Action Proposal (4)** | `proposeFlagCase(caseId, priority, reason)` | Proposal to update case priority |
| | `proposeAddCaseNote(caseId, noteText)` | Proposal to append auditor note |
| | `proposeTriggerReanalysis(caseId, reason)` | Proposal to re-run AI agents on a case |
| | `proposeEscalateAlert(caseId, level, msg)` | Proposal to dispatch escalation notice |

---

## 5. Phase 3: Human-in-the-Loop Action Proposal Protocol

### Strict Safety Boundaries
- **AUTONOMOUS WRITES ARE FORBIDDEN**: The Copilot can NEVER approve/reject payments, modify loan amounts, or disburse funds.
- **PROPOSAL-FIRST FLOW**: For low-risk operational mutations, the Copilot creates a structured **Action Proposal**.

### Proposal Lifecycle
```text
User asks: "Flag Case #16 as Critical"
   │
   ▼
Copilot calls `proposeFlagCase(16, 'critical')`
   │
   ▼
Backend generates Proposal `ACT-M3K4-8921` (Expires in 15 mins)
   │
   ▼
Frontend displays Interactive Proposal Card in chat
   │
   ▼
Human clicks [Confirm Action]
   │
   ▼
POST /api/assistant/actions/confirm { proposalId: "ACT-M3K4-8921" }
   │
   ▼
Backend validates Proposal + RBAC + Target Entity state
   │
   ▼
Executes Mutation (`priority = 'critical'`) + Inserts `audit_logs`
   │
   ▼
Returns confirmation -> Card turns green (✅ EXECUTED)
```

### Supported Action Proposal Tools
1. 🚩 `proposeFlagCase(caseId, priority, reason)`
2. 📝 `proposeAddCaseNote(caseId, noteText)`
3. 🔄 `proposeTriggerReanalysis(caseId, reason)`
4. 🚨 `proposeEscalateAlert(caseId, escalationLevel, message)`

---

## 6. Complete Audit Trail Specification

Every executed assistant proposal generates an immutable record in `audit_logs`:

```json
{
  "user_id": 3,
  "action": "ASSISTANT_ACTION_FLAG_CASE",
  "entity_type": "reconciliation_case",
  "entity_id": 16,
  "old_values": {
    "proposal_id": "ACT-M3K4-8921",
    "proposed_by": "Senior Accountant",
    "priority": "high",
    "status": "new"
  },
  "new_values": {
    "confirmed_by": "Senior Accountant",
    "confirmed_by_role": "accountant",
    "result": "Priority for Case #16 updated from HIGH to CRITICAL.",
    "priority": "critical",
    "reason": "Transaction ID mismatch requires immediate investigation."
  },
  "created_at": "2026-08-21T07:22:00.000Z"
}
```

This guarantees 100% auditability for regulatory compliance.
