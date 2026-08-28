import {
  approveRecommendationService,
  rejectRecommendationService,
  overrideRecommendationService,
  getAllAllocationsService
} from '../services/settlement.service.js';
import { findRecommendationsByCaseId } from '../models/aiRecommendation.model.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Settlement Controller
 * Purpose: Express HTTP request handlers for Human-in-the-Loop approval, rejection, and manual override endpoints.
 * 
 * Called by:
 * - reconciliation.routes.js
 */

/**
 * Controller: approveRecommendation
 * Endpoint: POST /api/reconciliations/approve
 * Access: Admin, Manager, Accountant
 * 
 * Payload: `{ recommendationId?: number, caseId?: number, notes?: string }`
 */
export const approveRecommendation = async (req, res, next) => {
  try {
    const caseId = req.body.caseId || req.body.case_id;
    const recommendationId = req.body.recommendationId || req.body.recommendation_id;
    const notes = req.body.notes;
    let recId = recommendationId;

    if (!recId && caseId) {
      const recs = await findRecommendationsByCaseId(caseId);
      if (recs && recs.length > 0) {
        recId = recs[0].id;
      }
    }

    if (!recId) {
      const error = new Error('recommendationId or valid caseId is required.');
      error.statusCode = 400;
      throw error;
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const correlationId = req.correlationId || null;
    const result = await approveRecommendationService(recId, req.user.id, notes, ipAddress, correlationId);
    return sendSuccessResponse(res, 200, 'AI Recommendation approved and payment allocated successfully', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: rejectRecommendation
 * Endpoint: POST /api/reconciliations/reject
 * Access: Admin, Manager, Accountant
 * 
 * Payload: `{ recommendationId?: number, caseId?: number, reason: string }`
 */
export const rejectRecommendation = async (req, res, next) => {
  try {
    const { recommendationId, caseId, reason } = req.body;
    let recId = recommendationId;

    if (!recId && caseId) {
      const recs = await findRecommendationsByCaseId(caseId);
      if (recs && recs.length > 0) {
        recId = recs[0].id;
      }
    }

    if (!recId) {
      const error = new Error('recommendationId or valid caseId is required.');
      error.statusCode = 400;
      throw error;
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const correlationId = req.correlationId || null;
    const result = await rejectRecommendationService(recId, req.user.id, reason, ipAddress, correlationId);
    return sendSuccessResponse(res, 200, 'AI Recommendation rejected', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: overrideRecommendation
 * Endpoint: POST /api/reconciliations/override
 * Access: Admin, Manager, Accountant
 * 
 * Payload: `{ caseId: number, repayment_schedule_id: number, allocated_amount: number, override_reason: string }`
 */
export const overrideRecommendation = async (req, res, next) => {
  try {
    const { caseId, repayment_schedule_id, allocated_amount, override_reason } = req.body;
    if (!caseId) {
      const error = new Error('caseId is required.');
      error.statusCode = 400;
      throw error;
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const correlationId = req.correlationId || null;
    const result = await overrideRecommendationService(caseId, {
      repayment_schedule_id,
      allocated_amount,
      override_reason
    }, req.user, ipAddress, correlationId);

    return sendSuccessResponse(res, 200, 'Reconciliation manually overridden and settled', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getAllocations
 * Endpoint: GET /api/reconciliations/allocations
 * Access: Authenticated (all roles)
 */
export const getAllocations = async (req, res, next) => {
  try {
    const allocations = await getAllAllocationsService();
    return sendSuccessResponse(res, 200, 'Payment allocations retrieved successfully', allocations);
  } catch (error) {
    return next(error);
  }
};
