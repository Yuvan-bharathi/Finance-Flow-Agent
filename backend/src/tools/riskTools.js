import pool from '../config/db.js';

/**
 * Controlled Application Tools for Agent 2: Repayment Risk Assessment Agent
 * 
 * Called by:
 * - riskAgent.js
 */

export const riskToolsDeclaration = [
  {
    type: 'function',
    function: {
      name: 'getBorrowerPaymentHistory',
      description: 'Retrieves corporate borrower payment ledger records and delay metrics from MySQL.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'Borrower Company ID' }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getLoanScheduleStatus',
      description: 'Retrieves active loan facilities, pending amounts, and overdue installment counts for a company.',
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

export const executeRiskTool = async (name, args) => {
  if (name === 'getBorrowerPaymentHistory') {
    const [rows] = await pool.query(`
      SELECT p.*, pa.allocated_amount, pa.created_at AS allocated_at, rs.due_date
      FROM payments p
      LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
      LEFT JOIN repayment_schedules rs ON pa.repayment_schedule_id = rs.id
      LEFT JOIN loans l ON rs.loan_id = l.id
      WHERE l.company_id = ?
      ORDER BY p.payment_date DESC;
    `, [args.companyId]);
    return rows;
  }

  if (name === 'getLoanScheduleStatus') {
    const [loans] = await pool.query(`
      SELECT l.*, c.company_name,
             COUNT(rs.id) AS total_installments,
             SUM(CASE WHEN rs.due_date < CURDATE() AND rs.status NOT IN ('paid', 'cancelled') AND (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) > 0 THEN 1 ELSE 0 END) AS overdue_count,
             SUM(CASE WHEN rs.due_date < CURDATE() AND rs.status NOT IN ('paid', 'cancelled') THEN (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) ELSE 0 END) AS total_overdue_amount,
             SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') THEN (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) ELSE 0 END) AS total_pending_amount,
             COALESCE(MAX(CASE WHEN rs.due_date < CURDATE() AND rs.status NOT IN ('paid', 'cancelled') THEN DATEDIFF(CURDATE(), rs.due_date) ELSE 0 END), 0) AS max_days_overdue
      FROM loans l
      JOIN companies c ON l.company_id = c.id
      LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
      WHERE l.company_id = ?
      GROUP BY l.id, c.company_name;
    `, [args.companyId]);

    const [overdueItems] = await pool.query(`
      SELECT rs.*, l.loan_number,
             (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) AS remaining_balance,
             GREATEST(0, DATEDIFF(CURDATE(), rs.due_date)) AS days_overdue
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      WHERE l.company_id = ?
        AND rs.due_date < CURDATE()
        AND rs.status NOT IN ('paid', 'cancelled')
        AND (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) > 0
      ORDER BY rs.due_date ASC;
    `, [args.companyId]);

    return {
      loans,
      overdue_installments: overdueItems
    };
  }

  throw new Error(`Unknown risk tool name: ${name}`);
};
