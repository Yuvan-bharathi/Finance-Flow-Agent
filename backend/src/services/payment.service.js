import pool from '../config/db.js';
import {
  findPaymentByTransactionId,
  findPatternDuplicatePayments,
  insertPayment,
  findAllPayments,
  findPaymentById
} from '../models/payment.model.js';
import { insertReconciliationCase, findCaseById } from '../models/reconciliationCase.model.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Service: Payment Ingestion Service
 * Purpose: Business logic for raw bank payment ingestion, duplicate detection, and case opening.
 * 
 * Called by:
 * - payment.controller.js
 */

/**
 * Ingests a new raw payment via API/Postman or manual entry, runs duplicate check, and opens a reconciliation case.
 * 
 * Called by:
 * - payment.controller.js -> ingestPayment
 * 
 * Receives:
 * - paymentData {Object}: { transactionId, amount, paymentDate, senderName, senderAccount, reference, source }
 * - userId {number|null}: Creator user ID.
 * 
 * Returns:
 * {Object} { payment, case: caseDetails, isPatternDuplicate }
 * 
 * Errors:
 * - 400 Validation Error (missing transactionId, amount, paymentDate)
 * - 409 Conflict Error (duplicate transactionId)
 */
export const ingestPaymentService = async (paymentData, userId = null) => {
  const {
    transactionId,
    amount,
    paymentDate,
    senderName,
    senderAccount,
    reference,
    source = 'api'
  } = paymentData;

  // 1. Validation
  if (!transactionId || !amount || !paymentDate) {
    const error = new Error('transactionId, amount, and paymentDate are required fields.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Strict Duplicate Check by transaction_id
  const existingPayment = await findPaymentByTransactionId(transactionId);
  if (existingPayment) {
    const error = new Error(`Duplicate bank transaction detected. Payment with transactionId '${transactionId}' already exists.`);
    error.statusCode = 409; // 409 Conflict
    throw error;
  }

  // 3. Pattern Duplicate Warning Check (sender + amount + date)
  let priority = 'medium';
  let isPatternDuplicate = false;
  if (senderName) {
    const patternMatches = await findPatternDuplicatePayments(senderName, amount, paymentDate);
    if (patternMatches.length > 0) {
      priority = 'high';
      isPatternDuplicate = true;
    }
  }

  // 4. MySQL Transaction (ACID safe payment ingestion + case creation)
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Insert raw payment record
    const paymentId = await insertPayment({
      transaction_id: transactionId,
      amount: parseFloat(amount).toFixed(2),
      payment_date: paymentDate,
      sender_name: senderName || null,
      sender_account: senderAccount || null,
      reference: reference || null,
      source,
      status: 'unmatched',
      created_by: userId
    }, connection);

    // B. Create investigation case record
    const caseId = await insertReconciliationCase({
      payment_id: paymentId,
      assigned_to: userId,
      status: 'new',
      priority
    }, connection);

    await connection.commit();
    connection.release();

    const payment = await findPaymentById(paymentId);
    const caseDetails = await findCaseById(caseId);

    // Emit real-time WebSocket event
    emitSocketEvent('PAYMENT_INGESTED', {
      payment,
      case: caseDetails,
      isPatternDuplicate
    });

    return {
      payment,
      case: caseDetails,
      isPatternDuplicate
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

/**
 * Retrieves list of all ingested payments.
 * 
 * Called by:
 * - payment.controller.js -> getPayments
 * 
 * @param {string|null} status - Optional status filter.
 * @returns {Promise<Array>} List of payments.
 */
export const getPaymentsService = async (status = null) => {
  return await findAllPayments(status);
};

/**
 * Retrieves single payment details by ID.
 * 
 * Called by:
 * - payment.controller.js -> getPaymentById
 * 
 * @param {number} paymentId - Payment ID.
 * @returns {Promise<Object>} Payment details.
 */
export const getPaymentByIdService = async (paymentId) => {
  const payment = await findPaymentById(paymentId);
  if (!payment) {
    const error = new Error(`Payment with ID ${paymentId} not found.`);
    error.statusCode = 404;
    throw error;
  }
  return payment;
};
