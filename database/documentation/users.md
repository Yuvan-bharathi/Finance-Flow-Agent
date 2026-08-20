# Users Table Documentation

## Purpose
Stores user accounts, bcrypt-hashed passwords, role assignments, authentication state, and last login timestamps.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique user ID |
| `role_id` | INT UNSIGNED | NO | FK | Foreign key to `roles.id` |
| `name` | VARCHAR(100) | NO | — | User's full name |
| `email` | VARCHAR(150) | NO | UNIQUE | Login email address |
| `password_hash` | VARCHAR(255) | NO | — | Bcrypt hashed password (10 salt rounds) |
| `is_active` | BOOLEAN | NO | — | Account active status flag (DEFAULT TRUE) |
| `last_login_at` | TIMESTAMP | YES | — | Timestamp of last successful authentication |
| `created_at` | TIMESTAMP | NO | — | Account creation timestamp |
| `updated_at` | TIMESTAMP | NO | — | Account update timestamp |

## Relationships
- **N : 1 with `roles`**: User belongs to one role (`users.role_id` ➔ `roles.id`).
- **1 : N with `reconciliation_cases`**: User is assigned to cases (`users.id` ➔ `reconciliation_cases.assigned_to`).
- **1 : N with `ai_recommendations`**: User reviews AI recommendations (`users.id` ➔ `ai_recommendations.reviewed_by`).
- **1 : N with `payment_allocations`**: User approves ledger allocation (`users.id` ➔ `payment_allocations.approved_by`).
- **1 : N with `documents`**: User uploads documents (`users.id` ➔ `documents.uploaded_by`) and approves documents (`users.id` ➔ `documents.approved_by`).
- **1 : N with `audit_logs`**: User actions generate compliance logs (`users.id` ➔ `audit_logs.user_id`).
- **1 : N with `notifications`**: User receives system notifications (`users.id` ➔ `notifications.user_id`).

## Used By
- Auth Controller (`auth.controller.js`), Auth Middleware (`auth.middleware.js`), RBAC (`rbac.middleware.js`).

## Mentor Questions

### Q1. How are user passwords secured?
**Answer**: Passwords are never stored in plain text. They are hashed using bcrypt with a salt factor of 10 during registration and verified via `bcrypt.compare()` during login.

### Q2. Where is user context stored during an API request?
**Answer**: The JWT authentication middleware verifies the HTTP-only JWT cookie, extracts `user_id` and `role_id`, and attaches the decoded user context to Express's `req.user`.
