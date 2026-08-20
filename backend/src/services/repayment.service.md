# Repayment Service Documentation

## Purpose
Implements logic for filtering pending/overdue installments across borrowing companies.

## Mentor Questions
### Q1. How are overdue repayments surfaced for the Risk and Follow-up Agents?
**Answer**: The service filters installments where `status IN ('pending', 'partially_paid', 'overdue')` and `due_date <= CURRENT_DATE()`, allowing Risk & Collection agents to identify late payment trends.
