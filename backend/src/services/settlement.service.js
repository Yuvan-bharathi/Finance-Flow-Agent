import pool from '../config/db.js';
import { findRecommendationById } from '../models/aiRecommendation.model.js';
import { findCaseById } from '../models/reconciliationCase.model.js';
import { insertPaymentAllocation, findAllPaymentAllocations } from '../models/allocation.model.js';
import { findScheduleById } from '../models/repayment.model.js';
import { findPaymentById } from '../models/payment.model.js';
import { insertAuditLog, findAllAuditLogs } from '../models/auditLog.model.js';
import { cacheService } from './cache.service.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Service: Settlement & Human Approval Service
 * Purpose: Business logic for Human-in-the-Loop financial ledger settlement (Approve, Reject, Manual Override).
 */

/**
 * Approves an AI Recommendation and executes official financial ledger allocation.
 * Uses a MySQL ACID transaction.
 */
/**
 * Executes a deterministic, decimal-safe continuous waterfall allocation
 * across open repayment schedule installments (oldest due_date first).
 *
 * @param {Object} params
 * @param {Object} params.payment - The raw payment record ({ id, amount, transaction_id }).
 * @param {number} params.targetLoanId - The target loan facility ID.
 * @param {number} params.userId - Approving / Settling user ID.
 * @param {string} params.allocationType - 'ai_approved' | 'ai_overridden'
 * @param {Object} params.connection - MySQL ACID transaction connection.
 *
 * @returns {Promise<Object>} Summary of waterfall allocation results.
 */
export const executeContinuousWaterfall = async ({
  payment,
  targetLoanId,
  userId,
  allocationType = 'ai_approved',
  connection
}) => {
  // 1. Convert incoming payment to integer paisa (cents) for 100% precision
  let remainingPaisa = Math.round(parseFloat(payment.amount) * 100);
  const totalIncomingPaisa = remainingPaisa;

  // 2. Fetch all open installments for this loan, sorted chronologically: oldest due date first
  const [openSchedules] = await connection.query(`
    SELECT id, installment_number, due_date, scheduled_amount, paid_amount, status
    FROM repayment_schedules
    WHERE loan_id = ? AND status IN ('pending', 'partially_paid', 'overdue')
    ORDER BY due_date ASC, installment_number ASC;
  `, [targetLoanId]);

  const createdAllocations = [];
  let totalAllocatedPaisa = 0;

  for (const schedule of openSchedules) {
    if (remainingPaisa <= 0) break;

    const scheduledPaisa = Math.round(parseFloat(schedule.scheduled_amount) * 100);
    const paidPaisa = Math.round(parseFloat(schedule.paid_amount || 0) * 100);
    const neededPaisa = scheduledPaisa - paidPaisa;

    if (neededPaisa <= 0) continue;

    // Slicing: allocate up to what this installment needs
    const allocatePaisa = Math.min(remainingPaisa, neededPaisa);
    const newPaidPaisa = paidPaisa + allocatePaisa;
    const isFullyPaid = newPaidPaisa >= scheduledPaisa;
    const newStatus = isFullyPaid ? 'paid' : 'partially_paid';

    const allocatedAmountStr = (allocatePaisa / 100).toFixed(2);
    const newPaidStr = (newPaidPaisa / 100).toFixed(2);

    // A. Insert distinct ledger allocation row (1:N audit history)
    const allocId = await insertPaymentAllocation({
      payment_id: payment.id,
      repayment_schedule_id: schedule.id,
      allocated_amount: allocatedAmountStr,
      approved_by: userId,
      allocation_type: allocationType
    }, connection);

    // B. Update repayment schedule milestone
    await connection.execute(`
      UPDATE repayment_schedules
      SET paid_amount = ?, status = ?
      WHERE id = ?;
    `, [newPaidStr, newStatus, schedule.id]);

    createdAllocations.push({
      allocation_id: allocId,
      schedule_id: schedule.id,
      installment_number: schedule.installment_number,
      due_date: schedule.due_date,
      allocated_amount: parseFloat(allocatedAmountStr),
      new_paid_amount: parseFloat(newPaidStr),
      status: newStatus
    });

    remainingPaisa -= allocatePaisa;
    totalAllocatedPaisa += allocatePaisa;
  }

  const unallocatedPaisa = Math.max(0, totalIncomingPaisa - totalAllocatedPaisa);
  const unallocatedAmountStr = (unallocatedPaisa / 100).toFixed(2);

  // Update payment status
  await connection.execute(`
    UPDATE payments SET status = 'completed' WHERE id = ?;
  `, [payment.id]);

  return {
    total_payment_amount: parseFloat(payment.amount),
    total_allocated_amount: parseFloat((totalAllocatedPaisa / 100).toFixed(2)),
    unallocated_amount: parseFloat(unallocatedAmountStr),
    allocations_count: createdAllocations.length,
    allocations: createdAllocations,
    primary_schedule_id: createdAllocations.length > 0 ? createdAllocations[0].schedule_id : null
  };
};

