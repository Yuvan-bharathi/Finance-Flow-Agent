import pool from '../config/db.js';

const testLoanQuery = async () => {
  const [rows] = await pool.query(`
    SELECT
      l.id,
      l.company_id,
      l.loan_number,
      l.principal_amount,
      l.interest_rate,
      l.total_payable,
      l.start_date,
      l.end_date,
      l.status,
      l.created_at,
      c.company_name,
      c.registration_number,
      c.contact_name,
      c.contact_email,
      c.bank_account_number,

      COUNT(rs.id) AS total_installments,
      SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS paid_installments,
      SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_installments_count,

      COALESCE(SUM(rs.scheduled_amount), l.total_payable) AS total_scheduled_amount,
      COALESCE(SUM(rs.paid_amount), 0) AS total_paid_amount,
      COALESCE(SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') THEN (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) ELSE 0 END), 0) AS remaining_scheduled_balance,
      COALESCE(SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date < CURDATE() THEN (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) ELSE 0 END), 0) AS overdue_amount,

      COALESCE(MAX(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date < CURDATE() THEN DATEDIFF(CURDATE(), rs.due_date) ELSE 0 END), 0) AS max_days_overdue,
      MIN(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date >= CURDATE() THEN rs.due_date ELSE NULL END) AS next_due_date

    FROM loans l
    JOIN companies c ON l.company_id = c.id
    LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
    GROUP BY l.id, c.id, c.company_name, c.registration_number, c.contact_name, c.contact_email, c.bank_account_number
    ORDER BY l.id ASC;
  `);

  console.log(`Enriched loans count: ${rows.length}`);
  const sample = rows.slice(0, 5).map(r => {
    const totalInst = r.total_installments || 1;
    const paidInst = r.paid_installments || 0;
    const progressPct = Math.round((paidInst / totalInst) * 100);
    const maxOverdue = r.max_days_overdue || 0;
    const remaining = parseFloat(r.remaining_scheduled_balance);

    let healthStatus = 'HEALTHY';
    if (remaining <= 0) {
      healthStatus = 'FULLY_RECOVERED';
    } else if (maxOverdue > 30) {
      healthStatus = 'CRITICAL';
    } else if (maxOverdue > 0) {
      healthStatus = 'WATCHLIST';
    }

    return {
      loan: r.loan_number,
      company: r.company_name,
      principal: `₹${Number(r.principal_amount).toLocaleString('en-IN')}`,
      progress: `${paidInst}/${totalInst} Paid (${progressPct}%)`,
      paid: `₹${Number(r.total_paid_amount).toLocaleString('en-IN')}`,
      remaining: `₹${Number(r.remaining_scheduled_balance).toLocaleString('en-IN')}`,
      overdue_amount: `₹${Number(r.overdue_amount).toLocaleString('en-IN')}`,
      max_overdue_days: maxOverdue,
      health: healthStatus,
      next_due: r.next_due_date
    };
  });

  console.table(sample);
  await pool.end();
};

testLoanQuery();
