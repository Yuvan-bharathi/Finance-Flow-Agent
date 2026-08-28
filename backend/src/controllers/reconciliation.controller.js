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
import { sendSuccessResponse, sendErrorResponse } from '../utils/apiResponse.js';
import { runAnomalyAgentStageB } from '../agents/anomalyAgent.js';
import {
  PLAYBOOKS,
  getCasePlaybookService,
  updatePlaybookStepService,
  updatePlaybookStatusService
} from '../engine/playbookEngine.js';

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

/**
 * Controller: Get Deterministic Playbook for a Case with Audit Progress
 */
export const getCasePlaybook = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const playbook = await getCasePlaybookService(caseId, req.user);
    if (!playbook) {
      return sendErrorResponse(res, 404, 'Case not found or no playbook available');
    }
    return sendSuccessResponse(res, 200, 'Case playbook retrieved', playbook);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: Update a single Playbook step completion
 */
export const updatePlaybookStep = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const { stepId, completed, notes } = req.body;
    const completedBy = req.user ? (req.user.name || req.user.email || 'Accountant') : 'Accountant';
    const updated = await updatePlaybookStepService(caseId, parseInt(stepId, 10), completed, completedBy, notes);
    return sendSuccessResponse(res, 200, 'Playbook step updated', updated);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: Update overall Playbook review status (e.g. COMPLETED, ESCALATED, IN_PROGRESS)
 */
export const updatePlaybookStatus = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const { status } = req.body;
    const completedBy = req.user ? (req.user.name || req.user.email || 'Accountant') : 'Accountant';
    const updated = await updatePlaybookStatusService(caseId, status, completedBy);
    return sendSuccessResponse(res, 200, 'Playbook review status updated', updated);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: Get all Standardized Operational Playbooks library for Agent 7
 */
export const getStandardPlaybooks = async (req, res, next) => {
  try {
    return sendSuccessResponse(res, 200, 'Standardized Operational Playbooks library', Object.values(PLAYBOOKS));
  } catch (error) {
    return next(error);
  }
};

