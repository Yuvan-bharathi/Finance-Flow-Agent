# AI Copilot: Conversational Natural Language Assistant

---

## 1. Executive Summary
The **AI Copilot Conversational Assistant** (`copilot_assistant`) is the natural language interaction, cross-entity investigation, and safe action execution interface of FinanceFlow AI. Accessible via the floating global assistant drawer throughout the web application, it allows users to ask arbitrary natural language questions about loan books, borrowers, risk assessments, bank transactions, and compliance status, converting English queries into multi-step tool executions and streaming answers.

* **System ID**: `copilot_assistant`
* **Agent Role**: Conversational Multi-Agent Copilot & Safe Action Proposer
* **Execution Model**: ReAct (Reasoning + Acting) Function Calling + Strict Permission Context Guardrails

---

## 2. Problem Solved & Business Use Case
Loan officers, underwriters, and operations managers constantly need answers across multiple database tables (e.g. *"Show me all loans with interest above 12% that are currently overdue"*, *"What is the repayment history of Metro Cold Storage?"*, or *"Which alerts require my approval today?"*).
* **Without Copilot**: Users have to navigate 5 different screens, apply filters, and manually cross-reference IDs.
* **With Copilot**: A single natural language prompt queries the relevant models and returns synthesized financial tables, insights, and safe action proposals with one-click approval buttons.

---

## 3. Technical Configuration & Parameters
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile` / `qwen-2.5-32b`)
* **Temperature**: `0.3`
* **Max Tool Calling Iterations**: `5 steps`
* **System Prompt**: `ASSISTANT_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/assistant.prompt.js`

### Registered Copilot Tools
1. **`queryCompanies`**: Search borrowers by name, status, or registration ID.
2. **`queryLoans`**: Filter active loans by interest rate, principal, status, and borrower ID.
3. **`queryRepaymentSchedules`**: Inquire on overdue or upcoming installments across the portfolio.
4. **`queryRiskAssessments`**: Fetch latest credit risk grades, PD scores, and EWS indicators.
5. **`queryPendingReconciliations`**: Check unmatched deposits and AI match proposals.
6. **`proposeAction`**: Constructs a safe, typed action card in chat for user confirmation.

---

## 4. Comprehensive Test Cases & Scenarios

| Test ID | Natural Language Query | Expected Tool Calls & Response | Verification Method |
| :--- | :--- | :--- | :--- |
| **TC-7.1** | *"What is the outstanding balance of Metro Cold Storage Networks?"* | Calls `queryCompanies(name="Metro Cold")` and returns principal ₹14,00,000, EMI ₹1,58,200, and remaining balance ₹14,23,800. | Open AI Assistant in UI and send message. |
| **TC-7.2** | *"Show me all companies with risk level CRITICAL"* | Calls `queryRiskAssessments(risk_level="CRITICAL")` and displays table with Apex Logistics (#4). | Inspect chat response formatting. |
| **TC-7.3** | *"Which alerts are pending in Agent 6?"* | Calls `queryEscalationAlerts(status="pending")` and lists pending escalation alerts. | Verify returned alert list. |
| **TC-7.4** | Safe Action Proposal | Prompt: *"Draft a collection notice for Company 4"* $\rightarrow$ generates interactive proposal card requiring human confirmation. | Click action card in chat. |
