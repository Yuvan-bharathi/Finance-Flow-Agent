import pool from '../config/db.js';

async function testCompanyMetrics() {
  const query = `
    SELECT 
      c.id,
      c.company_name,
      c.registration_number,
      c.tax_identifier,
      c.bank_account_number,
      c.contact_name,
      c.contact_email,
      c.contact_phone,
      c.address,
      c.status,
      COALESCE(loan_agg.total_borrowed, 0) AS total_borrowed,
      COALESCE(loan_agg.total_payable, 0) AS total_payable,
      COALESCE(loan_agg.active_loans_count, 0) AS active_loans_count,
      COALESCE(sched_agg.total_emis, 0) AS total_emis,
      COALESCE(sched_agg.emis_paid, 0) AS emis_paid,
      COALESCE(sched_agg.emis_pending, 0) AS emis_pending,
      COALESCE(sched_agg.monthly_installment, 0) AS monthly_installment,
      COALESCE(sched_agg.total_amount_paid, 0) AS total_amount_paid,
      COALESCE(sched_agg.remaining_balance, 0) AS remaining_balance
    FROM companies c
    LEFT JOIN (
      SELECT 
        company_id,
        SUM(principal_amount) AS total_borrowed,
        SUM(total_payable) AS total_payable,
        COUNT(id) AS active_loans_count
      FROM loans
      GROUP BY company_id
    ) loan_agg ON c.id = loan_agg.company_id
    LEFT JOIN (
      SELECT 
        l.company_id,
        COUNT(rs.id) AS total_emis,
        SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS emis_paid,
        SUM(CASE WHEN rs.status != 'paid' THEN 1 ELSE 0 END) AS emis_pending,
        AVG(rs.scheduled_amount) AS monthly_installment,
        SUM(rs.paid_amount) AS total_amount_paid,
        SUM(rs.scheduled_amount - rs.paid_amount) AS remaining_balance
      FROM loans l
      JOIN repayment_schedules rs ON l.id = rs.loan_id
      GROUP BY l.company_id
    ) sched_agg ON c.id = sched_agg.company_id
    WHERE c.id = 18;
  `;

  const [rows] = await pool.query(query);
  console.log('Company #18 metrics:', rows[0]);

  // Also query active loan details with schedules for company 18
  const [loanRows] = await pool.query(`
    SELECT l.*, 
      (SELECT COUNT(*) FROM repayment_schedules WHERE loan_id = l.id) AS total_schedules,
      (SELECT COUNT(*) FROM repayment_schedules WHERE loan_id = l.id AND status = 'paid') AS paid_schedules,
      (SELECT scheduled_amount FROM repayment_schedules WHERE loan_id = l.id LIMIT 1) AS installment_amount
    FROM loans l WHERE l.company_id = 18;
  `);
  console.log('Loans for Company #18:', loanRows);
  process.exit(0);
}

testCompanyMetrics();
