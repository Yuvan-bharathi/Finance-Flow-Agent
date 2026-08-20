import {
  analyzeCaseService,
  getCasesService,
  getCaseByIdService,
  getStatsService
} from '../services/reconciliation.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Reconciliation Controller
 * Purpose: Express HTTP request handlers for AI Payment Reconciliation & Dashboard Analytics endpoints.
 * 
 * Called by:
 * - reconciliation.routes.js
 */

/**
 * Controller: getStats
 * Endpoint: GET /api/reconciliations/stats
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getStats = async (req, res, next) => {
  try {
    const stats = await getStatsService();
    return sendSuccessResponse(res, 200, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: analyzeCase
 * Endpoint: POST /api/reconciliations/analyze/:caseId
 * Access: Admin, Manager, Accountant
 */
export const analyzeCase = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const result = await analyzeCaseService(caseId);
    return sendSuccessResponse(res, 200, 'AI Payment Reconciliation analysis completed successfully', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getCases
 * Endpoint: GET /api/reconciliations/cases
 * Access: Authenticated (all roles)
 */
export const getCases = async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const cases = await getCasesService(status, priority);
    return sendSuccessResponse(res, 200, 'Reconciliation cases retrieved successfully', cases);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getCaseById
 * Endpoint: GET /api/reconciliations/cases/:caseId
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object containing `req.params.caseId`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getCaseById = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const caseDetails = await getCaseByIdService(caseId);
    return sendSuccessResponse(res, 200, 'Reconciliation case details retrieved', caseDetails);
  } catch (error) {
    return next(error);
  }
};
