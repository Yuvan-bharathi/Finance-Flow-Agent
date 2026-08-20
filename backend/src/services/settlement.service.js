import pool from '../config/db.js';
import { findRecommendationById } from '../models/aiRecommendation.model.js';
import { findCaseById } from '../models/reconciliationCase.model.js';
import { insertPaymentAllocation, findAllPaymentAllocations } from '../models/allocation.model.js';
import { findScheduleById } from '../models/repayment.model.js';
import { findPaymentById } from '../models/payment.model.js';
import { insertAuditLog, findAllAuditLogs } from '../models/auditLog.model.js';

/**
 * Service: Settlement & Human Approval Service
 * Purpose: Business logic for Human-in-the-Loop financial ledger settlement (Approve, Reject, Manual Override).
 * 
 * Called by:
 * - settlement.controller.js
 */

/**
 * Approves an AI Recommendation and executes official financial ledger allocation.
 * Uses a MySQL ACID transaction.
 * 
 * Called by:
 * - settlement.controller.js -> approveRecommendation
 * 
 * @param {number} recommendationId - AI Recommendation ID.
 * @param {number} approvedByUserId - Authenticated user ID approving the recommendation.
 * @param {string|null} notes - Optional reviewer notes.
 * @param {string|null} ipAddress - Client IP address.
 * @returns {Promise<Object>} Created allocation & updated records.
 */
