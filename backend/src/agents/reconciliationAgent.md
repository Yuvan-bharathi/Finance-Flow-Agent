# Payment Reconciliation Agent Documentation

## Purpose
Identifies the candidate borrowing company, loan facility, and scheduled repayment installment for an incoming bank payment using Groq LLM tool calling.

## Agent Architecture
```
Ingested Payment Case ID
        │
        ▼
reconciliationAgent.js
        │
        ▼
Groq API (llama-3.3-70b-versatile)
        │
   ┌────┴───────────────────────────┐
   ▼                                ▼
Requested Tool Calls            Final Answer JSON
(searchCompany, getActiveLoans,    (company_id, loan_id, schedule_id,
 getDueRepayments, getHistory)     confidence_score, reasoning)
   │                                │
   ▼                                ▼
Node.js Executes Tools against MySQL Save to ai_recommendations (status: pending)
   │                                Update reconciliation_cases (status: pending_review)
   └────────────────────────────────┘
```

## Tools Used
- `searchCompany({ query })`
- `getActiveLoans({ companyId })`
- `getDueRepayments({ companyId, loanId })`
- `getPaymentHistory({ companyId })`
- `getBankAccountDetails({ companyId })`
- `checkDuplicateTransactions({ transactionId, senderName, amount })`

## Confidence Score Engine Rules
- **Score $\ge 90.0\%$ (High Confidence)**: Reference string, company name, or bank account match + exact installment amount match. Case status updated to `pending_review`.
- **Score $70.0\% - 89.9\%$ (Medium Confidence)**: Slight name/account variation, or multiple active loans exist. Case status updated to `pending_review`.
- **Score $< 70.0\%$ (Low Confidence)**: Unknown sender, no matching loan, or amount discrepancy. Case status updated to `under_review` for manual investigation.

## Important Rule
The AI agent does **NOT** update MySQL financial balance records (`payment_allocations`, `repayment_schedules`) directly. It writes candidate match proposals into `ai_recommendations` for human accountant verification.

## Mentor Questions

### Q1. What makes this an "Agentic AI" architecture rather than a basic chatbot?
**Answer**: The agent does not simply generate static text. It observes the financial context, formulates a multi-step investigation plan, calls controlled backend database tools (`searchCompany`, `getActiveLoans`, `getDueRepayments`), analyzes empirical results returned by MySQL, and calculates confidence scores to recommend a business action.

### Q2. What happens if the Groq API key is invalid or encounters a network error?
**Answer**: The agent features a built-in fallback heuristic engine (`runFallbackRuleBasedMatching`). It executes the backend search tools locally, calculates candidate confidence scores, and returns a valid recommendation structure so the platform never crashes or blocks operations.
