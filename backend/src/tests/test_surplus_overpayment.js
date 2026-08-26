import pool from '../config/db.js';
import { executeContinuousWaterfall } from '../services/settlement.service.js';

const runSurplusTest = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING SURPLUS / UNALLOCATED OVERPAYMENT TEST');
  console.log('================================================================\n');

  const connection = await pool.getConnection();

  try {
    const runSuffix = Date.now();
    const regNum = `REG-TEST-SURPLUS-${runSuffix}`;
    const loanNum = `LN-SURPLUS-TEST-${runSuffix}`;

    // 1. Create test company and loan with ONLY 3 installments (@ ₹1,10,000 = ₹3,30,000 total)
    const [cRes] = await pool.query(`
      INSERT INTO companies (company_name, registration_number, tax_identifier, bank_account_number, contact_name, status)
      VALUES (?, ?, ?, '112233445566', 'Surplus Test Director', 'active');
    `, [`Surplus Test Corp #${runSuffix}`, regNum, `TAX-SURPLUS-${runSuffix}`]);
    const testCompanyId = cRes.insertId;

    const [lRes] = await pool.query(`
      INSERT INTO loans (company_id, loan_number, principal_amount, interest_rate, total_payable, start_date, end_date, status)
      VALUES (?, ?, '300000.00', '10.00', '330000.00', '2026-01-01', '2026-03-31', 'active');
    `, [testCompanyId, loanNum]);
    const testLoanId = lRes.insertId;

    for (let i = 1; i <= 3; i++) {
      await pool.query(`
        INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
        VALUES (?, ?, '2026-03-01', '110000.00', '0.00', 'overdue');
      `, [testLoanId, i]);
    }

    console.log(`✓ Created test facility #${testLoanId} with ₹3,30,000 total debt across 3 installments.`);

    // 2. Ingest payment of ₹4,00,000 (> ₹3,30,000 total debt)
    const [pRes] = await pool.query(`
      INSERT INTO payments (transaction_id, amount, payment_date, sender_name, sender_account, source, status)
      VALUES ('TXN-SURPLUS-400K', '400000.00', '2026-08-26', 'Surplus Test Corp', '112233445566', 'api', 'processing');
    `);
    const pId = pRes.insertId;

    // 3. Execute waterfall
    await connection.beginTransaction();
    const result = await executeContinuousWaterfall({
      payment: { id: pId, amount: '400000.00', transaction_id: 'TXN-SURPLUS-400K' },
      targetLoanId: testLoanId,
      userId: 1,
      allocationType: 'ai_approved',
      connection
    });
    await connection.commit();

    console.log('Surplus Waterfall Result:', {
      total_payment: result.total_payment_amount,
      total_allocated: result.total_allocated_amount,
      unallocated_amount: result.unallocated_amount,
      allocations_count: result.allocations_count
    });

    const [schedules] = await pool.query(`
      SELECT installment_number, scheduled_amount, paid_amount, status
      FROM repayment_schedules
      WHERE loan_id = ?
      ORDER BY installment_number ASC;
    `, [testLoanId]);

    console.table(schedules);

    // Assertions
    if (result.total_allocated_amount !== 330000.00) {
      throw new Error(`Expected ₹3,30,000 allocated, got ${result.total_allocated_amount}`);
    }
    if (result.unallocated_amount !== 70000.00) {
      throw new Error(`Expected ₹70,000 unallocated, got ${result.unallocated_amount}`);
    }
    if (schedules.some(s => s.status !== 'paid')) {
      throw new Error(`All 3 installments must be marked paid`);
    }

    console.log('✅ SURPLUS / UNALLOCATED TEST PASSED: ₹3,30,000 settled across all installments, surplus ₹70,000 preserved as unallocated credit!\n');

    // 4. Cleanup
    await pool.query(`DELETE FROM payment_allocations WHERE payment_id = ?;`, [pId]);
    await pool.query(`DELETE FROM payments WHERE id = ?;`, [pId]);
    await pool.query(`DELETE FROM repayment_schedules WHERE loan_id = ?;`, [testLoanId]);
    await pool.query(`DELETE FROM loans WHERE id = ?;`, [testLoanId]);
    await pool.query(`DELETE FROM companies WHERE id = ?;`, [testCompanyId]);
    console.log('✓ Cleaned up surplus test records.\n');

  } catch (err) {
    console.error('❌ Surplus test failed:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

runSurplusTest();
