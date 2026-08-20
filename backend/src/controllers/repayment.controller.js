import {
  getScheduleByLoanIdService,
  getDueInstallmentsService,
  getScheduleByIdService
} from '../services/repayment.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Repayment Controller
 * Purpose: Express HTTP request handlers for Repayment Schedule endpoints.
 * 
 * Called by:
 * - repayment.routes.js
 */

/**
 * Controller: getScheduleByLoanId
 * Endpoint: GET /api/repayments/loan/:loanId
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object containing `req.params.loanId`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getScheduleByLoanId = async (req, res, next) => {
  try {
    const loanId = parseInt(req.params.loanId, 10);
    const schedule = await getScheduleByLoanIdService(loanId);
    return sendSuccessResponse(res, 200, 'Repayment schedule retrieved', schedule);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getDueInstallments
 * Endpoint: GET /api/repayments/due
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object. Query params `req.query.companyId`, `req.query.loanId`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getDueInstallments = async (req, res, next) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId, 10) : null;
    const loanId = req.query.loanId ? parseInt(req.query.loanId, 10) : null;
    const installments = await getDueInstallmentsService(companyId, loanId);
    return sendSuccessResponse(res, 200, 'Due installments retrieved', installments);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getScheduleById
 * Endpoint: GET /api/repayments/:id
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getScheduleById = async (req, res, next) => {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    const installment = await getScheduleByIdService(scheduleId);
    return sendSuccessResponse(res, 200, 'Repayment installment details retrieved', installment);
  } catch (error) {
    return next(error);
  }
};
