import {
  ingestPaymentService,
  getPaymentsService,
  getPaymentByIdService
} from '../services/payment.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Payment Controller
 * Purpose: Express HTTP request handlers for Raw Payment Ingestion & Mock Bank Simulator endpoints.
 */

/**
 * Controller: ingestPayment (Section 17 Manual Ingestion API)
 * Endpoint: POST /api/payments/ingest
 * Access: Admin, Manager, Accountant
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
 * Controller: ingestMockBankDeposit (Dummy Bank API Simulator Endpoint)
 * Endpoint: POST /api/payments/mock-bank-deposit
 * Access: Authenticated (or External Webhook)
 * 
 * Simulates raw bank payment ingestion from Core Banking Systems / Webhooks into FinanceFlow AI DB.
 * Auto-generates random realistic bank payment fields if payload properties are omitted.
 */
export const ingestMockBankDeposit = async (req, res, next) => {
  try {
    const body = req.body || {};

    const sampleSenders = [
      { name: 'ABC Technologies Pvt Ltd', account: '123456789012', ref: 'LN-2026-001 AUG REPAYMENT', amount: 100000.00 },
      { name: 'Starlight Tech Solutions', account: '556677889900', ref: 'MONTHLY LOAN INSTALLMENT', amount: 104166.67 },
      { name: 'Orion Global Enterprises', account: '990088776655', ref: 'LN-2026-003 REPAYMENT', amount: 102500.00 },
      { name: 'XYZ Logistics Corp', account: '987654321098', ref: 'FACILITY REPAYMENT', amount: 100000.00 }
    ];

    const randomSample = sampleSenders[Math.floor(Math.random() * sampleSenders.length)];

    const payload = {
      transactionId: body.transactionId || `TXN-BANK-SIM-${Date.now()}`,
      amount: body.amount || randomSample.amount,
      paymentDate: body.paymentDate || new Date().toISOString().split('T')[0],
      senderName: body.senderName || randomSample.name,
      senderAccount: body.senderAccount || randomSample.account,
      reference: body.reference || randomSample.ref,
      source: body.source || 'api'
    };

    const userId = req.user ? req.user.id : null;
    const result = await ingestPaymentService(payload, userId);

    return sendSuccessResponse(
      res,
      201,
      '🏦 [Dummy Bank API] Mock bank payment deposit ingested successfully. Case created in status NEW.',
      result
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getPayments
 * Endpoint: GET /api/payments
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
