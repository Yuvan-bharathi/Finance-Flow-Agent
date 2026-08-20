# Repayment Model Documentation

## Purpose
Executes MySQL queries for `repayment_schedules` table.

## Functions
- `insertRepaymentScheduleBatch()`: Batch inserts installment rows.
- `findScheduleByLoanId()`: Retrieves schedule ordered by installment number.
- `findDueInstallments()`: Filters pending/overdue installments.
- `findScheduleById()`: Retrieves single installment by primary key ID.
