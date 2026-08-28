# FinanceFlow AI — Roles & Permissions Matrix Documentation

## 1. Executive Summary & Security Philosophy

FinanceFlow AI enforces **Hierarchical Role-Based Access Control (RBAC)** across all application layers (Database, Node/Express REST API, Socket.IO WebSockets, and React Frontend UI).

### Security Architecture:
1. **Database Layer (`roles` table)**: Every user account is linked to a single primary role via `users.role_id` foreign key.
2. **Backend Protection (`rbac.middleware.js`)**: Every protected REST API endpoint passes through `authorize([...allowedRoles])` middleware to enforce role validation at the server level.
3. **Frontend UI Protection (`Settings.jsx`, `Header.jsx`, `Navbar.jsx`)**: UI controls, AI billing telemetry, model switching, user creation, and sensitive action buttons dynamically render based on `user.role_name`.
4. **Audit Trail**: Every action performed in the system records `user_id`, `user_name`, and `role_name` in the immutable `audit_logs` table.

---

## 2. Complete Role Hierarchy Table

| Role Key (`name` in DB) | Display Name | DB Role ID | Hierarchy Level | Primary Focus |
| :--- | :--- | :--- | :--- | :--- |
| **`owner`** | System Owner | `90002` | Level 7 (Highest) | Platform ownership, AI token quota governance, billing & LLM model switching |
| **`super_admin`** | Super Admin | `90003` | Level 6 | System-wide administrative control, user provisioning, global policy thresholds |
| **`admin`** | System Admin | `1` | Level 5 | Operational administration, user account management, audit compliance oversight |
| **`manager`** | Finance Manager | `2` | Level 4 | Credit facility management, company risk oversight, high-value loan approvals |
| **`senior_accountant`** | Senior Accountant | `3` | Level 3 | Human-in-the-loop AI recommendation approvals, ledger overrides, payment matching |
| **`accountant`** | Accountant | `4` | Level 2 | Daily payment ingestion, triggering agent pre-checks, basic data entry |
| **`viewer`** | Audit Viewer | `5` | Level 1 | Read-only compliance, external audit review, report inspection |

---

## 3. Comprehensive Permission Matrix

| Feature / Action | Owner | Super Admin | Admin | Manager | Senior Accountant | Accountant | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Dashboard & Action Center** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Borrowing Companies & Loans** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Financial Reports & Analytics** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View System Audit Logs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ingest Bank Payments (JSON / File Upload)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Trigger Agent 1 (Reconciliation Engine)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Trigger Agent 2 (Risk Assessment)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Trigger Agent 3 (Collection Follow-Up)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Trigger Agent 4 (Document Extraction)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Trigger Agent 5 (Portfolio Snapshot)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Trigger Agent 6 (Escalation Scan)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Approve / Reject AI Recommendation** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Override AI Recommendation (Custom Split)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Dispatch Escalation Notice Emails (Agent 6)**| ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Create / Update Borrowing Companies** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create / Modify Loan Facilities** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Configure Matching & Threshold Rules** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create & Provision New Team Users** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View AI Infrastructure Billing Telemetry** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Switch Live Groq LLM Model (1-Click Switch)**| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Individual Role Detailed Specs

### 👑 1. System Owner (`owner`)
- **Target Persona**: Enterprise Platform Owner / Chief Technology Officer
- **Capabilities**:
  - Unrestricted access across all 6 AI Agents and platform settings.
  - Exclusive access to **AI Token Consumption & Infrastructure Billing** telemetry.
  - Exclusive authority to perform **1-Click Live Groq Model Switching** (e.g. switching between Qwen 3.6 27B, GPT-OSS 120B, Groq Compound Mini).
  - Can manage, create, and revoke accounts for all roles including Super Admins.
- **Seeded Account**: `yuvanbharathin@gmail.com` / `Password123!`

---

### ⚡ 2. Super Admin (`super_admin`)
- **Target Persona**: Head of Engineering / Platform Administrator Lead
- **Capabilities**:
  - Full system administration and infrastructure governance rights.
  - Views live token consumption telemetry, TPD (Tokens Per Day) quota consumption, and estimated daily cost in INR.
  - Can provision new user accounts, update system parameters, and configure fallback AI rules.
  - Full human-in-the-loop reconciliation approval and override capabilities.
- **Seeded Account**: `nyuvanbharathi@gmail.com` / `Password123!`

---

### 🛡️ 3. Platform Admin (`admin`)
- **Target Persona**: IT Operations Manager / Financial Operations Lead
- **Capabilities**:
  - Manages operational settings, risk thresholds, overpayment/underpayment strategies, and notification preferences.
  - Provisions team accounts (`senior_accountant`, `accountant`, `viewer`).
  - Full operational capability across payment ingestion, reconciliation approvals, company profiles, and loan schedules.
