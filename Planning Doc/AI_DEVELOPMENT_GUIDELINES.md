# AI Development Guidelines — FinanceFlow AI

## 1. Groq Tool-Calling Architecture
- Groq API is used as the inference layer for multi-step reasoning.
- AI agents call backend application tools (`searchCompany`, `getActiveLoans`, `getDueRepayments`, `getPaymentHistory`, `checkDuplicateTransactions`).
- Backend tools execute controlled, parameterized MySQL read queries.
- Unrestricted SQL execution (e.g. `executeSQL()`) is strictly prohibited.

## 2. Confidence Threshold Rules
- **$\ge 90\%$ (High Confidence)**: Strong candidate match. Auto-suggested for quick 1-click accountant confirmation.
- **$70\% - 89\%$ (Medium Confidence)**: Possible match. Detailed accountant review required.
- **$< 70\%$ (Low Confidence)**: Low confidence. Flagged for manual investigation.

## 3. Human Approval & Auditability
- No AI recommendation updates financial balances directly.
- Every approval, rejection, or accountant override (with mandatory `override_reason`) is logged in `audit_logs`.
