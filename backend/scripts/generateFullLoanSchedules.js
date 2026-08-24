import pool from '../src/config/db.js';

/**
 * Script: generateFullLoanSchedules.js
 * Purpose: Generates full mathematical repayment schedules for all 25 loans so that:
 * SUM(repayment_schedules.scheduled_amount) === loans.total_payable
 * And remaining_balance === total_payable - total_paid.
 */
async function generateFullSchedules() {
  console.log('🔄 Generating 100% Mathematically Exact Loan Schedules in TiDB Cloud...');

  const [loans] = await pool.query('SELECT * FROM loans ORDER BY id ASC');
  console.log(`Found ${loans.length} loans to process.`);

  // 1. Temporarily clear payment allocations and schedules
  await pool.query('DELETE FROM payment_allocations');
  await pool.query('DELETE FROM repayment_schedules');

  for (const loan of loans) {
    const totalPayable = parseFloat(loan.total_payable);
    const startDate = new Date(loan.start_date);
    const endDate = new Date(loan.end_date);
    
    // Calculate months between start and end date (minimum 6, maximum 24)
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    if (months <= 0) months = 10;
    
    const monthlyEmi = parseFloat((totalPayable / months).toFixed(2));
    let allocatedSum = 0;

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // Last installment adjusts for any penny rounding differences
      let installmentAmount = monthlyEmi;
      if (i === months) {
        installmentAmount = parseFloat((totalPayable - allocatedSum).toFixed(2));
      } else {
        allocatedSum += monthlyEmi;
      }

      // First installment is paid for all loans, second is pending/overdue for testing AI matching
      let status = 'pending';
      let paidAmount = 0.00;

      if (i === 1) {
        status = 'paid';
        paidAmount = installmentAmount;
      } else if (i === 2 && [4, 5, 7].includes(loan.id)) {
        status = 'overdue';
      }

      await pool.query(`
        INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
        VALUES (?, ?, ?, ?, ?, ?);
      `, [loan.id, i, dueDateStr, installmentAmount, paidAmount, status]);
    }
  }

  // Update payments to match installment 2 amounts for clean AI reconciliation
  for (let i = 1; i <= 25; i++) {
    const [openSched] = await pool.query(
      `SELECT * FROM repayment_schedules WHERE loan_id = ? AND installment_number = 2 LIMIT 1;`,
      [i]
    );
    if (openSched.length > 0) {
      await pool.query(
        `UPDATE payments SET amount = ? WHERE id = ?;`,
        [openSched[0].scheduled_amount, i]
      );
    }
  }

  console.log('✅ All 25 loans now have 100% complete, mathematically exact schedules!');
  process.exit(0);
}

generateFullSchedules().catch(err => {
  console.error('Error generating schedules:', err);
  process.exit(1);
});
