import pool from '../config/db.js';
import { findActiveLoansByCompanyId } from '../models/loan.model.js';
import { findDueInstallments } from '../models/repayment.model.js';
import { findPatternDuplicatePayments } from '../models/payment.model.js';

/**
 * Module: AI Agent Controlled Tools
 * Purpose: Exposes controlled backend application tools for Groq LLM tool calling.
 * 
 * Called by:
 * - backend/src/agents/reconciliationAgent.js
 * 
 * Data flow:
 * Groq LLM tool call request ➔ toolExecutor() ➔ Parameterized MySQL query ➔ Result JSON returned to LLM
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
            type: 'string',
            description: 'Search string (e.g. company name "ABC Technologies" or bank account "123456789012")'
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
      description: 'Retrieves expected repayment schedule installments (pending, partially paid, or overdue) for a company or loan.',
      parameters: {
        type: 'object',
        properties: {
          companyId: {
            type: 'integer',
            description: 'Optional company ID filter'
          },
          loanId: {
            type: 'integer',
            description: 'Optional loan ID filter'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPaymentHistory',
      description: 'Retrieves historical payment behavior and past allocations for a company.',
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
      name: 'getBankAccountDetails',
      description: 'Retrieves registered bank account details for a company to verify incoming sender_account information.',
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
      name: 'checkDuplicateTransactions',
      description: 'Checks if a transaction reference or matching payment pattern already exists in historical payments.',
      parameters: {
        type: 'object',
        properties: {
          transactionId: {
            type: 'string',
            description: 'Bank transaction ID'
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
  const searchTerm = `%${query}%`;
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
  return await findActiveLoansByCompanyId(companyId);
};

/**
 * Retrieves due repayments for a company or loan.
 */
export const getDueRepaymentsHandler = async ({ companyId = null, loanId = null }) => {
  return await findDueInstallments(companyId, loanId);
};

/**
 * Retrieves payment history for a company.
 */
export const getPaymentHistoryHandler = async ({ companyId }) => {
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
  const [rows] = await pool.execute(sql, [companyId]);
  return rows;
};

/**
 * Retrieves registered bank account for a company.
 */
export const getBankAccountDetailsHandler = async ({ companyId }) => {
  const sql = `
    SELECT id, company_name, bank_account_number, contact_name, contact_phone
    FROM companies
    WHERE id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(sql, [companyId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Checks for duplicate transactions or pattern matches.
 */
export const checkDuplicateTransactionsHandler = async ({ transactionId, senderName = '', amount = 0 }) => {
  const sqlTxn = `SELECT id, transaction_id, amount, payment_date, status FROM payments WHERE transaction_id = ? LIMIT 1;`;
  const [txnRows] = await pool.execute(sqlTxn, [transactionId]);

  let patternRows = [];
  if (senderName && amount > 0) {
    patternRows = await findPatternDuplicatePayments(senderName, amount, new Date().toISOString().split('T')[0]);
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
export const executeTool = async (toolName, toolArgs) => {
  try {
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
        return await checkDuplicateTransactionsHandler(toolArgs);
      default:
        throw new Error(`Unknown tool name: '${toolName}'`);
    }
  } catch (error) {
    console.error(`[Tool Execution Error] '${toolName}':`, error.message);
    return { error: error.message };
  }
};
