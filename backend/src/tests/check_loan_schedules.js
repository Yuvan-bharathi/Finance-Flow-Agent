import pool from '../config/db.js';

async function checkLoanSchedules() {
  const [rows] = await pool.query(`
    SELECT 
      l.id AS loan_id,
      l.loan_number,
      c.company_name,
      l.principal_amount,
      l.interest_rate,
      l.total_payable,
      TIMESTAMPDIFF(MONTH, l.start_date, l.end_date) AS calculated_tenure_months,
      COUNT(rs.id) AS total_schedules_in_db,
      COALESCE(SUM(rs.scheduled_amount), 0) AS sum_of_schedules_in_db,
      COALESCE(SUM(rs.paid_amount), 0) AS sum_of_paid_in_db,
      COALESCE(AVG(rs.scheduled_amount), 0) AS avg_scheduled_amount
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
    GROUP BY l.id, l.loan_number, c.company_name, l.principal_amount, l.interest_rate, l.total_payable, l.start_date, l.end_date
    ORDER BY l.id ASC;
  `);

  console.table(rows);
  process.exit(0);
}

checkLoanSchedules();
