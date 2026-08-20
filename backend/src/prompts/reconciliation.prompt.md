# Reconciliation Prompt Documentation

## Purpose
Defines system instructions and user prompt templates for Agent 1 as required by Section 14 of the Development Manual.

## System Prompt Guidelines
- Restricts direct SQL database mutations.
- Instructs the model to evaluate multiple matching signals (Sender Name, Bank Account, Transaction Reference, Amount, Installment Due Dates).
- Enforces strict JSON output formatting.

## Mentor Questions
### Q1. Why store prompts in separate files instead of inside controllers?
**Answer**: Section 14 mandates separating prompts into `prompts/` to keep controllers focused on HTTP handling, maintain prompt versioning, and prevent clutter in business logic files.
