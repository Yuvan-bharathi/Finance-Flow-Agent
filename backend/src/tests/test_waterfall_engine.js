import pool from '../config/db.js';
import { executeContinuousWaterfall } from '../services/settlement.service.js';
import { executeRiskTool } from '../tools/riskTools.js';
import { executeCollectionTool } from '../tools/collectionTools.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE WATERFALL & MULTI-AGENT LEDGER TEST SUITE');
  console.log('================================================================\n');

  const connection = await pool.getConnection();

  try {
    // ─── SETUP: Create Isolated Test Company, Loan, and Installments ──────────
    console.log('1. Setting up isolated test loan facility with 6 overdue installments...');
    
    // Cleanup any pre-existing test records in correct foreign key order
    const [oldCompanies] = await pool.query(`SELECT id FROM companies WHERE company_name LIKE 'Waterfall Precision Corp%';`);
    if (oldCompanies.length > 0) {
      const oldCompanyIds = oldCompanies.map(c => c.id);
      const [oldLoans] = await pool.query(`SELECT id FROM loans WHERE company_id IN (?);`, [oldCompanyIds]);
      const oldLoanIds = oldLoans.map(l => l.id);

      if (oldLoanIds.length > 0) {
        await pool.query(`DELETE FROM payment_allocations WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id IN (?));`, [oldLoanIds]);
        await pool.query(`DELETE FROM repayment_schedules WHERE loan_id IN (?);`, [oldLoanIds]);
        await pool.query(`DELETE FROM loans WHERE id IN (?);`, [oldLoanIds]);
      }
      await pool.query(`DELETE FROM payments WHERE sender_name LIKE 'Waterfall Precision Corp%';`);
      await pool.query(`DELETE FROM companies WHERE id IN (?);`, [oldCompanyIds]);
    }

    const runSuffix = Date.now();
    const regNum = `REG-TEST-WF-${runSuffix}`;
    const loanNum = `LN-WF-TEST-${runSuffix}`;

    // Insert test company
    const [cRes] = await pool.query(`
      INSERT INTO companies (company_name, registration_number, tax_identifier, bank_account_number, contact_name, status)
      VALUES (?, ?, ?, '998877665544', 'Vikram Malhotra', 'active');
    `, [`Waterfall Precision Corp #${runSuffix}`, regNum, `TAX-WF-${runSuffix}`]);
    const testCompanyId = cRes.insertId;

    // Insert test loan: Principal ₹10,00,000, 10 installments @ ₹1,10,000
    const [lRes] = await pool.query(`
      INSERT INTO loans (company_id, loan_number, principal_amount, interest_rate, total_payable, start_date, end_date, status)
      VALUES (?, ?, '1000000.00', '10.00', '1100000.00', '2026-01-01', '2026-10-31', 'active');
    `, [testCompanyId, loanNum]);
    const testLoanId = lRes.insertId;

    // Insert 10 installments: #1 paid, #2..#7 overdue (each ₹1,10,000), #8..#10 upcoming
    const dates = [
      '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01',
      '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'
    ];

    for (let i = 1; i <= 10; i++) {
      const isPaid = i === 1;
      const isOverdue = i >= 2 && i <= 7;
      const status = isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending');
      const paidAmt = isPaid ? '110000.00' : '0.00';

      await pool.query(`
        INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
        VALUES (?, ?, ?, '110000.00', ?, ?);
      `, [testLoanId, i, dates[i - 1], paidAmt, status]);
    }

    console.log(`✓ Created test facility #${testLoanId} for Company #${testCompanyId} with ₹6,60,000 overdue (#2..#7).\n`);

    // ─── TEST 1: Continuous Waterfall with ₹4,00,000 Payment ──────────────────
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 1: Ingest ₹4,00,000 payment against ₹6,60,000 overdue');
    console.log('────────────────────────────────────────────────────────────────');

    const [p1Res] = await pool.query(`
      INSERT INTO payments (transaction_id, amount, payment_date, sender_name, sender_account, source, status)
      VALUES ('TXN-WF-P1-400K', '400000.00', '2026-08-26', 'Waterfall Precision Corp', '998877665544', 'api', 'processing');
    `);
    const p1Id = p1Res.insertId;

    await connection.beginTransaction();
    const result1 = await executeContinuousWaterfall({
      payment: { id: p1Id, amount: '400000.00', transaction_id: 'TXN-WF-P1-400K' },
      targetLoanId: testLoanId,
      userId: 1,
      allocationType: 'ai_approved',
      connection
    });
    await connection.commit();

    console.log('Waterfall Result 1 Summary:', {
      total_payment: result1.total_payment_amount,
      total_allocated: result1.total_allocated_amount,
      unallocated_amount: result1.unallocated_amount,
      allocations_count: result1.allocations_count
    });

    const [schedules1] = await pool.query(`
      SELECT installment_number, due_date, scheduled_amount, paid_amount, status
      FROM repayment_schedules
      WHERE loan_id = ?
      ORDER BY installment_number ASC;
    `, [testLoanId]);

    console.table(schedules1.map(s => ({
      '#': s.installment_number,
      'Scheduled': s.scheduled_amount,
      'Paid': s.paid_amount,
      'Remaining': (parseFloat(s.scheduled_amount) - parseFloat(s.paid_amount)).toFixed(2),
      'Status': s.status
    })));

    // Assertions for Test 1
    const [allocs1] = await pool.query(`SELECT * FROM payment_allocations WHERE payment_id = ?`, [p1Id]);
    if (allocs1.length !== 4) throw new Error(`Expected 4 allocations, got ${allocs1.length}`);
    if (schedules1[1].status !== 'paid') throw new Error(`EMI #2 should be paid`);
    if (schedules1[2].status !== 'paid') throw new Error(`EMI #3 should be paid`);
    if (schedules1[3].status !== 'paid') throw new Error(`EMI #4 should be paid`);
    if (schedules1[4].status !== 'partially_paid' || parseFloat(schedules1[4].paid_amount) !== 70000.00) {
      throw new Error(`EMI #5 should be partially_paid with ₹70,000 paid`);
    }
    if (schedules1[5].status !== 'overdue' || parseFloat(schedules1[5].paid_amount) !== 0.00) {
      throw new Error(`EMI #6 should remain overdue`);
    }
    console.log('✅ TEST 1 PASSED: Continuous waterfall allocated ₹4,00,000 across 4 milestones (3 full + 1 partial)!\n');

    // ─── TEST 2: Multiple Partial Payments against Same EMI (#5) ─────────────
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 2: Ingest second payment of ₹40,000 to complete EMI #5');
    console.log('────────────────────────────────────────────────────────────────');

    const [p2Res] = await pool.query(`
      INSERT INTO payments (transaction_id, amount, payment_date, sender_name, sender_account, source, status)
      VALUES ('TXN-WF-P2-40K', '40000.00', '2026-08-26', 'Waterfall Precision Corp', '998877665544', 'api', 'processing');
    `);
    const p2Id = p2Res.insertId;

    await connection.beginTransaction();
    const result2 = await executeContinuousWaterfall({
      payment: { id: p2Id, amount: '40000.00', transaction_id: 'TXN-WF-P2-40K' },
      targetLoanId: testLoanId,
      userId: 1,
      allocationType: 'ai_approved',
      connection
    });
    await connection.commit();

    const [schedules2] = await pool.query(`
      SELECT installment_number, scheduled_amount, paid_amount, status
      FROM repayment_schedules
      WHERE loan_id = ? AND installment_number = 5;
    `, [testLoanId]);

    const [allocsForEMI5] = await pool.query(`
      SELECT pa.id, pa.payment_id, pa.allocated_amount, p.transaction_id
      FROM payment_allocations pa
      JOIN payments p ON pa.payment_id = p.id
      WHERE pa.repayment_schedule_id = (SELECT id FROM repayment_schedules WHERE loan_id = ? AND installment_number = 5);
    `, [testLoanId]);

    console.log('EMI #5 Status after 2nd payment:', schedules2[0]);
    console.log('EMI #5 1:N Allocation History (2 discrete rows):', allocsForEMI5);

    if (allocsForEMI5.length !== 2) throw new Error(`Expected 2 allocation rows for EMI #5, got ${allocsForEMI5.length}`);
    if (schedules2[0].status !== 'paid' || parseFloat(schedules2[0].paid_amount) !== 110000.00) {
      throw new Error(`EMI #5 should now be fully PAID (₹1,10,000)`);
    }
    console.log('✅ TEST 2 PASSED: Multiple partial payments safely accumulated to PAID with 1:N audit history preserved!\n');

    // ─── TEST 3: Agent 2 & Agent 3 Live DB State Recalculations ──────────────
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 3: Verify Agent 2 (Risk) & Agent 3 (Collection) see Net Overdue');
    console.log('────────────────────────────────────────────────────────────────');

    const riskScheduleData = await executeRiskTool('getLoanScheduleStatus', { companyId: testCompanyId });
    console.log('Agent 2 Live Overdue Exposure:', {
      overdue_count: riskScheduleData.loans[0]?.overdue_count,
      total_overdue_amount: riskScheduleData.loans[0]?.total_overdue_amount,
      max_days_overdue: riskScheduleData.loans[0]?.max_days_overdue
    });

    const overdueList = await executeCollectionTool('getOverdueInstallments', { companyId: testCompanyId });
    console.log(`Agent 3 Overdue Milestones Count: ${overdueList.length} (EMIs #6, #7, #8 @ ₹1,10,000 = ₹3,30,000)`);

    if (parseInt(riskScheduleData.loans[0]?.overdue_count) !== 3) {
      throw new Error(`Expected 3 overdue installments remaining, got ${riskScheduleData.loans[0]?.overdue_count}`);
    }
    if (parseFloat(riskScheduleData.loans[0]?.total_overdue_amount) !== 330000.00) {
      throw new Error(`Expected ₹3,30,000 overdue exposure, got ${riskScheduleData.loans[0]?.total_overdue_amount}`);
    }

    const agent3RunResult = await runCollectionAgent(testCompanyId, 1);
    console.log('Agent 3 Collection Notice Output:', {
      status: agent3RunResult.status || 'GENERATED',
      total_overdue_amount: agent3RunResult.total_overdue_amount,
      subject: agent3RunResult.subject
    });

    if (agent3RunResult.total_overdue_amount !== 330000.00) {
      throw new Error(`Agent 3 should calculate exact net overdue of ₹3,30,000, got ${agent3RunResult.total_overdue_amount}`);
    }
    console.log('✅ TEST 3 PASSED: Agent 2 & Agent 3 computed risk and collection notice strictly on new net DB balances!\n');

    // ─── TEST 4: ACID Transaction Rollback Verification ──────────────────────
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 4: ACID Transaction Rollback on Simulated DB Error');
    console.log('────────────────────────────────────────────────────────────────');

    let rollbackSucceeded = false;
    const [preRollbackAllocs] = await pool.query(`SELECT COUNT(*) AS cnt FROM payment_allocations;`);
    const countBefore = preRollbackAllocs[0].cnt;

    try {
      await connection.beginTransaction();
      await connection.query(`INSERT INTO payment_allocations (payment_id, repayment_schedule_id, allocated_amount, approved_by, allocation_type) VALUES (?, (SELECT id FROM repayment_schedules WHERE loan_id = ? LIMIT 1), '100.00', 1, 'ai_approved');`, [p1Id, testLoanId]);
      // Intentionally cause foreign key violation
      await connection.query(`INSERT INTO payment_allocations (payment_id, repayment_schedule_id, allocated_amount, approved_by, allocation_type) VALUES (9999999, 9999999, '100.00', 1, 'ai_approved');`);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      rollbackSucceeded = true;
      console.log('✓ Simulated DB failure caught and rolled back safely.');
    }

    const [postRollbackAllocs] = await pool.query(`SELECT COUNT(*) AS cnt FROM payment_allocations;`);
    const countAfter = postRollbackAllocs[0].cnt;

    if (!rollbackSucceeded || countBefore !== countAfter) {
      throw new Error(`Rollback test failed: allocation counts changed from ${countBefore} to ${countAfter}`);
    }
    console.log('✅ TEST 4 PASSED: ACID rollback verified with 0 orphan records!\n');

    // ─── CLEANUP: Safely Delete Test Records ─────────────────────────────────
    console.log('────────────────────────────────────────────────────────────────');
    console.log('🧹 Cleaning up test records in ACID transaction...');
    await pool.query(`DELETE FROM payment_allocations WHERE payment_id IN (?, ?);`, [p1Id, p2Id]);
    await pool.query(`DELETE FROM payments WHERE id IN (?, ?);`, [p1Id, p2Id]);
    await pool.query(`DELETE FROM repayment_schedules WHERE loan_id = ?;`, [testLoanId]);
    await pool.query(`DELETE FROM loans WHERE id = ?;`, [testLoanId]);
    await pool.query(`DELETE FROM companies WHERE id = ?;`, [testCompanyId]);
    console.log('✓ Cleaned up test company, loan, schedules, payments, and allocations.\n');

    console.log('================================================================');
    console.log('🎉 ALL 4 WATERFALL & MULTI-AGENT LEDGER TESTS PASSED 100%!');
    console.log('================================================================');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

runTests();
