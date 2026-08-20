# RBAC Middleware Documentation

## Purpose
Enforces Role-Based Access Control (RBAC) to ensure only authorized system roles (`admin`, `manager`, `accountant`, `viewer`) can execute sensitive financial endpoints.

## Usage Example
```javascript
import { authenticate } from './auth.middleware.js';
import { authorize } from './rbac.middleware.js';

// Endpoint accessible ONLY by Admin or Manager
router.post('/reconciliations/approve', authenticate, authorize(['admin', 'manager']), approveController);
```

## Mentor Questions

### Q1. What happens if a user with role `viewer` attempts to access a financial approval endpoint?
**Answer**: The `authorize(['admin', 'manager', 'accountant'])` middleware inspects `req.user.role_name`. Finding `'viewer'` is not in the permitted array, it halts execution and returns HTTP 403 Forbidden with message `"Access denied. Role 'viewer' is not authorized to perform this operation."`
