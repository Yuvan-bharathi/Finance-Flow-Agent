import {
  analyzeCaseService,
  analyzeBulkService,
  analyzeAllPendingService,
  getCasesService,
  getCaseByIdService,
  getStatsService
} from '../services/reconciliation.service.js';
import {
  approveRecommendation,
  rejectRecommendation,
  overrideRecommendation,
  getAllocations
} from './settlement.controller.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import { runAnomalyAgentStageB } from '../agents/anomalyAgent.js';

export {
  approveRecommendation,
  rejectRecommendation,
  overrideRecommendation,
  getAllocations
};

/**
 * Controller: Reconciliation Controller
 * Purpose: Express HTTP request handlers for AI Payment Reconciliation & Dashboard Analytics endpoints.
 */

export const getStats = async (req, res, next) => {
  try {
    const stats = await getStatsService();
    return sendSuccessResponse(res, 200, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    return next(error);
  }
};

export const analyzeCase = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const userId = req.user ? req.user.id : null;
    const result = await analyzeCaseService(caseId, userId, 'manual');

    // Async Stage B Anomaly Detection after reconciliation match (non-blocking)
    const paymentId = result?.recommendation?.payment_id || result?.case?.payment_id || null;
    if (paymentId) {
      setImmediate(() => {
        runAnomalyAgentStageB(paymentId, caseId, userId).catch(err =>
          console.warn('[Reconciliation Controller] Stage B anomaly check failed (non-critical):', err.message)
        );
      });
    }

    return sendSuccessResponse(res, 200, 'AI Payment Reconciliation analysis completed successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const analyzeBulk = async (req, res, next) => {
  try {
    const { caseIds } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await analyzeBulkService(caseIds, userId);
    return sendSuccessResponse(res, 200, 'Bulk AI Payment Reconciliation completed', result);
  } catch (error) {
    return next(error);
  }
};

export const analyzeAllPending = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await analyzeAllPendingService(userId);
    return sendSuccessResponse(res, 200, 'All NEW cases processed with AI analysis', result);
  } catch (error) {
    return next(error);
  }
};

export const getCases = async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const cases = await getCasesService(status, priority);
    return sendSuccessResponse(res, 200, 'Reconciliation cases retrieved successfully', cases);
  } catch (error) {
    return next(error);
  }
};

export const getCaseById = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const caseDetails = await getCaseByIdService(caseId);
    return sendSuccessResponse(res, 200, 'Reconciliation case details retrieved', caseDetails);
  } catch (error) {
    return next(error);
  }
};
