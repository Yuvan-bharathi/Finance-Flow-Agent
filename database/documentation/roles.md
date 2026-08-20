# Roles Table Documentation

## Purpose
Stores the system access control roles defining permissions across the FinanceFlow AI platform (`admin`, `manager`, `accountant`, `viewer`).

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK | Unique role identifier |
| `name` | VARCHAR(50) | NO | UNIQUE | Role name (`admin`, `manager`, `accountant`, `viewer`) |
| `description` | VARCHAR(255) | YES | — | Human-readable explanation of role permissions |
| `created_at` | TIMESTAMP | NO | — | Timestamp when role was created |
| `updated_at` | TIMESTAMP | NO | — | Timestamp of last modification |

## Relationships
- **1 : N with `users`**: One role governs permissions for multiple user accounts (`roles.id` ➔ `users.role_id`).

## Used By
- JWT Authentication & RBAC Authorization Middleware (`rbac.middleware.js`)
- User Registration & Management Controllers (`auth.controller.js`)

## Mentor Questions

### Q1. Why is role stored as a separate table instead of a simple string in `users`?
**Answer**: Storing roles in a separate `roles` table enforces relational database normalization (3NF), prevents typo errors in role strings, enables dynamic permission management, and allows strict foreign key constraints on `users.role_id`.

### Q2. What happens if someone tries to delete a role assigned to existing users?
**Answer**: The foreign key constraint `ON DELETE RESTRICT` prevents deletion of any role that has active users associated with it, ensuring system security integrity.
