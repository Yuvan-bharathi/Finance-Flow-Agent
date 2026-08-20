import {
  getLoansService,
  getLoanByIdService,
  createLoanService
} from '../services/loan.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Loan Controller
 * Purpose: Express HTTP request handlers for Loan facility management endpoints.
 * 
 * Called by:
 * - loan.routes.js
 */

/**
 * Controller: getLoans
 * Endpoint: GET /api/loans
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object. `req.query.status` filters status.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getLoans = async (req, res, next) => {
  try {
    const { status } = req.query;
    const loans = await getLoansService(status);
    return sendSuccessResponse(res, 200, 'Loan facilities retrieved successfully', loans);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getLoanById
 * Endpoint: GET /api/loans/:id
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getLoanById = async (req, res, next) => {
  try {
    const loanId = parseInt(req.params.id, 10);
    const loanDetails = await getLoanByIdService(loanId);
    return sendSuccessResponse(res, 200, 'Loan details & repayment schedule retrieved', loanDetails);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: createLoan
 * Endpoint: POST /api/loans
 * Access: Admin, Manager, Accountant
 * 
 * @param {Object} req - Express request object containing loan parameters in `req.body`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const createLoan = async (req, res, next) => {
  try {
    const loan = await createLoanService(req.body);
    return sendSuccessResponse(res, 201, 'Loan facility & repayment schedule created successfully', loan);
  } catch (error) {
    return next(error);
  }
};
