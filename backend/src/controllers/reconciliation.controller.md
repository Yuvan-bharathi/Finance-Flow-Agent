# Reconciliation Controller Documentation

## Purpose
Handles HTTP requests for triggering AI payment reconciliation (`POST /api/reconciliations/analyze/:caseId`) and fetching cases.

## Endpoints
- `POST /api/reconciliations/analyze/:caseId`
- `GET  /api/reconciliations/cases`
- `GET  /api/reconciliations/cases/:caseId`

## Mentor Questions
### Q1. How does the accountant trigger AI analysis from the UI?
**Answer**: The UI clicks "Analyze Payment", sending a `POST /api/reconciliations/analyze/:caseId` request. The controller invokes `runReconciliationAgent()`, which executes Groq tool calling and returns candidate recommendations.
