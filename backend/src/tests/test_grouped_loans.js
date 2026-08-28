import pool from '../config/db.js';

const testGroupedLoans = async () => {
  const [rows] = await pool.query(`
    SELECT
      c.id                                                       AS company_id,
      c.company_name,
      c.contact_name,
      c.contact_email,
      l.id                                                       AS loan_id,
      COUNT(rs.id)                                               AS overdue_installments_count,
      MAX(DATEDIFF(CURDATE(), rs.due_date))                      AS overdue_days,
      SUM(rs.scheduled_amount - COALESCE(rs.paid_amount, 0))    AS outstanding_amount,
      l.principal_amount                                         AS loan_principal
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.due_date < CURDATE()
      AND rs.status NOT IN ('paid', 'cancelled')
      AND (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) > 0
    GROUP BY c.id, c.company_name, c.contact_name, c.contact_email, l.id, l.principal_amount
    ORDER BY outstanding_amount DESC
    LIMIT 20;
  `);

  console.log(`Found ${rows.length} unique delinquent borrowers:`);
  console.table(rows.map(r => ({
    company_id: r.company_id,
    company_name: r.company_name,
    overdue_milestones: r.overdue_installments_count,
    max_days_past_due: r.overdue_days,
    total_outstanding: `₹${Number(r.outstanding_amount).toLocaleString('en-IN')}`
  })));
  await pool.end();
};

testGroupedLoans();
