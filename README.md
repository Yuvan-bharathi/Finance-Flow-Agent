# FinanceFlow AI — Agentic Financial Operations Platform

FinanceFlow AI is an Agentic AI-powered repayment management and financial operations platform built with React, Node.js + Express, MySQL, and Groq API. It automates incoming payment reconciliation, repayment risk detection, collection follow-ups, document intelligence, and financial analytics through controlled LLM tool calling and a strict **Human-in-the-Loop** safety architecture.

---

## Technical Stack

- **Frontend**: React (Vanilla CSS Modern Design System)
- **Backend**: Node.js + Express.js (ES Modules)
- **Database**: MySQL 8.0+ (12 Frozen Tables, `DECIMAL(15,2)` precision, B-Tree Indexes)
- **AI Inference**: Groq API (`llama-3.3-70b-versatile`) with Function Tool Calling
- **Authentication**: JWT + HTTP-only Cookies
- **Authorization**: Role-Based Access Control (RBAC: `admin`, `manager`, `accountant`, `viewer`)
- **Real-time**: WebSocket (Socket.io)

---

## Core Payment Reconciliation Workflow

```
Payment API Trigger (POST /api/payments/ingest)
                       │
                       ▼
            Ingest to payments table (status: "unmatched")
                       │
                       ▼
           Duplicate Check (transaction_id & pattern)
                       │
                       ▼
            reconciliation_cases (status: "open")
                       │
                       ▼
       Payment Reconciliation AI Agent (Groq Tool Calling)
                       │
                       ▼
           ai_recommendations (status: "pending")
                       │
                       ▼
          Human Verification (React Action Center)
          ├── [APPROVE] ➔ Create payment_allocations ➔ Update repayment_schedules ➔ Audit Log
          ├── [REJECT]  ➔ Update status="rejected" ➔ Audit Log
          └── [PENDING] ➔ Mark status="under_review" ➔ Open for manual investigation
```

---

## Directory Structure

```
FinanceFlow-AI/
├── frontend/                  # React Frontend Application
├── backend/                   # Node.js + Express Backend API
│   ├── src/
│   │   ├── config/            # Database pool & Environment variables
│   │   ├── controllers/       # Express HTTP controllers
│   │   ├── services/          # Business logic services
│   │   ├── models/            # MySQL repositories & model queries
│   │   ├── middleware/        # Auth, RBAC, and Error middlewares
│   │   ├── utils/             # Helpers (API responses, JWT tokens, loggers)
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # HTTP server listener
│   └── README.md
├── database/                  # Database DDL & documentation
│   ├── schema.sql             # Full DDL for 12 frozen MySQL tables
│   ├── seed.sql               # Seed data for roles, users, companies, loans, schedules
│   └── documentation/         # Markdown documentation for every database table
├── docs/                      # Technical documentation & guides
├── ARCHITECTURE_DECISIONS.md # ADR log
├── AI_DEVELOPMENT_GUIDELINES.md # AI tool calling standards
├── CHANGELOG.md               # Version changelog
└── README.md                  # Master project documentation
```

---

## Getting Started

### 1. Database Setup
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend will start on `http://localhost:5000`.

---

## Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@financeflow.com` | `Password123!` |
| Manager | `manager@financeflow.com` | `Password123!` |
| Accountant | `accountant@financeflow.com` | `Password123!` |
| Viewer | `viewer@financeflow.com` | `Password123!` |
