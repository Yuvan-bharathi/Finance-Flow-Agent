# Architecture Decision Log (ADR) — FinanceFlow AI

## ADR 001: Choice of Database Engine (MySQL over MongoDB)

### Decision
Use MySQL 8.0+ as the relational database engine.

### Context & Reason
FinanceFlow AI manages financial transactions, loan facilities, scheduled repayment installments, and ledger allocations. Financial platforms require strict ACID (Atomicity, Consistency, Isolation, Durability) guarantees, relational integrity via foreign key constraints, and normalized multi-table joins.

### Alternatives Considered
- MongoDB (Document DB)
- PostgreSQL

### Why Chosen
MySQL provides robust relational schema enforcement, ACID compliance for payment allocation transactions, and high query performance for financial reporting.

---

## ADR 002: Human-in-the-Loop Agentic AI Pattern

### Decision
AI Agents (powered by Groq API with tool calling) write candidate proposals into `ai_recommendations`. They **never** directly mutate financial balance records in `payment_allocations` or `repayment_schedules`.

### Context & Reason
Allowing an LLM to autonomously execute SQL updates on financial databases introduces catastrophic risk of hallucinated or incorrect ledger mutations.

### Implementation
- `payments` ➔ `reconciliation_cases` ➔ `ai_recommendations` (AI candidate proposal with confidence score) ➔ **Human Review & Approval** ➔ `payment_allocations` ➔ `repayment_schedules` (settlement).

---

## ADR 003: Decoupled Bank Payment Ingestion

### Decision
Raw incoming bank deposits enter `payments` with `status = 'unmatched'` and without mandatory `company_id` or `loan_id` foreign keys.

### Context & Reason
In real-world banking feeds, payments arrive with raw narration text and transaction references without pre-assigned internal company IDs. Decoupling ingestion from entity assignment allows automated duplicate checking, case opening, and AI matching investigation.
