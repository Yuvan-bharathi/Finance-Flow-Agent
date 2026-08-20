import pool from '../config/db.js';
import {
  findAllLoans,
  findLoanById,
  insertLoan
} from '../models/loan.model.js';
import { insertRepaymentScheduleBatch, findScheduleByLoanId } from '../models/repayment.model.js';
import { findCompanyById } from '../models/company.model.js';

/**
 * Service: Loan Service
 * Purpose: Manages loan facility creation and automatic repayment schedule generation.
 * 
 * Called by:
 * - loan.controller.js
 */

/**
 * Retrieves list of all loans.
 * 
 * Called by:
 * - loan.controller.js -> getLoans
 * 
 * @param {string|null} status - Optional status filter.
 * @returns {Promise<Array>} List of loans.
 */
export const getLoansService = async (status = null) => {
  return await findAllLoans(status);
};

/**
 * Retrieves loan facility details and associated repayment schedule.
 * 
 * Called by:
 * - loan.controller.js -> getLoanById
 * 
 * @param {number} loanId - Target loan ID.
 * @returns {Promise<Object>} Object containing loan details and schedule array.
 */
export const getLoanByIdService = async (loanId) => {
  const loan = await findLoanById(loanId);
  if (!loan) {
    const error = new Error(`Loan facility with ID ${loanId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const schedule = await findScheduleByLoanId(loanId);
  return {
    ...loan,
    schedule
  };
};

/**
 * Creates a new loan facility and automatically generates monthly repayment schedule installments.
 * Uses MySQL transaction for ACID safety.
 * 
 * Called by:
 * - loan.controller.js -> createLoan
 * 
 * Receives:
 * - loanData {Object}: { company_id, loan_number, principal_amount, interest_rate, tenure_months, start_date }
 * 
 * Returns:
 * {Object} Created loan facility details and schedule breakdown.
 */
export const createLoanService = async (loanData) => {
  const {
    company_id,
    loan_number,
    principal_amount,
    interest_rate = 10, // Default 10% annual interest
    tenure_months = 10,  // Default 10 monthly installments
    start_date
  } = loanData;

  // 1. Validations
  if (!company_id || !loan_number || !principal_amount || !start_date) {
    const error = new Error('company_id, loan_number, principal_amount, and start_date are required.');
    error.statusCode = 400;
    throw error;
  }

  const company = await findCompanyById(company_id);
  if (!company) {
    const error = new Error(`Borrowing company with ID ${company_id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Calculations
  const principal = parseFloat(principal_amount);
  const rate = parseFloat(interest_rate);
  const months = parseInt(tenure_months, 10);

  // Total Interest = Principal * (Rate / 100) * (Months / 12)
  const totalInterest = principal * (rate / 100) * (months / 12);
  const totalPayable = principal + totalInterest;

  // Monthly Installment Amount = Total Payable / Months
  const monthlyAmount = parseFloat((totalPayable / months).toFixed(2));

  // Calculate End Date
  const startDateObj = new Date(start_date);
  const endDateObj = new Date(startDateObj);
  endDateObj.setMonth(endDateObj.getMonth() + months);
  const endDateStr = endDateObj.toISOString().split('T')[0];

  // 3. MySQL Transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Insert Loan Record
    const loanId = await insertLoan({
      company_id,
      loan_number,
      principal_amount: principal.toFixed(2),
      interest_rate: rate.toFixed(2),
      total_payable: totalPayable.toFixed(2),
      start_date,
      end_date: endDateStr,
      status: 'active'
    }, connection);

    // B. Auto-generate Installment Schedule
    const installments = [];
    let currentDate = new Date(startDateObj);

    for (let i = 1; i <= months; i++) {
      // Advance due date by 1 month for each installment
      const dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // For final installment, adjust for rounding differences
      let scheduledAmount = monthlyAmount;
      if (i === months) {
        const sumPrevious = monthlyAmount * (months - 1);
        scheduledAmount = parseFloat((totalPayable - sumPrevious).toFixed(2));
      }

      installments.push({
        loan_id: loanId,
        installment_number: i,
        due_date: dueDateStr,
        scheduled_amount: scheduledAmount.toFixed(2),
        status: 'pending'
      });
    }

    // C. Batch insert schedule installments
    await insertRepaymentScheduleBatch(installments, connection);

    await connection.commit();
    connection.release();

    return await getLoanByIdService(loanId);
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};
