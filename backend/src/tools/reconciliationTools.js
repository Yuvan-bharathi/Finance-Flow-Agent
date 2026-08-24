import pool from '../config/db.js';
import { findActiveLoansByCompanyId } from '../models/loan.model.js';
import { findDueInstallments } from '../models/repayment.model.js';
import { findPatternDuplicatePayments } from '../models/payment.model.js';

/**
 * Module: AI Agent Controlled Tools
 * Purpose: Exposes controlled backend application tools for Groq LLM tool calling.
 */

// =============================================================================
// 1. Tool Schemas (OpenAI / Groq Function Definition Specification)
// =============================================================================
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'searchCompany',
      description: 'Searches borrower companies by company name, registration number, tax ID, or bank account number.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
            description: 'Search query (e.g. company name "ABC Technologies" or bank account number 987654321098)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getActiveLoans',
      description: 'Retrieves active loan facilities and balance information for a specific company.',
      parameters: {
        type: 'object',
        properties: {
          companyId: {
            type: 'integer',
            description: 'Primary key ID of the company'
          }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDueRepayments',
      description: 'Retrieves pending and overdue repayment schedule installments for a loan facility or company.',
      parameters: {
        type: 'object',
        properties: {
          companyId: {
            type: 'integer',
            description: 'Optional company ID'
          },
          loanId: {
            type: 'integer',
            description: 'Optional loan facility ID'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPaymentHistory',
      description: 'Retrieves historical payment allocation records for a borrower company.',
      parameters: {
        type: 'object',
        properties: {
          companyId: {
            type: 'integer',
            description: 'Company ID'
          }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getBankAccountDetails',
      description: 'Retrieves registered virtual bank account details for a corporate borrower.',
      parameters: {
        type: 'object',
        properties: {
          companyId: {
            type: 'integer',
            description: 'Company ID'
          }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkDuplicateTransactions',
      description: 'Checks if a transaction ID or pattern match has already been processed in the database.',
      parameters: {
        type: 'object',
        properties: {
          transactionId: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
            description: 'Bank transaction reference ID string or number'
          },
          senderName: {
            type: 'string',
            description: 'Sender name string'
          },
          amount: {
            type: 'number',
            description: 'Payment monetary amount'
          }
        },
        required: ['transactionId']
      }
    }
  }
];

// =============================================================================
// 2. Tool Execution Logic (Backend Query Handlers)
// =============================================================================

/**
 * Searches companies by query string.
 */
export const searchCompanyHandler = async ({ query }) => {
  const queryStr = String(query || '');
  const searchTerm = `%${queryStr}%`;
  const sql = `
    SELECT id, company_name, registration_number, tax_identifier, bank_account_number, contact_name, status
    FROM companies
    WHERE company_name LIKE ? 
       OR registration_number LIKE ? 
       OR tax_identifier LIKE ? 
       OR bank_account_number LIKE ?
    LIMIT 5;
  `;
  const [rows] = await pool.execute(sql, [searchTerm, searchTerm, searchTerm, searchTerm]);
  return rows;
};

/**
 * Retrieves active loans for a company.
 */
export const getActiveLoansHandler = async ({ companyId }) => {
  const cId = parseInt(companyId, 10);
  return await findActiveLoansByCompanyId(cId);
};

/**
 * Retrieves due repayments for a company or loan.
 */
export const getDueRepaymentsHandler = async ({ companyId = null, loanId = null }) => {
  const cId = companyId ? parseInt(companyId, 10) : null;
  const lId = loanId ? parseInt(loanId, 10) : null;
  return await findDueInstallments(cId, lId);
};

/**
 * Retrieves payment history for a company.
 */
export const getPaymentHistoryHandler = async ({ companyId }) => {
  const cId = parseInt(companyId, 10);
  const sql = `
    SELECT pa.id AS allocation_id, pa.allocated_amount, pa.allocation_type, pa.created_at AS allocated_at,
           p.transaction_id, p.amount AS raw_payment_amount, p.sender_name, p.sender_account,
           l.loan_number, rs.installment_number, rs.due_date
    FROM payment_allocations pa
    JOIN payments p ON pa.payment_id = p.id
    JOIN repayment_schedules rs ON pa.repayment_schedule_id = rs.id
    JOIN loans l ON rs.loan_id = l.id
    WHERE l.company_id = ?
    ORDER BY pa.created_at DESC
    LIMIT 10;
  `;
  const [rows] = await pool.execute(sql, [cId]);
  return rows;
};

/**
 * Retrieves registered bank account for a company.
 */
export const getBankAccountDetailsHandler = async ({ companyId }) => {
  const cId = parseInt(companyId, 10);
  const sql = `
    SELECT id, company_name, bank_account_number, contact_name, contact_phone
    FROM companies
    WHERE id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(sql, [cId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Checks for duplicate transactions or pattern matches.
 */
export const checkDuplicateTransactionsHandler = async ({ transactionId, senderName = '', amount = 0 }) => {
  const txnIdStr = String(transactionId || '');
  const sqlTxn = `SELECT id, transaction_id, amount, payment_date, status FROM payments WHERE transaction_id = ? LIMIT 1;`;
  const [txnRows] = await pool.execute(sqlTxn, [txnIdStr]);

  let patternRows = [];
  if (senderName && amount > 0) {
    patternRows = await findPatternDuplicatePayments(String(senderName), parseFloat(amount), new Date().toISOString().split('T')[0]);
  }

  return {
    exactTransactionExists: txnRows.length > 0 ? txnRows[0] : null,
    patternMatchesCount: patternRows.length,
    patternMatches: patternRows
  };
};

/**
 * Master Tool Executor router mapping function call name to handler.
 */
export const executeTool = async (toolName, rawToolArgs = {}) => {
  try {
    const toolArgs = { ...rawToolArgs };

    // Coerce argument types safely to prevent LLM type mismatch errors
    if (toolArgs.query !== undefined) {
      toolArgs.query = String(toolArgs.query);
    }
    if (toolArgs.transactionId !== undefined) {
      toolArgs.transactionId = String(toolArgs.transactionId);
    }
    if (toolArgs.companyId !== undefined) {
      toolArgs.companyId = parseInt(toolArgs.companyId, 10);
    }
    if (toolArgs.loanId !== undefined) {
      toolArgs.loanId = parseInt(toolArgs.loanId, 10);
    }

    switch (toolName) {
      case 'searchCompany':
        return await searchCompanyHandler(toolArgs);
      case 'getActiveLoans':
        return await getActiveLoansHandler(toolArgs);
      case 'getDueRepayments':
        return await getDueRepaymentsHandler(toolArgs);
      case 'getPaymentHistory':
        return await getPaymentHistoryHandler(toolArgs);
      case 'getBankAccountDetails':
        return await getBankAccountDetailsHandler(toolArgs);
      case 'checkDuplicateTransactions':
      case 'checkDuplicates':
        return await checkDuplicateTransactionsHandler(toolArgs);
      default:
        throw new Error(`Unknown tool name: '${toolName}'`);
    }
  } catch (error) {
    console.error(`[Tool Execution Error] '${toolName}':`, error.message);
    return { error: error.message };
  }
};
