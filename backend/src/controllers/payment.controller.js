import {
  ingestPaymentService,
  getPaymentsService,
  getPaymentByIdService
} from '../services/payment.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import { cacheService } from '../services/cache.service.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Controller: Payment Controller (Phase 7 Real-Time & Caching Enhanced)
 * Purpose: Express HTTP request handlers for Raw Payment Ingestion & Mock Bank Simulator endpoints.
 */

/**
 * Controller: ingestPayment (Section 17 Manual Ingestion API)
 * Endpoint: POST /api/payments/ingest
 */
export const ingestPayment = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await ingestPaymentService(req.body, userId);

    // 1. Invalidate cache tags
    cacheService.invalidateByTag('payments');
    cacheService.invalidateByTag('reports');
    cacheService.invalidateByTag('reconciliations');

    // 2. Broadcast near-real-time WebSocket events for zero-reload UI updates
    emitSocketEvent('PAYMENT_INGESTED', {
      payment: result.payment,
      case: result.reconciliation_case,
      timestamp: new Date().toISOString()
    });

    emitSocketEvent('RECONCILIATION_CASE_CREATED', {
      case: result.reconciliation_case,
      timestamp: new Date().toISOString()
    });

    return sendSuccessResponse(res, 201, 'Payment ingested successfully and reconciliation case opened', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: ingestMockBankDeposit (Dummy Bank API Simulator Endpoint)
 * Endpoint: POST /api/payments/mock-bank-deposit
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

    // Invalidate cache & emit real-time event
    cacheService.invalidateByTag('payments');
    cacheService.invalidateByTag('reports');
    cacheService.invalidateByTag('reconciliations');

    emitSocketEvent('PAYMENT_INGESTED', {
      payment: result.payment,
      case: result.reconciliation_case,
      timestamp: new Date().toISOString()
    });

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
    const payments = await getPaymentsService(req.query);
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
