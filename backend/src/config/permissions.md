# Permission-Based Access Control Specification (`permissions.js`)

## Purpose
The `permissions.js` configuration introduces **Granular Permission-Based Access Control (PBAC)** to FinanceFlow AI. Rather than embedding hardcoded role string checks (`req.user.role === 'admin'`) throughout controllers, operations require specific capabilities (e.g. `CASE_APPROVE`, `PAYMENT_ALLOCATE`, `AI_ACTION_CONFIRM`).

---

## Role to Permission Mapping Matrix

| Role | Scope | Key Permissions Granted |
|---|---|---|
| **Owner / Super Admin** | Full System Control | All permissions (`*`) including user management, tenant configuration, and billing. |
| **Admin** | Operational Control | Case review & approval, agent executions, risk rule adjustments, user provisioning, document approvals. |
| **Manager** | Supervisory Review | Case approval, manual overrides, AI action confirmations, escalation dispatching, agent execution. |
| **Accountant** | Financial Operations | Case reconciliation, matching analysis, payment allocation approvals/rejections, document uploads. |
| **Viewer** | Read-Only Audit | Read-only access to dashboard, cases, companies, loans, documents, and audit logs. Mutation endpoints return `403 Forbidden`. |

---

## Permission Categories

1. **Reconciliation**: `CASE_VIEW`, `CASE_UPDATE`, `CASE_APPROVE`, `CASE_REJECT`, `CASE_OVERRIDE`, `CASE_ESCALATE`
2. **Payments**: `PAYMENT_VIEW`, `PAYMENT_CREATE`, `PAYMENT_ALLOCATE`
3. **AI Copilot**: `AI_QUERY`, `AI_ACTION_PROPOSE`, `AI_ACTION_CONFIRM`, `AI_EVALUATE`
4. **Agents**: `AGENT_VIEW`, `AGENT_RUN`, `AGENT_REANALYZE`, `AGENT_CONTROL`
5. **Master Data**: `COMPANY_VIEW`, `COMPANY_MANAGE`, `LOAN_VIEW`, `LOAN_MANAGE`, `DOCUMENT_VIEW`, `DOCUMENT_UPLOAD`, `DOCUMENT_MANAGE`
6. **Governance**: `AUDIT_VIEW`, `AUDIT_EXPORT`, `SETTINGS_VIEW`, `SETTINGS_UPDATE`, `USER_MANAGE`

---

## Mentor Questions

### Q1. Why is PBAC superior to simple Role-Based Access Control (RBAC)?
With basic RBAC, adding a new role (e.g., "Auditor" or "Senior Risk Analyst") requires rewriting dozens of controller `if (role === 'admin' || role === 'auditor')` checks. With PBAC, controllers only check `requirePermission('AUDIT_VIEW')`, and assigning capabilities to new roles is done entirely in the configuration matrix.

### Q2. How does PBAC protect AI tool execution?
When the AI Copilot attempts to execute an action proposal (e.g., escalating a delinquent loan or adjusting risk rating), the backend verifies whether the logged-in human user has the necessary `AI_ACTION_CONFIRM` and `CASE_ESCALATE` permissions before executing. The AI can never bypass user permissions.
