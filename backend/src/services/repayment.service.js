import {
  findScheduleByLoanId,
  findDueInstallments,
  findScheduleById
} from '../models/repayment.model.js';

/**
 * Service: Repayment Schedule Service
 * Purpose: Business logic for querying repayment schedules, due installments, and overdue balances.
 * 
 * Called by:
 * - repayment.controller.js
 */

/**
 * Retrieves repayment schedule for a specific loan.
 * 
 * Called by:
 * - repayment.controller.js -> getScheduleByLoanId
 * 
 * @param {number} loanId - Loan ID.
 * @returns {Promise<Array>} List of schedule installments.
 */
export const getScheduleByLoanIdService = async (loanId) => {
  return await findScheduleByLoanId(loanId);
};

/**
 * Retrieves pending or overdue installments across loans/companies.
 * 
 * Called by:
 * - repayment.controller.js -> getDueInstallments
 * 
 * @param {number|null} companyId - Optional company ID.
 * @param {number|null} loanId - Optional loan ID.
 * @returns {Promise<Array>} List of due installments.
 */
export const getDueInstallmentsService = async (companyId = null, loanId = null) => {
  return await findDueInstallments(companyId, loanId);
};

/**
 * Retrieves a single repayment schedule installment details.
 * 
 * Called by:
 * - repayment.controller.js -> getScheduleById
 * 
 * @param {number} scheduleId - Schedule ID.
 * @returns {Promise<Object>} Installment object.
 */
export const getScheduleByIdService = async (scheduleId) => {
  const installment = await findScheduleById(scheduleId);
  if (!installment) {
    const error = new Error(`Repayment schedule installment with ID ${scheduleId} not found.`);
    error.statusCode = 404;
    throw error;
  }
  return installment;
};