/**
 * Approves an AI Recommendation and executes official financial ledger allocation
 * using deterministic, decimal-safe continuous waterfall across open installments.
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

  let targetLoanId = rec.recommended_loan_id;
  if (!targetLoanId && rec.recommended_schedule_id) {
    const schedule = await findScheduleById(rec.recommended_schedule_id);
    targetLoanId = schedule?.loan_id;
  }

  if (!targetLoanId) {
    const error = new Error(`Cannot approve AI Recommendation #${recommendationId} because target loan facility could not be identified.`);
    error.statusCode = 400;
    throw error;
  }

  const payment = await findPaymentById(rec.payment_id);
  if (!payment) {
    const error = new Error('Associated payment record not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. MySQL ACID Transaction with Continuous Waterfall
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const waterfallResult = await executeContinuousWaterfall({
      payment,
      targetLoanId,
      userId: approvedByUserId,
      allocationType: 'ai_approved',
      connection
    });

    const primaryScheduleId = waterfallResult.primary_schedule_id || rec.recommended_schedule_id;

    // Update AI Recommendation status
    await connection.execute(`
      UPDATE ai_recommendations 
      SET status = 'approved', recommended_schedule_id = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_comment = ?
      WHERE id = ?;
    `, [primaryScheduleId, approvedByUserId, notes || 'Approved by human accountant with waterfall allocation', recommendationId]);

    // Update Reconciliation Case status
    await connection.execute(`
      UPDATE reconciliation_cases 
      SET status = 'approved', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `, [rec.reconciliation_case_id]);

    // Write to audit logs
    await insertAuditLog({
      user_id: approvedByUserId,
      action: 'APPROVE_AI_RECOMMENDATION_WATERFALL',
      entity_type: 'payment_allocations',
      entity_id: waterfallResult.allocations[0]?.allocation_id || 0,
      old_values: {
        recommendation_status: rec.status,
        payment_status: payment.status
      },
      new_values: {
        total_payment_amount: waterfallResult.total_payment_amount,
        total_allocated_amount: waterfallResult.total_allocated_amount,
        unallocated_amount: waterfallResult.unallocated_amount,
        allocations_count: waterfallResult.allocations_count,
        allocations: waterfallResult.allocations
      },
      ip_address: ipAddress,
      correlation_id: correlationId
    }, connection);

    await connection.commit();
    connection.release();

    // Cache invalidation and real-time socket events
    await cacheService.delByPattern('loans:*');
    await cacheService.delByPattern('dashboard:*');
    await cacheService.delByPattern('reconciliations:*');

    emitSocketEvent('RECONCILIATION_COMPLETED', {
      reconciliation_case_id: rec.reconciliation_case_id,
      payment_id: rec.payment_id,
      status: 'APPROVED',
      waterfall: waterfallResult
    });

    emitSocketEvent('LOAN_PAYMENT_ALLOCATED', {
      loan_id: targetLoanId,
      payment_id: rec.payment_id,
      waterfall: waterfallResult
    });

    return {
      recommendation_id: recommendationId,
      case_id: rec.reconciliation_case_id,
      payment_id: rec.payment_id,
      waterfall: waterfallResult,
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
