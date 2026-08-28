# Permission Middleware (`permission.middleware.js`)

## Purpose
The `permission.middleware.js` module implements the runtime enforcement of **Permission-Based Access Control (PBAC)** on incoming HTTP requests. It validates whether the authenticated user's assigned role contains the required granular permission before delegating control to controllers and services.

---

## Data Flow

```
Client HTTP Request (e.g. POST /api/reconciliations/approve)
   │
   ▼
authenticate (extracts JWT ➔ sets req.user { id, email, role_name })
   │
   ▼
requirePermission(PERMISSIONS.CASE_APPROVE)
   │
   ├── Extracts `req.user.role_name`
   ├── Queries `checkRoleHasPermission(role_name, 'CASE_APPROVE')`
   │
   ├── [Granted]:
   │      ├── Enriches `req.user.permissions`
   │      └── next() ➔ settlement.controller.js ➔ settlement.service.js
   │
   └── [Denied]:
          ├── Logs warning via structured logger with `correlationId`
          └── Returns 403 Forbidden { success: false, requiredPermission: 'CASE_APPROVE', correlationId }
```

---

## Express Arguments Explanation

- `req`: Request object containing `req.user` (from `authenticate`) and `req.correlationId`.
- `res`: Response object used to send structured 403 Forbidden responses.
- `next`: Callback to proceed when authorization succeeds.

---

## Mentor Questions

### Q1. What is the difference between `authenticate` and `requirePermission`?
`authenticate` verifies *identity* (WHO are you? Is the JWT signature valid and not expired?). `requirePermission` verifies *authorization* (WHAT are you allowed to do? Does your role grant the ability to perform this specific action?).

### Q2. How does the frontend handle a 403 response from this middleware?
The frontend Axios response interceptor intercepts 403 status codes, extracts the `requiredPermission` and `correlationId`, and dispatches a global notification event (`ff-auth-permission-error`) to display an informative banner to the user without crashing the UI.
