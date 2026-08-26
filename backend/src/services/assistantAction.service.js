import crypto from 'crypto';
import pool from '../config/db.js';
import { createProposal, findProposalById, updateProposalStatus } from '../models/assistantAction.model.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import { checkRoleHasPermission, PERMISSIONS } from '../config/permissions.js';
import { createAuditLog } from '../models/auditLog.model.js';
import { emitSocketEvent } from '../config/socket.js';
import logger from '../utils/logger.js';

/**
 * Service: Assistant Action Proposal Execution & Safety Service (Phase 7)
 *
 * Implements the Human-in-the-Loop Confirmation Protocol:
 * 1. Read-first AI model: LLM never executes direct mutations.
 * 2. Generates proposals with 5-minute TTL and SHA-256 integrity hash.
 * 3. Enforces inline TTL validation, PBAC role checking, and payload integrity.
 * 4. Executes mutations inside an ACID MySQL transaction with row-level locking (`FOR UPDATE`).
 * 5. Records immutable audit logs with before/after JSON diffs.
 * 6. Broadcasts real-time WebSocket state updates.
 */

/**
 * Computes SHA-256 payload integrity hash.
 */
export const computeProposalHash = (actionType, targetEntityType, targetId, parametersPayload) => {
  const serialized = `${actionType}|${targetEntityType}|${targetId}|${JSON.stringify(parametersPayload || {})}`;
  return crypto.createHash('sha256').update(serialized).digest('hex');
};

/**
 * Generates and stores a new pending action proposal.
 *
 * @param {Object} data - Action proposal details
 * @param {number} data.userId - User initiating the conversation
 * @param {string} data.actionType - Type of mutation
 * @param {string} data.targetEntityType - Entity category
 * @param {number} data.targetId - Target entity PK ID
 * @param {Object} [data.parametersPayload={}] - Mutation arguments
 * @param {string} data.evidenceSummary - Decision evidence bullet points
 * @param {number} [data.confidenceScore=90] - AI confidence rating
 * @returns {Promise<Object>} Created proposal record
 */
export const generateActionProposal = async (data) => {
  const {
    userId,
    actionType,
    targetEntityType,
    targetId,
    parametersPayload = {},
    evidenceSummary,
    confidenceScore = 90
  } = data;

  const payloadHash = computeProposalHash(actionType, targetEntityType, targetId, parametersPayload);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-Minute Safety TTL

  const proposal = await createProposal({
    userId,
    actionType,
    targetEntityType,
    targetId,
    parametersPayload,
    payloadHash,
    evidenceSummary: evidenceSummary || 'AI recommended action based on financial analysis.',
    confidenceScore,
    expiresAt
  });

  logger.info(`[ActionProposal] Generated proposal #${proposal.id} for ${actionType} on ${targetEntityType} #${targetId}`, {
    userId,
    proposalId: proposal.id,
    actionType
  });

  return proposal;
};

/**
 * Maps action types to required PBAC permissions.
 */
const getRequiredPermissionForAction = (actionType) => {
  switch (actionType) {
    case 'FLAG_CASE':
    case 'UPDATE_PRIORITY':
    case 'ADD_CASE_NOTE':
      return PERMISSIONS.CASE_VIEW; // All authenticated finance staff can add notes/flags
    case 'TRIGGER_RECONCILIATION':
    case 'TRIGGER_PIPELINE':
      return PERMISSIONS.AGENT_RUN;
    case 'ESCALATE_COLLECTION':
      return PERMISSIONS.CASE_APPROVE;
    default:
      return PERMISSIONS.CASE_VIEW;
  }
};

/**
 * Confirms and executes an action proposal inside an ACID MySQL transaction.
 *
 * @param {number} proposalId - Proposal ID to confirm
 * @param {Object} user - Authenticated user context { id, role, role_name }
 * @param {Object} [options={}] - Optional execution options (correlationId, ipAddress)
 * @returns {Promise<Object>} Execution result summary
 */