- **Seeded Account**: `admin@financeflow.com` / `Password123!`

---

### 📈 4. Finance Manager (`manager`)
- **Target Persona**: Credit Officer / Risk Management Director
- **Capabilities**:
  - Focuses on portfolio health, overdue aging breakdown, and borrower risk profiles.
  - Can trigger Agent 2 (Risk Assessment), Agent 3 (Collection Follow-Up), Agent 5 (Portfolio Snapshot), and Agent 6 (Escalation Scan).
  - Approves critical escalation draft notices to borrowers before dispatch.
  - Can create and modify borrowing companies and loan facility terms.
- **Seeded Account**: `manager@financeflow.com` / `Password123!`

---

### 📑 5. Senior Accountant (`senior_accountant`)
- **Target Persona**: Senior Financial Operations Specialist
- **Capabilities**:
  - Primary human-in-the-loop reviewer for AI reconciliation recommendations.
  - Can Approve, Reject, or Manually Override ledger matches (e.g., allocating funds across principal, interest, late fees).
  - Can trigger Agent 1 (Payment Reconciliation) and Agent 4 (Document Intelligence).
  - Approves AI-drafted collection emails prior to SMTP dispatch.
- **Seeded Account**: `accountant@financeflow.com` / `Password123!` (Note: role `senior_accountant`)

---

### 💳 6. Accountant (`accountant`)
- **Target Persona**: Daily Operations Clerk / Data Entry Specialist
- **Capabilities**:
  - Ingests raw bank deposits (JSON payload, CSV, or single deposit form).
  - Triggers Agent 1 pre-checks on newly arrived payment deposits.
  - Views open cases, loan schedules, and payment history.
  - Restricted from approving financial settlements or modifying system rules.
- **Seeded Account**: `arun.s@financeflow.com` / `Password123!`

---

### 👁️ 7. Audit Viewer (`viewer`)
- **Target Persona**: External Auditor / Compliance Officer / Board Observer
- **Capabilities**:
  - Read-only visibility across all platform pages: Action Center, Payment Ingestion, Borrowing Companies, Loans & Schedules, Reports & Analytics, and Audit Logs.
  - Restricted from triggering AI agents, executing database mutations, or modifying configuration settings.
- **Seeded Account**: `viewer@financeflow.com` / `Password123!`

---

## 5. Technical Implementation Code References

### A. Backend RBAC Middleware (`backend/src/middleware/rbac.middleware.js`)
```javascript
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_name) {
      return sendErrorResponse(res, 401, 'Authentication context missing.');
    }
    const userRole = req.user.role_name.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return sendErrorResponse(res, 403, `Access denied. Role '${req.user.role_name}' is not authorized.`);
    }
    return next();
  };
};
```

### B. Frontend Role Guards (`frontend/src/pages/Settings.jsx`)
```javascript
const userRole = user?.role_name || user?.role || 'accountant';
const isSuperAdminOrOwner = userRole === 'super_admin' || userRole === 'owner';
const isUserAdmin = isSuperAdminOrOwner || userRole === 'admin';
const isSeniorAccountant = userRole === 'senior_accountant' || isUserAdmin;

// UI Guard for AI Token Infrastructure Billing:
{isSuperAdminOrOwner && (
  <div className="ai-token-billing-section">
    {/* Token usage telemetry, TPD progress bar, model switcher */}
  </div>
)}
```

---

## 6. Seeded Test Credentials Reference

| Email | Password | Role | Test Focus |
| :--- | :--- | :--- | :--- |
| `yuvanbharathin@gmail.com` | `Password123!` | `owner` | Test AI Billing Telemetry & 1-Click Model Switch |
| `nyuvanbharathi@gmail.com` | `Password123!` | `super_admin` | Test Super Admin Provisioning & System Policies |
| `admin@financeflow.com` | `Password123!` | `admin` | Test User Creation & Threshold Rules |
| `manager@financeflow.com` | `Password123!` | `manager` | Test Portfolio Analytics & Escalation Scans |
| `accountant@financeflow.com` | `Password123!` | `senior_accountant` | Test AI Recommendation Approval & Overrides |
| `arun.s@financeflow.com` | `Password123!` | `accountant` | Test Payment Ingestion & Agent 1 Test Runs |
| `viewer@financeflow.com` | `Password123!` | `viewer` | Test Read-Only Auditor View & Compliance Logs |

---

*Documentation Version: 1.0*  
*Last Updated: August 2026*  
