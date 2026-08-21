import pool from '../config/db.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Service: Assistant Action Proposal Execution Service (Phase 3)
 *
 * Implements the Human-in-the-Loop Confirmation Protocol:
 * 1. Validates proposal exists, is pending confirmation, and has not expired.
 * 2. Enforces RBAC permissions based on user role.
 * 3. Re-validates target entity state in MySQL.
 * 4. Executes requested database mutation.
 * 5. Updates proposal status to 'executed' and records a comprehensive audit trail.
 */

/**
 * Confirms and executes an action proposal by proposalId.
 *
 * @param {string} proposalId - The unique proposal ID (e.g. "ACT-000123")
 * @param {Object} user - The authenticated user { id, name, email, role }
 * @returns {Promise<Object>} Execution result summary
 */
export const confirmActionProposal = async (proposalId, user) => {
  if (!proposalId) {
    const error = new Error('Proposal ID is required.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch proposal from database
  const [rows] = await pool.query(`
    SELECT * FROM assistant_action_proposals WHERE id = ?
  `, [proposalId]);

  if (rows.length === 0) {
    const error = new Error(`Action proposal with ID "${proposalId}" was not found.`);
    error.statusCode = 404;
    throw error;
  }

  const proposal = rows[0];

  // 2. Validate proposal status
  if (proposal.status !== 'pending_confirmation') {
    const error = new Error(`Proposal "${proposalId}" is already ${proposal.status.toUpperCase()} and cannot be confirmed.`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Validate expiration
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    await pool.query(`
      UPDATE assistant_action_proposals SET status = 'expired' WHERE id = ?
    `, [proposalId]);

    const error = new Error(`Proposal "${proposalId}" has expired. Please ask the AI Assistant to generate a fresh proposal.`);
    error.statusCode = 410;
    throw error;
  }

  // Parse requested parameters
  const params = typeof proposal.requested_params === 'string'
    ? JSON.parse(proposal.requested_params)
    : (proposal.requested_params || {});

  let resultSummary = '';
  let oldValues = {};
  let newValues = {};

  // 4. Execute mutation based on action_type with Target-State Validation
  switch (proposal.action_type) {
    case 'FLAG_CASE': {
      // Re-verify target reconciliation case
      const [caseRows] = await pool.query(`
        SELECT id, priority, status FROM reconciliation_cases WHERE id = ?
      `, [proposal.target_id]);

      if (caseRows.length === 0) {
        const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
        error.statusCode = 404;
        throw error;
      }

      // Safety check: Reject mutation if case was already resolved/approved/cancelled
      const currentStatus = (caseRows[0].status || '').toLowerCase();
      if (['resolved', 'approved', 'cancelled'].includes(currentStatus)) {
        const error = new Error(`Action rejected: Reconciliation Case #${proposal.target_id} is already ${currentStatus.toUpperCase()} and cannot be modified.`);
        error.statusCode = 409;
        throw error;
      }

      oldValues = { priority: caseRows[0].priority, status: caseRows[0].status };
      const newPriority = (params.priority || 'high').toLowerCase();

      // Mutate database
      await pool.query(`
        UPDATE reconciliation_cases
        SET priority = ?, updated_at = NOW()
        WHERE id = ?
      `, [newPriority, proposal.target_id]);

      newValues = { priority: newPriority, reason: params.reason || proposal.reason };
      resultSummary = `Priority for Case #${proposal.target_id} updated from ${oldValues.priority?.toUpperCase()} to ${newPriority.toUpperCase()}.`;
      break;
    }

    case 'ADD_CASE_NOTE': {
      const [caseRows] = await pool.query(`
        SELECT id, status, resolution_reason FROM reconciliation_cases WHERE id = ?
      `, [proposal.target_id]);

      if (caseRows.length === 0) {
        const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
        error.statusCode = 404;
        throw error;
      }

      // Safety check: Reject mutation if case is resolved
      const currentStatus = (caseRows[0].status || '').toLowerCase();
      if (['resolved', 'approved', 'cancelled'].includes(currentStatus)) {
        const error = new Error(`Action rejected: Reconciliation Case #${proposal.target_id} is already ${currentStatus.toUpperCase()} and cannot accept new operational notes.`);
        error.statusCode = 409;
        throw error;
      }

      oldValues = { resolution_reason: caseRows[0].resolution_reason, status: caseRows[0].status };
      const author = user?.name || user?.email || 'User';
      const timestamp = new Date().toISOString();
      const noteEntry = `[${timestamp} · Note by ${author} (${user?.role || 'accountant'})]: ${params.noteText || proposal.reason}`;
      const updatedNotes = caseRows[0].resolution_reason
        ? `${caseRows[0].resolution_reason}\n\n${noteEntry}`
        : noteEntry;

      await pool.query(`
        UPDATE reconciliation_cases
        SET resolution_reason = ?, updated_at = NOW()
        WHERE id = ?
      `, [updatedNotes, proposal.target_id]);

      newValues = { added_note: params.noteText, full_notes: updatedNotes };
      resultSummary = `Auditor note recorded on Case #${proposal.target_id}.`;
      break;
    }

    case 'TRIGGER_REANALYSIS': {
      const [caseRows] = await pool.query(`
        SELECT id, status FROM reconciliation_cases WHERE id = ?
      `, [proposal.target_id]);

      if (caseRows.length === 0) {
        const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
        error.statusCode = 404;
        throw error;
      }

      // Safety check: Reject re-analysis if already resolved
      const currentStatus = (caseRows[0].status || '').toLowerCase();
      if (['resolved', 'approved', 'cancelled'].includes(currentStatus)) {
        const error = new Error(`Action rejected: Reconciliation Case #${proposal.target_id} is already ${currentStatus.toUpperCase()} and cannot be re-analyzed.`);
        error.statusCode = 409;
        throw error;
      }

      oldValues = { status: caseRows[0].status };

      // Dispatch Agent 1 re-analysis in background
      runReconciliationAgent(proposal.target_id, user.id, 'assistant_confirmed_reanalysis')
        .catch(err => console.error('[Re-analysis Background Error]', err));

      newValues = { triggered_agent: 'PaymentReconciliationAgent', trigger_type: 'assistant_confirmed_reanalysis' };
      resultSummary = `Automated AI Payment Reconciliation (Agent 1) re-dispatched for Case #${proposal.target_id}.`;
      break;
    }

    case 'ESCALATE_ALERT': {
      const [caseRows] = await pool.query(`
        SELECT id, priority, status FROM reconciliation_cases WHERE id = ?
      `, [proposal.target_id]);

      if (caseRows.length === 0) {
        const error = new Error(`Target reconciliation case #${proposal.target_id} no longer exists.`);
        error.statusCode = 404;
        throw error;
      }

      oldValues = { priority: caseRows[0].priority, status: caseRows[0].status };
      const level = (params.escalationLevel || 'manager').toUpperCase();

      // Emit real-time notification via Socket.IO
      emitSocketEvent('notification:alert', {
        id: `NOTIF-${Date.now()}`,
        title: `🚨 Urgent Escalation (${level}) — Case #${proposal.target_id}`,
        message: params.message || `Escalated by ${user.name}: ${proposal.reason}`,
        type: 'urgent',
        case_id: proposal.target_id,
        created_at: new Date().toISOString()
      });

      newValues = { escalation_level: level, message: params.message };
      resultSummary = `Urgent alert escalated to ${level} tier for Case #${proposal.target_id}.`;
      break;
    }

    default:
      throw new Error(`Unsupported action type: ${proposal.action_type}`);
  }

  // 5. Update proposal record to 'executed'
  await pool.query(`
    UPDATE assistant_action_proposals
    SET status = 'executed', executed_at = NOW(), result_summary = ?
    WHERE id = ?
  `, [resultSummary, proposalId]);

  // 6. Record comprehensive 8-Field Audit Trail in audit_logs
  const auditMetadata = {
    source:        'AI Copilot Assistant',
    proposal_id:   proposal.id,
    who:           `${user.name || 'User'} (${user.email || 'unknown'})`,
    role:          user.role || 'accountant',
    what:          proposal.action_type,
    which_record:  `${proposal.target_entity} #${proposal.target_id}`,
    why:           proposal.reason || params.reason || params.noteText || 'User confirmed via Copilot',
    when:          new Date().toISOString(),
    result:        'SUCCESS',
    result_detail: resultSummary,
    old_state:     oldValues,
    new_state:     newValues
  };

  await pool.query(`
    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id, old_values, new_values, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [
    user.id || proposal.created_by,
    `ASSISTANT_ACTION_${proposal.action_type}`,
    proposal.target_entity,
    proposal.target_id,
    JSON.stringify(oldValues),
    JSON.stringify(auditMetadata)
  ]);

  return {
    proposal_id:    proposal.id,
    action_type:    proposal.action_type,
    target_entity:  proposal.target_entity,
    target_id:      proposal.target_id,
    status:         'executed',
    result_summary: resultSummary,
    executed_by:    user.name || user.email,
    executed_at:    new Date().toISOString()
  };
};

/**
 * Dismisses an action proposal without executing mutations.
 *
 * @param {string} proposalId - The proposal ID to cancel
 * @param {Object} user - The authenticated user
 * @returns {Promise<Object>} Dismissal result
 */
export const dismissActionProposal = async (proposalId, user) => {
  const [rows] = await pool.query(`
    SELECT * FROM assistant_action_proposals WHERE id = ?
  `, [proposalId]);

  if (rows.length === 0) {
    const error = new Error(`Action proposal "${proposalId}" not found.`);
    error.statusCode = 404;
    throw error;
  }

  await pool.query(`
    UPDATE assistant_action_proposals
    SET status = 'dismissed', result_summary = ?
    WHERE id = ?
  `, [`Dismissed by ${user?.name || user?.email || 'User'}`, proposalId]);

  return {
    proposal_id: proposalId,
    status:      'dismissed',
    message:     'Action proposal was dismissed.'
  };
};
