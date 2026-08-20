# Loan Service Documentation

## Purpose
Implements financial calculation logic for loan interest rates, payable balances, maturity dates, and automatic repayment schedule generation.

## Functions

### `createLoanService(loanData)`
- **Calculates**: Total Interest = Principal * (Rate/100) * (Months/12), Monthly Amount = Total Payable / Months.
- **Transaction**: Executes `insertLoan()` and `insertRepaymentScheduleBatch()` within a single MySQL transaction.
- **Rollback**: If any installment insertion fails, transaction is rolled back completely.

## Mentor Questions

### Q1. Why use a database transaction when creating a loan?
**Answer**: A loan facility cannot exist without its corresponding repayment schedule installments. The database transaction ensures that if schedule creation fails halfway, the entire operation is rolled back, preventing orphaned loan records.
