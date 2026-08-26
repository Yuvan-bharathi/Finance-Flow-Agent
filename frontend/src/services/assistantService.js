import api from './api';

/**
 * Service: AI Operational Copilot API Client (Phase 7)
 *
 * Provides frontend functions to interact with the AI Assistant backend,
 * retrieve active proposals, confirm proposals with Idempotency keys, and dismiss proposals.
 */

/**
 * Sends the user's message along with conversation history and current context.
 */
export const sendMessage = (message, conversationHistory = [], contextPayload = {}) =>
  api.post('/assistant/chat', { message, conversationHistory, contextPayload });

/**
 * Retrieves active pending proposals for the authenticated user.
 */
export const getActiveProposals = () =>
  api.get('/assistant/proposals');

/**
 * Confirms and executes an action proposal with Idempotency Key protection.
 *
 * @param {number|string} proposalId - Proposal ID
 * @param {string} [idempotencyKey] - Optional idempotency key to prevent double clicks
 */
export const confirmProposal = (proposalId, idempotencyKey = null) => {
  const key = idempotencyKey || `IDEMP-ACT-${proposalId}-${Date.now()}`;
  return api.post(`/assistant/proposals/${proposalId}/confirm`, {}, {
    headers: { 'Idempotency-Key': key }
  });
};

/**
 * Dismisses an action proposal without executing mutations.
 */
export const dismissProposal = (proposalId) =>
  api.post(`/assistant/proposals/${proposalId}/dismiss`);

/**
 * Pre-loads a record's context when user clicks [Ask AI] on a specific record.
 */
export const wakeContext = (recordType, recordId) =>
  api.get(`/assistant/wake/${recordType}/${recordId}`);
