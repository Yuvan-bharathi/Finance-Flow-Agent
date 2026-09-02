import {
  ingestPaymentService,
  getPaymentsService,
  getPaymentByIdService
} from '../services/payment.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import { cacheService } from '../services/cache.service.js';
import { emitSocketEvent } from '../config/socket.js';
import { runAnomalyAgentStageA } from '../agents/anomalyAgent.js';
import { config } from '../config/env.js';
import { agentQueue, PRIORITY } from '../services/agentQueue.service.js';
import { runPipelineWorkflow, PIPELINE_WORKFLOWS } from '../services/orchestrator.service.js';
import { logger } from '../utils/logger.js';

/**
 * Controller: Payment Controller (Phase 7 Real-Time & Caching Enhanced)
 * Purpose: Express HTTP request handlers for Raw Payment Ingestion & Mock Bank Simulator endpoints.
 */

/**
 * Asynchronously queues and executes the Payment Reconciliation & Risk Pipeline
 * whenever a new transaction arrives in the database, without blocking the HTTP response.
 */
const triggerAutomatedPipeline = (payment, reconciliationCase, userId) => {
  if (config.agents?.autoTriggerPipeline === false) {
    logger.info('[Auto-Pipeline] Automated pipeline trigger is disabled via configuration.');
    return;
  }

  const caseId = reconciliationCase?.id || reconciliationCase?.case_id || payment?.case_id;
  const paymentId = payment?.id || payment?.payment_id;
  if (!caseId || !paymentId) {
    logger.warn(`[Auto-Pipeline] Skipping trigger: caseId (${caseId}) or paymentId (${paymentId}) missing.`);
    return;
  }

  agentQueue.addJob({
    name: `AutoPipeline-Case#${caseId}-Payment#${paymentId}`,
    priority: PRIORITY.HIGH,
    metadata: { caseId, paymentId, triggerSource: 'auto_ingestion' },
    task: async () => {
      logger.info(`⚡ [Auto-Pipeline] Triggering automated Payment Reconciliation & Risk Pipeline for Case #${caseId}`);
      return await runPipelineWorkflow({
        workflow: PIPELINE_WORKFLOWS.RECONCILIATION_AND_RISK,
        contextData: {
          caseId,
          paymentId,
          amount: payment.amount,
          senderName: payment.sender_name,
          senderAccount: payment.sender_account,
          reference: payment.reference,
          transactionId: payment.transaction_id
        },
        userId,
        priority: PRIORITY.HIGH,
        triggerSource: 'auto_ingestion'
      });
    }
  }).catch(err => {
    logger.warn(`[Auto-Pipeline] Automated pipeline execution failed for Case #${caseId}: ${err.message}`);
  });
};

/**
 * Controller: ingestPayment (Section 17 Manual Ingestion API)
 * Endpoint: POST /api/payments/ingest
 */
export const ingestPayment = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await ingestPaymentService(req.body, userId);
    const caseRecord = result.case || result.reconciliation_case;

    // 1. Invalidate cache tags
    cacheService.invalidateByTag('payments');
    cacheService.invalidateByTag('reports');
    cacheService.invalidateByTag('reconciliations');

    // 2. Broadcast near-real-time WebSocket events for zero-reload UI updates
    emitSocketEvent('PAYMENT_INGESTED', {
      payment: result.payment,
      case: caseRecord,
      timestamp: new Date().toISOString()
    });

    emitSocketEvent('RECONCILIATION_CASE_CREATED', {
      case: caseRecord,
      timestamp: new Date().toISOString()
    });

    // 3. Async Stage A Anomaly Detection (non-blocking fire-and-forget)
    const paymentId = result?.payment?.id;
    if (paymentId) {
      setImmediate(() => {
        runAnomalyAgentStageA(paymentId, userId).catch(err =>
          console.warn('[Payment Controller] Stage A anomaly check failed (non-critical):', err.message)
        );
      });
    }

    // 4. Automatically trigger the Payment Reconciliation & Risk Pipeline in background
    triggerAutomatedPipeline(result.payment, caseRecord, userId);

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
    const caseRecord = result.case || result.reconciliation_case;

    // Invalidate cache & emit real-time event
    cacheService.invalidateByTag('payments');
    cacheService.invalidateByTag('reports');
    cacheService.invalidateByTag('reconciliations');

    emitSocketEvent('PAYMENT_INGESTED', {
      payment: result.payment,
      case: caseRecord,
      timestamp: new Date().toISOString()
    });

    // Automatically trigger the Payment Reconciliation & Risk Pipeline in background
    triggerAutomatedPipeline(result.payment, caseRecord, userId);

    return sendSuccessResponse(
      res,
      201,
      '🏦 [Dummy Bank API] Mock bank payment deposit ingested successfully. Case created in status NEW and automated pipeline queued.',
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