export const confirmActionProposal = async (proposalId, user, options = {}) => {
  const correlationId = options.correlationId || `ACT-CONFIRM-${Date.now()}`;
  const ipAddress = options.ipAddress || '127.0.0.1';
  const userRole = user?.role_name || user?.role;

  if (!proposalId) {
    const error = new Error('Proposal ID is required.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Pessimistic Row Lock on Proposal
    const proposal = await findProposalById(proposalId, connection, true);

    if (!proposal) {
      const error = new Error(`Action proposal with ID "${proposalId}" was not found.`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate Status
    if (proposal.status !== 'pending_confirmation') {
      const error = new Error(`Proposal #${proposalId} is already ${proposal.status.toUpperCase()} and cannot be confirmed.`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Inline TTL Expiration Validation
    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      await updateProposalStatus(proposalId, 'expired', null, connection);
      await connection.commit();

      const error = new Error(`Proposal #${proposalId} has expired (5-minute TTL). Please ask the AI Assistant to generate a fresh recommendation.`);
      error.statusCode = 410; // HTTP 410 Gone
      throw error;
    }

    // 4. PBAC Authorization Check
    const requiredPermission = getRequiredPermissionForAction(proposal.action_type);
    if (!checkRoleHasPermission(userRole, requiredPermission)) {
      const error = new Error(`Access denied. Your role '${userRole}' does not possess permission '${requiredPermission}' required to execute '${proposal.action_type}'.`);
      error.statusCode = 403;
      throw error;
    }

    // 5. Payload / Version Hash Integrity Verification
    const currentHash = computeProposalHash(
      proposal.action_type,
      proposal.target_entity_type,
      proposal.target_id,
      proposal.parameters_payload
    );

    if (proposal.payload_hash && proposal.payload_hash !== currentHash) {
      const error = new Error(`Payload integrity verification failed for proposal #${proposalId}. Parameters have been modified.`);
      error.statusCode = 422;
      throw error;
    }

    // 6. Execute ACID State Mutation based on Action Type
    let oldState = {};
    let newState = {};
    let resultSummary = '';
    const params = proposal.parameters_payload || {};

    switch (proposal.action_type) {
      case 'FLAG_CASE':
      case 'UPDATE_PRIORITY': {
        const [caseRows] = await connection.query(
          'SELECT id, priority, status FROM reconciliation_cases WHERE id = ? FOR UPDATE',
          [proposal.target_id]
        );

        if (caseRows.length === 0) {
          const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
          error.statusCode = 404;
          throw error;
        }

        const currentCase = caseRows[0];
        oldState = { priority: currentCase.priority, status: currentCase.status };
        const newPriority = (params.priority || 'high').toLowerCase();

        await connection.query(
          'UPDATE reconciliation_cases SET priority = ?, updated_at = NOW() WHERE id = ?',
          [newPriority, proposal.target_id]
        );

        newState = { priority: newPriority, status: currentCase.status };
        resultSummary = `Reconciliation Case #${proposal.target_id} priority updated from ${oldState.priority?.toUpperCase()} to ${newPriority.toUpperCase()}.`;
        break;
      }

      case 'ADD_CASE_NOTE': {
        const [caseRows] = await connection.query(
          'SELECT id, status, resolution_reason FROM reconciliation_cases WHERE id = ? FOR UPDATE',
          [proposal.target_id]
        );

        if (caseRows.length === 0) {
          const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
          error.statusCode = 404;
          throw error;
        }

        const currentCase = caseRows[0];
        oldState = { resolution_reason: currentCase.resolution_reason };

        const authorName = user?.name || user?.email || 'Finance Officer';
        const timestamp = new Date().toISOString();
        const noteText = params.noteText || params.note || proposal.evidence_summary;
        const noteEntry = `[${timestamp} · Note by ${authorName}]: ${noteText}`;
        const updatedNotes = currentCase.resolution_reason
          ? `${currentCase.resolution_reason}\n\n${noteEntry}`
          : noteEntry;

        await connection.query(
          'UPDATE reconciliation_cases SET resolution_reason = ?, updated_at = NOW() WHERE id = ?',
          [updatedNotes, proposal.target_id]
        );

        newState = { resolution_reason: updatedNotes };
        resultSummary = `Operational note recorded on Case #${proposal.target_id}.`;
        break;
      }

      case 'TRIGGER_RECONCILIATION': {
        const [caseRows] = await connection.query(
          'SELECT id, status FROM reconciliation_cases WHERE id = ? FOR UPDATE',
          [proposal.target_id]
        );

        if (caseRows.length === 0) {
          const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
          error.statusCode = 404;
          throw error;
        }

        oldState = { status: caseRows[0].status };
        newState = { triggered_agent: 'PaymentReconciliationAgent', status: 'ai_analyzing' };

        await connection.query(
          "UPDATE reconciliation_cases SET status = 'ai_analyzing', updated_at = NOW() WHERE id = ?",
          [proposal.target_id]
        );

        // Async agent trigger after transaction commit
        setImmediate(() => {
          runReconciliationAgent(proposal.target_id, user.id, 'copilot_confirmed_trigger')
            .catch(err => logger.error(`[Copilot Agent Trigger Error] ${err.message}`));
        });

        resultSummary = `AI Payment Reconciliation (Agent 1) re-dispatched for Case #${proposal.target_id}.`;
        break;
      }

      default:
        resultSummary = `Action '${proposal.action_type}' successfully executed on ${proposal.target_entity_type} #${proposal.target_id}.`;
        break;
    }

    // 7. Update Proposal Status to 'confirmed'
    await connection.query(
      "UPDATE assistant_action_proposals SET status = 'confirmed', confirmed_by = ?, confirmed_at = NOW(), updated_at = NOW() WHERE id = ?",
      [user.id, proposalId]
    );

    // 8. Immutable Audit Trail Entry
    await createAuditLog({
      userId: user.id,
      action: `ASSISTANT_ACTION_${proposal.action_type}`,
      entityType: proposal.target_entity_type,
      entityId: proposal.target_id,
      oldValues: oldState,
      newValues: {
        ...newState,
        source: 'AI Copilot Assistant',
        proposal_id: proposal.id,
        evidence_summary: proposal.evidence_summary,
        confirmed_by: user.name || user.email,
        result_summary: resultSummary
      },
      ipAddress,
      correlationId
    }, connection);

    // Commit Transaction
    await connection.commit();

    logger.info(`[ActionProposal] Successfully confirmed proposal #${proposalId} (${proposal.action_type})`, {
      userId: user.id,
      proposalId,
      correlationId
    });

    // 9. Real-Time WebSocket Notification
    emitSocketEvent('ASSISTANT_ACTION_CONFIRMED', {
      proposal_id: proposal.id,
      action_type: proposal.action_type,
      target_entity_type: proposal.target_entity_type,
      target_id: proposal.target_id,
      confirmed_by: user.name || user.email,
      result_summary: resultSummary,
      timestamp: new Date().toISOString()
    });

    return {
      proposal_id: proposal.id,
      action_type: proposal.action_type,
      target_entity_type: proposal.target_entity_type,
      target_id: proposal.target_id,
      status: 'confirmed',
      result_summary: resultSummary,
      confirmed_by: user.name || user.email,
      confirmed_at: new Date().toISOString(),
      correlation_id: correlationId
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Dismisses an action proposal without mutating financial records.
 *
 * @param {number} proposalId - Proposal ID to dismiss
 * @param {Object} user - Authenticated user context
 * @returns {Promise<Object>} Dismissal confirmation
 */
export const dismissActionProposal = async (proposalId, user) => {
  const proposal = await findProposalById(proposalId);

  if (!proposal) {
    const error = new Error(`Action proposal with ID "${proposalId}" was not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (proposal.status !== 'pending_confirmation') {
    const error = new Error(`Proposal #${proposalId} is already ${proposal.status.toUpperCase()} and cannot be dismissed.`);
    error.statusCode = 400;
    throw error;
  }

  await updateProposalStatus(proposalId, 'dismissed');

  logger.info(`[ActionProposal] Proposal #${proposalId} dismissed by user #${user.id}`);

  return {
    proposal_id: proposal.id,
    status: 'dismissed',
    message: 'Action proposal was dismissed without executing mutations.'
  };
};

export default {
  computeProposalHash,
  generateActionProposal,
  confirmActionProposal,
  dismissActionProposal
};