export const approveRecommendationService = async (recommendationId, approvedByUserId, notes = null, ipAddress = null) => {
  // 1. Retrieve recommendation details
  const rec = await findRecommendationById(recommendationId);
  if (!rec) {
    const error = new Error(`AI Recommendation with ID ${recommendationId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (rec.status !== 'pending') {
    const error = new Error(`AI Recommendation #${recommendationId} has already been processed (status: '${rec.status}').`);
    error.statusCode = 400;
    throw error;
  }

  if (!rec.recommended_schedule_id) {
    const error = new Error(`Cannot approve AI Recommendation #${recommendationId} because no target repayment schedule was recommended by the AI.`);
    error.statusCode = 400;
    throw error;
  }

  const payment = await findPaymentById(rec.payment_id);
  const schedule = await findScheduleById(rec.recommended_schedule_id);

  if (!payment || !schedule) {
    const error = new Error('Associated payment or repayment schedule record not found.');
    error.statusCode = 404;
    throw error;
  }

  const allocatedAmount = parseFloat(payment.amount);

  // 2. MySQL ACID Transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Insert official ledger allocation
    const allocId = await insertPaymentAllocation({
      payment_id: rec.payment_id,
      repayment_schedule_id: rec.recommended_schedule_id,
      allocated_amount: allocatedAmount.toFixed(2),
      approved_by: approvedByUserId,
      allocation_type: 'ai_approved'
    }, connection);

    // B. Update Repayment Schedule balance & status
    const currentPaid = parseFloat(schedule.paid_amount);
    const newPaid = currentPaid + allocatedAmount;
    const scheduledTotal = parseFloat(schedule.scheduled_amount);
    const newScheduleStatus = newPaid >= scheduledTotal ? 'paid' : 'partially_paid';

    await connection.execute(
      `UPDATE repayment_schedules SET paid_amount = ?, status = ? WHERE id = ?;`,
      [newPaid.toFixed(2), newScheduleStatus, rec.recommended_schedule_id]
    );

    // C. Update Payment status
    const newPaymentStatus = allocatedAmount >= parseFloat(payment.amount) ? 'completed' : 'partially_allocated';
    await connection.execute(
      `UPDATE payments SET status = ? WHERE id = ?;`,
      [newPaymentStatus, rec.payment_id]
    );

    // D. Update AI Recommendation status
    await connection.execute(
      `UPDATE ai_recommendations 
       SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ?
       WHERE id = ?;`,
      [approvedByUserId, notes || 'Approved by human accountant', recommendationId]
    );

    // E. Update Reconciliation Case status to resolved
    await connection.execute(
      `UPDATE reconciliation_cases 
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP 
       WHERE id = ?;`,
      [rec.reconciliation_case_id]
    );

    // F. Create immutable compliance Audit Log
    await insertAuditLog({
      user_id: approvedByUserId,
      action: 'APPROVE_PAYMENT_ALLOCATION',
      entity_type: 'payment_allocations',
      entity_id: allocId,
      old_values: {
        payment_status: payment.status,
        schedule_paid_amount: schedule.paid_amount,
        schedule_status: schedule.status
      },
      new_values: {
        allocation_id: allocId,
        allocated_amount: allocatedAmount,
        schedule_new_paid: newPaid,
        schedule_new_status: newScheduleStatus,
        payment_new_status: newPaymentStatus
      },
      ip_address: ipAddress
    }, connection);

    await connection.commit();
    connection.release();

    return {
      allocation_id: allocId,
      payment_id: rec.payment_id,
      repayment_schedule_id: rec.recommended_schedule_id,
      allocated_amount: allocatedAmount,
      status: 'APPROVED'
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

/**
 * Rejects an AI Recommendation.
 * 
 * Called by:
 * - settlement.controller.js -> rejectRecommendation
 * 
 * @param {number} recommendationId - AI Recommendation ID.
 * @param {number} rejectedByUserId - Authenticated user ID.
 * @param {string} reason - Rejection reason.
 * @param {string|null} ipAddress - Client IP address.
 */
export const rejectRecommendationService = async (recommendationId, rejectedByUserId, reason = 'Rejected by accountant', ipAddress = null) => {
  const rec = await findRecommendationById(recommendationId);
  if (!rec) {
    const error = new Error(`AI Recommendation with ID ${recommendationId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Update AI Recommendation status
    await connection.execute(
      `UPDATE ai_recommendations 
       SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ?
       WHERE id = ?;`,
      [rejectedByUserId, reason, recommendationId]
    );

    // B. Update Reconciliation Case status to 'under_review' for manual investigation
    await connection.execute(
      `UPDATE reconciliation_cases 
       SET status = 'under_review', resolution_reason = ?
       WHERE id = ?;`,
      [reason, rec.reconciliation_case_id]
    );

    // C. Write to audit logs
    await insertAuditLog({
      user_id: rejectedByUserId,
      action: 'REJECT_AI_RECOMMENDATION',
      entity_type: 'ai_recommendations',
      entity_id: recommendationId,
      old_values: { status: rec.status },
      new_values: { status: 'rejected', reason },
      ip_address: ipAddress
    }, connection);

    await connection.commit();
    connection.release();

    return {
      recommendation_id: recommendationId,
      case_id: rec.reconciliation_case_id,
      status: 'REJECTED'
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

/**
 * Overrides an AI recommendation and manually maps a payment to a repayment schedule.
 * Requires mandatory override_reason string.
 * 
 * Called by:
 * - settlement.controller.js -> overrideRecommendation
 * 
 * @param {number} caseId - Case ID.
 * @param {Object} overrideData - `{ repayment_schedule_id, allocated_amount, override_reason }`.
 * @param {Object} user - Authenticated user object.
 * @param {string|null} ipAddress - Client IP address.
 */
export const overrideRecommendationService = async (caseId, overrideData, user, ipAddress = null) => {
  const { repayment_schedule_id, allocated_amount, override_reason } = overrideData;

  if (!repayment_schedule_id || !allocated_amount || !override_reason) {
    const error = new Error('repayment_schedule_id, allocated_amount, and override_reason are required for an accountant override.');
    error.statusCode = 400;
    throw error;
  }

  const caseDetails = await findCaseById(caseId);
  if (!caseDetails) {
    const error = new Error(`Reconciliation case with ID ${caseId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const schedule = await findScheduleById(repayment_schedule_id);
  if (!schedule) {
    const error = new Error(`Target repayment schedule with ID ${repayment_schedule_id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const payment = await findPaymentById(caseDetails.payment_id);
  const allocAmount = parseFloat(allocated_amount);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Insert payment allocation with allocation_type='ai_overridden'
    const allocId = await insertPaymentAllocation({
      payment_id: caseDetails.payment_id,
      repayment_schedule_id,
      allocated_amount: allocAmount.toFixed(2),
      approved_by: user.id,
      allocation_type: 'ai_overridden'
    }, connection);

    // B. Update schedule
    const newPaid = parseFloat(schedule.paid_amount) + allocAmount;
    const newScheduleStatus = newPaid >= parseFloat(schedule.scheduled_amount) ? 'paid' : 'partially_paid';
    await connection.execute(
      `UPDATE repayment_schedules SET paid_amount = ?, status = ? WHERE id = ?;`,
      [newPaid.toFixed(2), newScheduleStatus, repayment_schedule_id]
    );

    // C. Update payment status
    await connection.execute(
      `UPDATE payments SET status = 'completed' WHERE id = ?;`,
      [caseDetails.payment_id]
    );

    // D. Mark existing AI recommendations as overridden
    await connection.execute(
      `UPDATE ai_recommendations SET status = 'overridden', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ? WHERE reconciliation_case_id = ?;`,
      [user.id, override_reason, caseId]
    );

    // E. Resolve case
    await connection.execute(
      `UPDATE reconciliation_cases SET status = 'resolved', resolution_reason = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      [override_reason, caseId]
    );

    // F. Audit log with mandatory override_reason
    await insertAuditLog({
      user_id: user.id,
      action: 'OVERRIDE_RECONCILIATION',
      entity_type: 'payment_allocations',
      entity_id: allocId,
      old_values: { case_status: caseDetails.status },
      new_values: {
        allocation_id: allocId,
        repayment_schedule_id,
        allocated_amount: allocAmount,
        override_reason
      },
      ip_address: ipAddress
    }, connection);

    await connection.commit();
    connection.release();

    return {
      allocation_id: allocId,
      case_id: caseId,
      override_reason,
      status: 'OVERRIDDEN_AND_RESOLVED'
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

/**
 * Retrieves all payment allocations.
 */
export const getAllAllocationsService = async () => {
  return await findAllPaymentAllocations();
};

/**
 * Retrieves audit logs.
 */
export const getAuditLogsService = async (filters = {}) => {
  return await findAllAuditLogs(filters);
};
