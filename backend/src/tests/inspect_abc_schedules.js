import pool from '../config/db.js';

const inspect = async () => {
  const [schedules] = await pool.query(`
    SELECT rs.id, rs.loan_id, rs.installment_number, rs.due_date, rs.scheduled_amount, rs.paid_amount, rs.status
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    WHERE l.company_id = 1
    ORDER BY rs.due_date ASC
  `);

  console.log('Repayment schedules for company 1:');
  console.table(schedules);

  await pool.end();
};

inspect();
