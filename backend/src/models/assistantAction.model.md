# Model Documentation: `assistantAction.model.js`

---

## 1. Overview & Architectural Role
- **Module**: `backend/src/models/assistantAction.model.js`
- **Purpose**: Provides data access for the `assistant_action_proposals` table, managing the creation, retrieval, row-locked fetching (`FOR UPDATE`), and state transitions (`pending_confirmation` $\rightarrow$ `confirmed` / `dismissed` / `expired`) of AI-generated action proposals.

---

## 2. Exported Functions & Data Flow

### `createProposal(proposalData, clientConnection)`
- **Called by**: `assistantAction.service.js:generateActionProposal`
- **Data Flow**: Groq Tool Call $\rightarrow$ Compute SHA-256 Hash $\rightarrow$ `createProposal` $\rightarrow$ MySQL.
- **Parameters**:
  - `userId` (`number`): Author user ID.
  - `actionType` (`string`): e.g. `FLAG_CASE`, `TRIGGER_RECONCILIATION`.
  - `targetEntityType` (`string`): Target table/entity name.
  - `targetId` (`number`): Target entity PK ID.
  - `parametersPayload` (`Object`): JSON parameters.
  - `payloadHash` (`string`): SHA-256 state snapshot hash.
  - `evidenceSummary` (`string`): Structured decision evidence.
  - `confidenceScore` (`number`): Confidence rating (0–100).
  - `expiresAt` (`Date`): 5-minute TTL expiration.

### `findProposalById(id, clientConnection, forUpdate)`
- **Called by**: `assistantAction.service.js:confirmActionProposal`
- **Pessimistic Locking**: When `forUpdate = true`, appends `FOR UPDATE` to lock the row and prevent race conditions from concurrent confirmation attempts.

### `findActiveProposalsByUserId(userId)`
- **Called by**: `assistant.controller.js:getActiveProposals`
- **Filters**: Returns only proposals with `status = 'pending_confirmation'` and `expires_at > NOW()`.

### `updateProposalStatus(id, status, confirmedBy, clientConnection)`
- **Called by**: `assistantAction.service.js` upon confirmation, dismissal, or expiration.

---

## 3. Interview Preparation Q&A

**Q: Why use `FOR UPDATE` when confirming a proposal?**
> In high-concurrency environments or double-click scenarios, two confirmation requests could hit the server simultaneously. Using `SELECT ... FOR UPDATE` acquires an exclusive row lock inside the MySQL transaction, guaranteeing that only the first request can process the confirmation while subsequent requests see the updated status (`confirmed`) and abort cleanly.
