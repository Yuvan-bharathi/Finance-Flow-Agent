# Agent 6 — Notification & Escalation Agent

## Purpose
Detects SLA-breached repayment installments using a deterministic SQL engine, then uses Groq LLM to classify severity, recommend the escalation recipient, and write AI reasoning for each alert. Implements a human-in-the-loop approval workflow.

## Design Decision: Hybrid + Human-in-the-Loop
**SQL detects. Groq classifies. Human decides.**

1. SQL identifies WHAT is overdue (date arithmetic — reliable)
2. Groq determines WHO should be notified and WHY (business context — valuable)
3. Human approves/dismisses (safety policy — non-negotiable)

This design prevents Agent 6 from becoming an autonomous financial communication system. No email is sent without human approval.

## Data Flow

```
Frontend AgentControlCenter
  ↓  User clicks "Test Run" on Agent 6 card
  ↓
POST /api/notifications/escalate (with JWT cookie)
  ↓
auth.middleware → validates JWT → sets req.user
  ↓
notification.controller.js → triggerEscalationScan()
  ↓
notificationAgent.js → runNotificationAgent(triggeredBy)
  ↓
  ┌─ acquireAgentLock('agent_6_notification', 'GLOBAL')
  ├─ createAgentRun() → agent_runs table
  ├─ STEP: _getOverdueLoans() → SQL SLA Engine
  │         → finds all companies with past-due installments
  │         → returns: company, overdue_days, outstanding_amount
  ├─ EARLY EXIT: if 0 overdue loans → complete with no alerts
  ├─ STEP: Build breach summary JSON from SQL results
  ├─ Groq LLM → for each breach → severity + recipient + reasoning
  │    (Groq tool-calling loop: Groq can call computeSLABreach or
  │     getCompanyRiskProfile if it needs more context)
  ├─ INSERT each alert into notification_alerts (status = 'pending')
  ├─ logStep() → ALERTS_CREATED
  ├─ updateAgentRun() → completed, token usage
  ├─ emitSocketEvent('NEW_ESCALATION_ALERTS', ...)
  └─ releaseAgentLock()
  ↓
JSON response → React AgentControlCenter
  ↓
escalationAlerts state updated → Alerts panel renders
  ↓
User clicks [Approve] or [Dismiss]
  ↓
PUT /api/notifications/alerts/:id/approve (or dismiss)
  ↓
UPDATE notification_alerts SET status = 'approved'/'dismissed', approved_by = user.id
```

## Human Approval Workflow

Each alert is created with `notification_status = 'pending'`.

| Action | Status Change | Who |
|--------|--------------|-----|
| No action | `pending` | — |
| ✓ Approve | `approved` | Logged-in user |
| Dismiss | `dismissed` | Logged-in user |

The `approved_by` and `actioned_at` fields create a full audit trail of who decided what and when.

## Database Tables Used

| Table | Operation | Purpose |
|-------|-----------|---------|
| `repayment_schedules` | SELECT | Detect overdue installments |
| `loans` | SELECT JOIN | Link installments to companies |
| `companies` | SELECT JOIN | Get company name, risk level |
| `users` | SELECT JOIN | Risk profile history |
| `notification_alerts` | INSERT + UPDATE | Store alerts + record approvals |
| `agent_runs` | INSERT + UPDATE | Audit trail |
| `agent_execution_logs` | INSERT | Step-level log |

## Key Files

| File | Role |
|------|------|
| `backend/src/agents/notificationAgent.js` | Main agent — SLA engine + Groq |
| `backend/src/tools/notificationTools.js` | 3 controlled DB tools |
| `backend/src/prompts/notification.prompt.js` | Groq system prompt |
| `backend/src/controllers/notification.controller.js` | HTTP handlers (trigger + CRUD) |
| `backend/src/routes/notification.routes.js` | Express routes |
| `frontend/src/services/notificationService.js` | API client |

## Execution Logs

1. `RUN_STARTED` → ESCALATION_SCAN_INITIATED
2. `TOOL_EXECUTED` → FETCH_OVERDUE_LOANS
3. `SLA_ENGINE` → SLA_BREACH_DETECTED
4. `GROQ_ANALYSIS` → GROQ_ESCALATION_ANALYSIS
5. `ALERTS_CREATED` → NOTIFICATION_ALERTS_SAVED
6. `RUN_COMPLETED` → ESCALATION_SCAN_COMPLETE

## WebSocket Event
`NEW_ESCALATION_ALERTS` → emitted with { alerts_count, critical_count, high_count, alerts[] }
Frontend can listen for this event and display a toast notification.

## Alert Severity Classification
Groq uses these business rules from the system prompt:
- CRITICAL: Overdue > 45 days OR > ₹5,00,000 OR risk_level = CRITICAL
- HIGH: Overdue 20–45 days OR ₹1,00,000–₹5,00,000
- MEDIUM: Overdue 7–19 days OR ₹25,000–₹1,00,000
- LOW: Overdue 1–6 days OR < ₹25,000
