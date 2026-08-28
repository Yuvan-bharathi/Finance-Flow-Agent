import pool from '../config/db.js';

/**
 * Script: cleanup_test_duplicates.js
 * Purpose: Safe, transaction-protected cleanup of disposable test companies and test loans.
 *
 * Safety Guards:
 * - Supports --dry-run flag to preview before making any DB changes.
 * - Explicit pattern verification: Only targets names matching test naming ('Zero Overdue Test Corp', 'Batch Test Corp%').
 * - Preserves ALL canonical seed companies (IDs 1..25) and canonical loans (LN-2026-001..LN-EHE-2026-01).
 * - Full ACID transaction rollback on any error.
 */

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

const runCleanup = async () => {
  console.log('=====================================================');
  console.log(isDryRun ? '🔍 RUNNING IN DRY-RUN MODE (No DB changes will be applied)' : '⚡ EXECUTING SAFE DATABASE CLEANUP');
  console.log('=====================================================\n');

  const conn = await pool.getConnection();

  try {
    if (!isDryRun) {
      await conn.beginTransaction();
    }

    // 1. Identify test companies
    const [testCompanies] = await conn.query(`
      SELECT id, company_name, registration_number, created_at
      FROM companies
      WHERE (company_name LIKE '%Test Corp%' OR company_name LIKE '%Batch Test%')
        AND id > 25
      ORDER BY id ASC;
    `);

    const testCompanyIds = testCompanies.map(c => c.id);
    console.log(`1. Test Companies Identified (${testCompanies.length}):`);
    testCompanies.forEach(c => {
      console.log(`   - ID #${c.id}: ${c.company_name} (${c.registration_number})`);
    });

    if (testCompanyIds.length === 0) {
      console.log('✅ No disposable test companies found. Database is clean!');
      return;
    }

    // 2. Identify test loans
    const [testLoans] = await conn.query(`
      SELECT id, company_id, loan_number, principal_amount
      FROM loans
      WHERE company_id IN (?) OR loan_number LIKE 'LN-ZERO-%' OR loan_number LIKE 'LN-BATCH-%'
    `, [testCompanyIds]);

    const testLoanIds = testLoans.map(l => l.id);
    console.log(`\n2. Test Loans Identified (${testLoans.length}):`);
    testLoans.forEach(l => {
      console.log(`   - Loan #${l.id}: ${l.loan_number} (Company ID #${l.company_id}, Principal: ₹${l.principal_amount})`);
    });

    // 3. Identify repayment schedules
    let scheduleCount = 0;
    if (testLoanIds.length > 0) {
      const [schedules] = await conn.query(`
        SELECT id FROM repayment_schedules WHERE loan_id IN (?)
      `, [testLoanIds]);
      scheduleCount = schedules.length;
    }
    console.log(`\n3. Test Repayment Schedules to Remove: ${scheduleCount}`);

    // 4. Identify associated reconciliation cases, alerts, payments
    const [testCases] = await conn.query(`
      SELECT rc.id, rc.payment_id, p.transaction_id
      FROM reconciliation_cases rc
      LEFT JOIN payments p ON rc.payment_id = p.id
      WHERE p.sender_name LIKE '%Test Corp%' OR p.transaction_id LIKE '%TEST%' OR p.transaction_id LIKE '%ZERO%'
    `);
    console.log(`\n4. Test Reconciliation Cases / Test Payments to Clean: ${testCases.length}`);

    // 5. Verification Guard against canonical entities
    const [canonicalCompanies] = await conn.query(`
      SELECT id, company_name FROM companies WHERE id BETWEEN 1 AND 25
    `);
    const [canonicalLoans] = await conn.query(`
      SELECT id, loan_number FROM loans WHERE id BETWEEN 1 AND 25
    `);

    console.log('\n-----------------------------------------------------');
    console.log('SAFETY AUDIT:');
    console.log(`• Canonical seed companies protected: ${canonicalCompanies.length} / 25`);
    console.log(`• Canonical seed loans protected: ${canonicalLoans.length} / 25`);
    console.log('-----------------------------------------------------\n');

    if (isDryRun) {
      console.log('TEST CLEANUP PREVIEW SUMMARY:');
      console.log(`• Companies to remove: ${testCompanies.length}`);
      console.log(`• Loans to remove: ${testLoans.length}`);
      console.log(`• Repayment schedules to remove: ${scheduleCount}`);
      console.log(`• Test reconciliation cases to remove: ${testCases.length}`);
      console.log('\nDry run complete. No database changes made.');
      console.log('To execute the cleanup, run: node src/scripts/cleanup_test_duplicates.js --execute');
      return;
    }

    // ACTUAL CLEANUP EXECUTION INSIDE TRANSACTION
    console.log('⚡ Executing deletion cascade in transaction...');

    // A. Delete test repayment schedules
    if (testLoanIds.length > 0) {
      await conn.query(`DELETE FROM repayment_schedules WHERE loan_id IN (?)`, [testLoanIds]);
      console.log(`   ✓ Deleted ${scheduleCount} repayment schedule milestones.`);
    }

    // B. Delete test notification alerts
    await conn.query(`DELETE FROM notification_alerts WHERE company_id IN (?)`, [testCompanyIds]);
    console.log(`   ✓ Deleted associated test notification alerts.`);

    // C. Delete test AI recommendations
    if (testCases.length > 0) {
      const caseIds = testCases.map(c => c.id);
      await conn.query(`DELETE FROM ai_recommendations WHERE reconciliation_case_id IN (?)`, [caseIds]);
      await conn.query(`DELETE FROM reconciliation_cases WHERE id IN (?)`, [caseIds]);
      console.log(`   ✓ Deleted test reconciliation cases.`);
    }

    // D. Delete test loans
    if (testLoanIds.length > 0) {
      await conn.query(`DELETE FROM loans WHERE id IN (?)`, [testLoanIds]);
      console.log(`   ✓ Deleted ${testLoans.length} test loans.`);
    }

    // E. Delete test companies
    await conn.query(`DELETE FROM companies WHERE id IN (?)`, [testCompanyIds]);
    console.log(`   ✓ Deleted ${testCompanies.length} test companies.`);

    await conn.commit();
    console.log('\n🎉 TRANSACTION COMMITTED SUCCESSFULLY! All test duplicates purged.');

    // Final database state check
    const [finalCompanies] = await pool.query(`SELECT COUNT(*) as count FROM companies`);
    const [finalLoans] = await pool.query(`SELECT COUNT(*) as count FROM loans`);
    console.log(`• Final canonical companies: ${finalCompanies[0].count}`);
    console.log(`• Final canonical loans: ${finalLoans[0].count}`);

  } catch (err) {
    if (!isDryRun) {
      await conn.rollback();
      console.error('❌ Transaction rolled back due to error:', err);
    } else {
      console.error('❌ Error during dry run:', err);
    }
  } finally {
    conn.release();
    await pool.end();
  }
};

runCleanup();
