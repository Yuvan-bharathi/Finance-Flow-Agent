# Notifications Table Documentation

## Purpose
Stores user notifications, operational alerts, overdue repayment reminders, and real-time task queue items.

## Columns

| Column | Type | Nullable | Key | Purpose |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | PK | Unique notification ID |
| `user_id` | INT UNSIGNED | NO | FK | Target user ID FK ➔ `users.id` |
| `type` | VARCHAR(50) | NO | — | Category (e.g. `NEW_PAYMENT`, `AI_RECOMMENDATION`, `OVERDUE_ALERT`) |
| `title` | VARCHAR(150) | NO | — | Short alert header |
| `message` | TEXT | NO | — | Detailed notification text |
| `entity_type` | VARCHAR(50) | YES | — | Associated entity table name |
| `entity_id` | BIGINT UNSIGNED | YES | — | Associated entity primary key |
| `is_read` | BOOLEAN | NO | — | Read status flag (DEFAULT FALSE) |
| `created_at` | TIMESTAMP | NO | — | Alert creation timestamp |
| `read_at` | TIMESTAMP | YES | — | Timestamp when user marked alert as read |

## Relationships
- **N : 1 with `users`**: Notification dispatched to user (`notifications.user_id` ➔ `users.id`).

## Used By
- Notification Service (`notification.service.js`), WebSocket Handler (`websocket.js`).

## Mentor Questions

### Q1. How are unread notification counts retrieved for the UI header badge?
**Answer**: The backend executes `SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE;` using the indexed `(user_id, is_read)` composite key.
