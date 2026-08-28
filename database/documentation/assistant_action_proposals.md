# Database Table Documentation: `assistant_action_proposals`

---

## 1. Table Overview & Purpose
- **Table Name**: `assistant_action_proposals`
- **Database Engine**: InnoDB (`utf8mb4_unicode_ci`)
- **Introduced in**: Phase 7 (Migration `006_phase7_copilot_proposals.sql`)
- **Purpose**: Implements the **Human-in-the-Loop Safety Gate** for the AI Operational Copilot. Prevents LLMs from directly mutating financial databases by recording proposed mutations as pending proposals subject to TTL expiration, PBAC permission checks, SHA-256 state integrity verification, and human confirmation.

---

## 2. Column Specifications

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | NO | AUTO_INCREMENT | Unique surrogate primary key. |
| `user_id` | `INT UNSIGNED` | NO | | Foreign key to `users.id` (user who prompted the AI). |
| `action_type` | `VARCHAR(64)` | NO | | Action identifier (`FLAG_CASE`, `TRIGGER_RECONCILIATION`, `TRIGGER_PIPELINE`, `ESCALATE_COLLECTION`, `UPDATE_PRIORITY`). |
| `target_entity_type` | `VARCHAR(64)` | NO | | Entity category (`reconciliation_case`, `company`, `loan`, `pipeline`). |
| `target_id` | `INT UNSIGNED` | NO | | Primary key ID of the target entity to mutate. |
| `parameters_payload` | `JSON` | NO | | JSON payload containing arguments required for the mutation. |
| `payload_hash` | `VARCHAR(64)` | NO | | SHA-256 cryptographic hash of the parameters and entity state snapshot. |
| `proposal_version` | `INT` | NO | `1` | Optimistic locking version number. |
| `evidence_summary` | `TEXT` | NO | | Human-readable bullet points summarizing the decision evidence. |
| `confidence_score` | `INT` | NO | `90` | AI estimated confidence percentage (0–100). |
| `status` | `ENUM` | NO | `'pending_confirmation'` | Lifecycle status: `pending_confirmation`, `confirmed`, `dismissed`, `expired`. |
| `expires_at` | `DATETIME` | NO | | 5-Minute safety TTL expiration timestamp. |
| `confirmed_by` | `INT UNSIGNED` | YES | `NULL` | Foreign key to `users.id` of the human who confirmed the action. |
| `confirmed_at` | `DATETIME` | YES | `NULL` | Timestamp when the action was confirmed and executed. |
| `created_at` | `DATETIME` | NO | `CURRENT_TIMESTAMP` | Timestamp when the proposal was generated. |
| `updated_at` | `DATETIME` | NO | `CURRENT_TIMESTAMP` | Auto-updated timestamp on modification. |

---

## 3. Indexes & Constraints

- **Primary Key**: `PRIMARY KEY (id)`
- **Foreign Keys**:
  - `fk_proposal_user`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  - `fk_proposal_confirmed_by`: `FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL`
- **Composite Indexes**:
  - `idx_user_status`: `(user_id, status)` for `<5ms` retrieval of a user's active proposals.
  - `idx_expires_at`: `(expires_at)` for quick TTL evaluation.
  - `idx_target_entity`: `(target_entity_type, target_id)` for checking active proposals on an entity.

---

## 4. State Machine Diagram

```
                 AI Intent Detected
                         │
                         ▼
        ┌──────────────────────────────────┐
        │       pending_confirmation       │
        │   (5-Minute Safety Window)       │
        └────────────────┬─────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   [ User Confirms ]  [ Dismiss ]     [ TTL > 5m ]
         │               │               │
         ▼               ▼               ▼
  ┌──────────────┐┌──────────────┐┌──────────────┐
  │  confirmed   ││  dismissed   ││   expired    │
  │ (ACID Run +  ││ (No Action   ││ (Rejected on │
  │  Audit Log)  ││  Taken)      ││  Confirm)    │
  └──────────────┘└──────────────┘└──────────────┘
```
