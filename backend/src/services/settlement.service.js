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
 */

/**
 * Approves an AI Recommendation and executes official financial ledger allocation.
 * Uses a MySQL ACID transaction.
 */
export const approveRecommendationService = async (recommendationId, approvedByUserId, notes = null, ipAddress = null, correlationId = null) => {
  // 1. Retrieve recommendation details
  const rec = await findRecommendationById(recommendationId);
  if (!rec) {
    const error = new Error(`AI Recommendation with ID ${recommendationId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Idempotency: If already approved, return success safely
  if (rec.status === 'approved') {
    return {
      already_approved: true,
      recommendation_id: recommendationId,
      payment_id: rec.payment_id,
      repayment_schedule_id: rec.recommended_schedule_id,
      status: 'APPROVED'
    };
  }

  let targetScheduleId = rec.recommended_schedule_id;
  if (!targetScheduleId && rec.recommended_loan_id) {
    const [openSchedules] = await pool.query(
      `SELECT id FROM repayment_schedules WHERE loan_id = ? ORDER BY CASE WHEN status = 'overdue' THEN 1 WHEN status = 'pending' THEN 2 ELSE 3 END, installment_number ASC LIMIT 1;`,
      [rec.recommended_loan_id]
    );
    if (openSchedules.length > 0) {
      targetScheduleId = openSchedules[0].id;
    }
  }

  if (!targetScheduleId) {
    const error = new Error(`Cannot approve AI Recommendation #${recommendationId} because no matching repayment schedule exists for this loan.`);
    error.statusCode = 400;
    throw error;
  }

  const payment = await findPaymentById(rec.payment_id);
  const schedule = await findScheduleById(targetScheduleId);

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
      repayment_schedule_id: targetScheduleId,
      allocated_amount: allocatedAmount.toFixed(2),
      approved_by: approvedByUserId,
      allocation_type: 'ai_approved'
    }, connection);

    // B. Update Repayment Schedule balance & status
    const currentPaid = parseFloat(schedule.paid_amount || 0);
    const newPaid = currentPaid + allocatedAmount;
    const scheduledTotal = parseFloat(schedule.scheduled_amount);
    const newScheduleStatus = newPaid >= scheduledTotal ? 'paid' : 'partially_paid';

    await connection.execute(
      `UPDATE repayment_schedules SET paid_amount = ?, status = ? WHERE id = ?;`,
      [newPaid.toFixed(2), newScheduleStatus, targetScheduleId]
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
       SET status = 'approved', recommended_schedule_id = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ?
       WHERE id = ?;`,
      [targetScheduleId, approvedByUserId, notes || 'Approved by human accountant', recommendationId]
    );

    // E. Update Reconciliation Case status
    await connection.execute(
      `UPDATE reconciliation_cases 
       SET status = 'approved', resolved_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [rec.reconciliation_case_id]
    );

    // F. Write to audit logs
    await insertAuditLog({
      user_id: approvedByUserId,
      action: 'APPROVE_AI_RECOMMENDATION',
      entity_type: 'payment_allocations',
      entity_id: allocId,
      old_values: {
        recommendation_status: rec.status,
        schedule_paid_amount: currentPaid,
        schedule_status: schedule.status,
        payment_status: payment.status
      },
      new_values: {
        allocation_id: allocId,
        allocated_amount: allocatedAmount,
        schedule_new_paid: newPaid,
        schedule_new_status: newScheduleStatus,
        payment_new_status: newPaymentStatus
      },
      ip_address: ipAddress,
      correlation_id: correlationId
    }, connection);

    await connection.commit();
    connection.release();

    return {
      allocation_id: allocId,
      payment_id: rec.payment_id,
      repayment_schedule_id: targetScheduleId,
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
 * Rejects an AI Recommendation (with full ledger rollback support if previously approved).
 */
export const rejectRecommendationService = async (recommendationId, rejectedByUserId, reason = 'Rejected by accountant', ipAddress = null, correlationId = null) => {
  const rec = await findRecommendationById(recommendationId);
  if (!rec) {
    const error = new Error(`AI Recommendation with ID ${recommendationId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // If recommendation was previously approved, reverse any previous allocations for this payment
    const [allocations] = await connection.execute(
      `SELECT * FROM payment_allocations WHERE payment_id = ?;`,
      [rec.payment_id]
    );

    for (const alloc of allocations) {
      const [schedRows] = await connection.execute(
        `SELECT * FROM repayment_schedules WHERE id = ?;`,
        [alloc.repayment_schedule_id]
      );
      if (schedRows.length > 0) {
        const sched = schedRows[0];
        const revPaid = Math.max(0, parseFloat(sched.paid_amount || 0) - parseFloat(alloc.allocated_amount));
        const revStatus = revPaid >= parseFloat(sched.scheduled_amount) ? 'paid' : (revPaid > 0 ? 'partially_paid' : 'pending');
        await connection.execute(
          `UPDATE repayment_schedules SET paid_amount = ?, status = ? WHERE id = ?;`,
          [revPaid.toFixed(2), revStatus, alloc.repayment_schedule_id]
        );
      }
      await connection.execute(`DELETE FROM payment_allocations WHERE id = ?;`, [alloc.id]);
    }

    // Reset payment status to unmatched
    await connection.execute(`UPDATE payments SET status = 'unmatched' WHERE id = ?;`, [rec.payment_id]);

    // A. Update AI Recommendation status
    await connection.execute(
      `UPDATE ai_recommendations 
       SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ?
       WHERE id = ?;`,
      [rejectedByUserId, reason, recommendationId]
    );

    // B. Update Reconciliation Case status to 'rejected'
    await connection.execute(
      `UPDATE reconciliation_cases 
       SET status = 'rejected', resolution_reason = ?
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
      ip_address: ipAddress,
      correlation_id: correlationId
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
 * Automatically reverses any previous allocations if this case was previously allocated.
 */
export const overrideRecommendationService = async (caseId, overrideData, user, ipAddress = null, correlationId = null) => {
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

    // Reverse any previous allocations for this payment
    const [previousAllocations] = await connection.execute(
      `SELECT * FROM payment_allocations WHERE payment_id = ?;`,
      [caseDetails.payment_id]
    );

    for (const alloc of previousAllocations) {
      if (alloc.repayment_schedule_id !== repayment_schedule_id) {
        const [schedRows] = await connection.execute(
          `SELECT * FROM repayment_schedules WHERE id = ?;`,
          [alloc.repayment_schedule_id]
        );
        if (schedRows.length > 0) {
          const s = schedRows[0];
          const revPaid = Math.max(0, parseFloat(s.paid_amount || 0) - parseFloat(alloc.allocated_amount));
          const revStatus = revPaid >= parseFloat(s.scheduled_amount) ? 'paid' : (revPaid > 0 ? 'partially_paid' : 'pending');
          await connection.execute(
            `UPDATE repayment_schedules SET paid_amount = ?, status = ? WHERE id = ?;`,
            [revPaid.toFixed(2), revStatus, alloc.repayment_schedule_id]
          );
        }
      }
      await connection.execute(`DELETE FROM payment_allocations WHERE id = ?;`, [alloc.id]);
    }

    // A. Insert manual override allocation record
    const allocId = await insertPaymentAllocation({
      payment_id: caseDetails.payment_id,
      repayment_schedule_id,
      allocated_amount: allocAmount.toFixed(2),
      approved_by: user.id,
      allocation_type: 'ai_overridden'
    }, connection);

    // B. Update target Repayment Schedule
    const currentPaid = parseFloat(schedule.paid_amount || 0);
    const newPaid = currentPaid + allocAmount;
    const scheduledTotal = parseFloat(schedule.scheduled_amount);
    const newScheduleStatus = newPaid >= scheduledTotal ? 'paid' : 'partially_paid';

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
      ip_address: ipAddress,
      correlation_id: correlationId
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
