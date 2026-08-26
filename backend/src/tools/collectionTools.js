import pool from '../config/db.js';

/**
 * Controlled Application Tools for Agent 3: Collection Follow-Up Agent
 * 
 * Called by:
 * - collectionAgent.js
 */

export const collectionToolsDeclaration = [
  {
    type: 'function',
    function: {
      name: 'getOverdueInstallments',
      description: 'Retrieves all overdue repayment schedules for a company.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'Borrower Company ID' }
        },
        required: ['companyId']
      }
    }
  }
];

export const executeCollectionTool = async (name, args) => {
  if (name === 'getOverdueInstallments') {
    const [rows] = await pool.query(`
      SELECT rs.*, l.loan_number, c.company_name, c.contact_name, c.contact_email
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      JOIN companies c ON l.company_id = c.id
      WHERE l.company_id = ?
        AND (
          LOWER(rs.status) = 'overdue'
          OR (rs.due_date < CURRENT_DATE AND (rs.paid_amount IS NULL OR rs.paid_amount < rs.scheduled_amount) AND LOWER(rs.status) != 'paid')
        )
      ORDER BY rs.due_date ASC;
    `, [args.companyId]);
    return rows;
  }

  throw new Error(`Unknown collection tool: ${name}`);
};
