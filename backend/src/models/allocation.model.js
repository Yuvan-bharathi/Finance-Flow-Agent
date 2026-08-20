import pool from '../config/db.js';

/**
 * Model: Payment Allocation Model / Repository
 * Purpose: MySQL query execution for `payment_allocations` official ledger entries.
 * 
 * Data flow:
 * Settlement Service ➔ Allocation Model ➔ MySQL Pool ➔ `payment_allocations` table
 */

/**
 * Inserts an official financial ledger allocation record.
 * 
 * Called by:
 * - settlement.service.js (approve, override)
 * 
 * @param {Object} allocData - Allocation data.
 * @param {Object} connection - MySQL transaction connection.
 * @returns {Promise<number>} Inserted allocation ID.
 */
export const insertPaymentAllocation = async (allocData, connection) => {
  const {
    payment_id,
    repayment_schedule_id,
    allocated_amount,
    approved_by,
    allocation_type = 'ai_approved'
  } = allocData;

  const query = `
    INSERT INTO payment_allocations (
      payment_id, repayment_schedule_id, allocated_amount, approved_by, allocation_type
    ) VALUES (?, ?, ?, ?, ?);
  `;

  const [result] = await connection.execute(query, [
    payment_id, repayment_schedule_id, allocated_amount, approved_by, allocation_type
  ]);

  return result.insertId;
};

/**
 * Retrieves payment allocations by payment ID.
 * 
 * Called by:
 * - settlement.service.js
 * 
 * @param {number} paymentId - Payment ID.
 * @returns {Promise<Array>} List of allocations.
 */
export const findAllocationsByPaymentId = async (paymentId) => {
  const query = `
    SELECT pa.*, rs.installment_number, rs.due_date, rs.scheduled_amount,
           l.loan_number, c.company_name, u.name AS approved_by_user_name
    FROM payment_allocations pa
    JOIN repayment_schedules rs ON pa.repayment_schedule_id = rs.id
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    JOIN users u ON pa.approved_by = u.id
    WHERE pa.payment_id = ?
    ORDER BY pa.created_at DESC;
  `;
  const [rows] = await pool.execute(query, [paymentId]);
  return rows;
};

/**
 * Retrieves all payment allocations across the system.
 * 
 * Called by:
 * - settlement.controller.js
 * 
 * @returns {Promise<Array>} List of all allocations.
 */
export const findAllPaymentAllocations = async () => {
  const query = `
    SELECT pa.*, p.transaction_id, p.sender_name, p.amount AS raw_payment_amount,
           rs.installment_number, rs.due_date, l.loan_number, c.company_name,
           u.name AS approved_by_user_name
    FROM payment_allocations pa
    JOIN payments p ON pa.payment_id = p.id
    JOIN repayment_schedules rs ON pa.repayment_schedule_id = rs.id
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    JOIN users u ON pa.approved_by = u.id
    ORDER BY pa.created_at DESC;
  `;
  const [rows] = await pool.execute(query);
  return rows;
};
