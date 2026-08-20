import {
  ingestPaymentService,
  getPaymentsService,
  getPaymentByIdService
} from '../services/payment.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Payment Controller
 * Purpose: Express HTTP request handlers for Raw Payment Ingestion & Payment endpoints.
 * 
 * Called by:
 * - payment.routes.js
 */

/**
 * Controller: ingestPayment (Section 17 Manual Ingestion API)
 * Endpoint: POST /api/payments/ingest
 * Access: Admin, Manager, Accountant
 * 
 * Data flow:
 * Postman / External API ➔ POST /api/payments/ingest ➔ payment.routes.js ➔ payment.controller.js ➔ payment.service.js ➔ MySQL Transaction ➔ Response JSON
 * 
 * @param {Object} req - Express request object. `req.body` contains raw payment payload.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error propagation callback.
 */
export const ingestPayment = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await ingestPaymentService(req.body, userId);
    return sendSuccessResponse(res, 201, 'Payment ingested successfully and reconciliation case opened', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getPayments
 * Endpoint: GET /api/payments
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object. `req.query.status` filters status.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getPayments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const payments = await getPaymentsService(status);
    return sendSuccessResponse(res, 200, 'Payments retrieved successfully', payments);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getPaymentById
 * Endpoint: GET /api/payments/:id
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const payment = await getPaymentByIdService(paymentId);
    return sendSuccessResponse(res, 200, 'Payment details retrieved', payment);
  } catch (error) {
    return next(error);
  }
};
