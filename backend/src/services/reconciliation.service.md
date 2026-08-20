# Reconciliation Service Documentation

## Purpose
Orchestrates AI agent runs and queries cases with joined latest recommendations.

## Mentor Questions
### Q1. How does `getCasesService()` format responses for the Action Center UI?
**Answer**: It queries `reconciliation_cases` joined with payments, companies, and assigned user info, and attaches the `latest_recommendation` object to each case for quick rendering in React.
