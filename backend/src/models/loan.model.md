# Loan Model Documentation

## Purpose
Executes MySQL queries for `loans` table.

## Functions
- `findAllLoans(status)`: Fetches all loans joined with company names.
- `findLoanById(loanId)`: Fetches loan by primary key ID.
- `findActiveLoansByCompanyId(companyId)`: Fetches active loans for a company (used by Groq AI agent).
- `insertLoan(loanData, connection)`: Inserts new loan record.

## Mentor Questions
### Q1. How does `findActiveLoansByCompanyId` help the AI Reconciliation Agent?
**Answer**: When an incoming payment arrives, the AI agent calls `getActiveLoans(companyId)` tool to retrieve active loan numbers and balances for the candidate company.
