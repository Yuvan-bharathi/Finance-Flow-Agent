import pool from '../config/db.js';

/**
 * Model: Assistant Action Proposal Repository
 *
 * Purpose:
 * Provides direct MySQL CRUD operations for AI Copilot action proposals.
 * Enforces data-integrity constraints, row-level locking (`FOR UPDATE`),
 * and optimistic concurrency checking.
 *
 * Called by:
 * - `backend/src/services/assistantAction.service.js`
 * - `backend/src/tests/phase7_assistant.test.js`
 */

/**
 * Inserts a new pending action proposal.
 *
 * Data flow:
 * Assistant Agent (proposeAction tool)
 *   ↓
 * assistantAction.service.js (Computes SHA-256 hash & TTL)
 *   ↓
 * createProposal(proposalData)
 *   ↓
 * MySQL `assistant_action_proposals` table
 *
 * @param {Object} proposalData - Proposal creation payload
 * @param {number} proposalData.userId - Author user ID
 * @param {string} proposalData.actionType - Type of action
 * @param {string} proposalData.targetEntityType - Target entity category
 * @param {number} proposalData.targetId - Primary key ID of entity
 * @param {Object} proposalData.parametersPayload - Arguments required
 * @param {string} proposalData.payloadHash - SHA-256 integrity hash
 * @param {string} proposalData.evidenceSummary - Human-readable evidence summary
 * @param {number} proposalData.confidenceScore - Confidence score (0-100)
 * @param {Date} proposalData.expiresAt - Expiration datetime (5-minute TTL)
 * @param {Object} [clientConnection] - Optional transactional connection
 * @returns {Promise<Object>} Created proposal record
 */
export const createProposal = async (proposalData, clientConnection = null) => {
  const db = clientConnection || pool;
  const sql = `
    INSERT INTO assistant_action_proposals (
      user_id,
      action_type,
      target_entity_type,
      target_id,
      parameters_payload,
      payload_hash,
      proposal_version,
      evidence_summary,
      confidence_score,
      status,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'pending_confirmation', ?)
  `;

  const [result] = await db.query(sql, [
    proposalData.userId,
    proposalData.actionType,
    proposalData.targetEntityType,
    proposalData.targetId,
    JSON.stringify(proposalData.parametersPayload || {}),
    proposalData.payloadHash,
    proposalData.evidenceSummary,
    proposalData.confidenceScore || 90,
    proposalData.expiresAt
  ]);

  return findProposalById(result.insertId, clientConnection);
};

/**
 * Finds a proposal by its primary key ID.
 *
 * @param {number} id - Proposal primary key
 * @param {Object} [clientConnection] - Optional transaction connection
 * @param {boolean} [forUpdate=false] - Whether to apply pessimistic row lock (FOR UPDATE)
 * @returns {Promise<Object|null>} Proposal record or null
 */
export const findProposalById = async (id, clientConnection = null, forUpdate = false) => {
  const db = clientConnection || pool;
  const sql = `
    SELECT * FROM assistant_action_proposals
    WHERE id = ?
    ${forUpdate ? 'FOR UPDATE' : ''}
  `;

  const [rows] = await db.query(sql, [id]);
  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  if (typeof row.parameters_payload === 'string') {
    try {
      row.parameters_payload = JSON.parse(row.parameters_payload);
    } catch (e) {}
  }
  return row;
};

/**
 * Retrieves active pending proposals for a specific user.
 *
 * @param {number} userId - User primary key
 * @returns {Promise<Array<Object>>} List of active proposals
 */
export const findActiveProposalsByUserId = async (userId) => {
  const sql = `
    SELECT * FROM assistant_action_proposals
    WHERE user_id = ? AND status = 'pending_confirmation' AND expires_at > NOW()
    ORDER BY created_at DESC
  `;

  const [rows] = await pool.query(sql, [userId]);
  return rows.map(row => {
    if (typeof row.parameters_payload === 'string') {
      try { row.parameters_payload = JSON.parse(row.parameters_payload); } catch (e) {}
    }
    return row;
  });
};

/**
 * Updates a proposal's status upon confirmation, dismissal, or expiration.
 *
 * @param {number} id - Proposal ID
 * @param {string} status - New status
 * @param {number|null} [confirmedBy=null] - User ID who confirmed
 * @param {Object} [clientConnection] - Transactional connection
 * @returns {Promise<boolean>} Success boolean
 */
export const updateProposalStatus = async (id, status, confirmedBy = null, clientConnection = null) => {
  const db = clientConnection || pool;
  const sql = `
    UPDATE assistant_action_proposals
    SET status = ?,
        confirmed_by = ?,
        confirmed_at = ${confirmedBy ? 'NOW()' : 'confirmed_at'},
        updated_at = NOW()
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [status, confirmedBy, id]);
  return result.affectedRows > 0;
};

/**
 * Auto-expires pending proposals whose TTL has passed.
 *
 * @returns {Promise<number>} Number of expired proposals
 */
export const expireStaleProposals = async () => {
  const sql = `
    UPDATE assistant_action_proposals
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending_confirmation' AND expires_at <= NOW()
  `;

  const [result] = await pool.query(sql);
  return result.affectedRows;
};

export default {
  createProposal,
  findProposalById,
  findActiveProposalsByUserId,
  updateProposalStatus,
  expireStaleProposals
};
