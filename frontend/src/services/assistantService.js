import api from './api';

/**
 * Service: AI Copilot API Client
 *
 * Purpose:
 *   Frontend functions to interact with the AI Assistant backend.
 *
 * Called by:
 *   - frontend/src/components/AiCopilotPanel.jsx
 *
 * Data flow:
 *   AiCopilotPanel → sendMessage() → POST /api/assistant/chat → Groq + MySQL
 *   [Ask AI] button → wakeContext() → GET /api/assistant/wake/:type/:id → context meta
 */

/**
 * sendMessage
 *
 * Sends the user's message along with conversation history and current context.
 * Backend returns: { answer, sources[], suggestedActions[], total_tokens }
 *
 * @param {string} message              - User's current message
 * @param {Array}  conversationHistory  - Last N messages [{ role, content }] (max 10)
 * @param {Object} contextPayload       - { page, recordType, recordId }
 * @returns {Promise<AxiosResponse>}
 */
export const sendMessage = (message, conversationHistory = [], contextPayload = {}) =>
  api.post('/assistant/chat', { message, conversationHistory, contextPayload });

/**
 * wakeContext
 *
 * Pre-loads a record's context when user clicks [Ask AI] on a specific record.
 * Returns: { title, snippet } for the copilot panel context badge.
 *
 * @param {string} recordType - 'payment' | 'reconciliation_case' | 'company' | 'loan'
 * @param {number} recordId   - Primary key of the record
 * @returns {Promise<AxiosResponse>}
 */
export const wakeContext = (recordType, recordId) =>
  api.get(`/assistant/wake/${recordType}/${recordId}`);

/**
 * confirmProposal (Phase 3)
 *
 * Executes a pending action proposal with human confirmation.
 *
 * @param {string} proposalId - Unique action proposal ID (e.g. "ACT-000123")
 * @returns {Promise<AxiosResponse>}
 */
export const confirmProposal = (proposalId) =>
  api.post('/assistant/actions/confirm', { proposalId });

/**
 * dismissProposal (Phase 3)
 *
 * Dismisses an action proposal without executing mutations.
 *
 * @param {string} proposalId - Unique action proposal ID
 * @returns {Promise<AxiosResponse>}
 */
export const dismissProposal = (proposalId) =>
  api.post('/assistant/actions/dismiss', { proposalId });

