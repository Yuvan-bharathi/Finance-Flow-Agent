# Audit Log Model Documentation

## Purpose
Executes MySQL queries for immutable audit trail compliance logging in `audit_logs`.

## Functions
- `insertAuditLog()`: Writes audit action entry with JSON snapshot.
- `findAllAuditLogs()`: Queries audit logs joined with user details.
