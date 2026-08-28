# Service Documentation: `assistantAction.service.js`

---

## 1. Overview & Architectural Role
- **Module**: `backend/src/services/assistantAction.service.js`
- **Introduced in**: Phase 7
- **Role**: Implements the **Human-in-the-Loop AI Safety Gatekeeper**.
- **Core Principle**: The LLM runs in a **read-first** mode. Any action or financial mutation intent is drafted as an `assistant_action_proposal` with `pending_confirmation` status, 5-minute TTL, and SHA-256 state snapshot integrity hash.

---

## 2. Key Methods & Protocol

### `generateActionProposal(data)`
- **Invoked by**: `backend/src/tools/assistantTools.js:proposeAction`
- **Data Flow**: Groq Tool Call $\rightarrow$ Serializes parameters $\rightarrow$ Generates SHA-256 hash $\rightarrow$ Computes `expiresAt` ($+5\text{m}$) $\rightarrow$ Inserts proposal with `status = 'pending_confirmation'`.

### `confirmActionProposal(proposalId, user, options)`
- **Invoked by**: `POST /api/v1/assistant/proposals/:id/confirm`
- **Execution Pipeline**:
  1. `connection.beginTransaction()`
  2. `SELECT * FROM assistant_action_proposals WHERE id = ? FOR UPDATE` (Pessimistic concurrency lock)
  3. **Inline TTL Check**: `if (expires_at < new Date())` $\rightarrow$ set `status = 'expired'`, commit, throw HTTP 410.
  4. **PBAC Check**: `checkRoleHasPermission(userRole, requiredPermission)`.
  5. **Payload Hash Check**: Verify `payload_hash` matches current parameters.
  6. **ACID Financial Mutation**: Mutates target entity.
  7. **Audit Trail**: Writes `{ old_state, new_state, source: 'AI Copilot Assistant' }` to `audit_logs`.
  8. `connection.commit()`
  9. Broadcasts `ASSISTANT_ACTION_CONFIRMED` via Socket.io.

### `dismissActionProposal(proposalId, user)`
- **Invoked by**: `POST /api/v1/assistant/proposals/:id/dismiss`
- **Effect**: Sets proposal status to `dismissed` without mutating target entity.

---

## 3. Interview Preparation Q&A

**Q: How does FinanceFlow AI prevent an LLM from hallucinating and corrupting the financial ledger?**
> By design, the LLM has zero direct write access to MySQL tables. When a user asks the assistant to perform an action (e.g. "Flag case #12" or "Escalate loan LN-102"), the LLM can only call the `proposeAction` tool. This creates an immutable `assistant_action_proposals` record. The mutation only executes when an authorized human reviews the evidence and explicitly clicks Confirm, triggering a secure, PBAC-guarded, idempotent ACID transaction with before/after audit logging.
