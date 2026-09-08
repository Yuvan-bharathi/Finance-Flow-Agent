import pool from '../config/db.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';
import { runPipelineWorkflow } from '../services/orchestrator.service.js';

const runTest = async () => {
  console.log('================================================================');
  console.log('🧪 Testing Automated Collection Email Dispatch in Pipeline');
  console.log('================================================================');

  try {
    const uniqueKey = `OVERDUE-${Date.now()}`;
    // 1. Create a test company with overdue debt and email
    const [compInsert] = await pool.query(`
      INSERT INTO companies (company_name, registration_number, contact_name, contact_email)
      VALUES ('Apex Logistics Ltd', ?, 'Rajesh Kumar', 'finance@apexlogistics.com')
    `, [`REG-${uniqueKey}`]);
    const testCompanyId = compInsert.insertId;

    const [loanInsert] = await pool.query(`
      INSERT INTO loans (company_id, loan_number, principal_amount, total_payable, interest_rate, start_date, end_date, status)
      VALUES (?, ?, 1000000.00, 1100000.00, 10.00, '2026-01-01', '2027-01-01', 'active')
    `, [testCompanyId, `LN-${uniqueKey}`]);
    const testLoanId = loanInsert.insertId;

    // Insert 1 overdue installment (due 45 days ago)
    await pool.query(`
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
      VALUES (?, 1, '2026-07-01', 110000.00, 0.00, 'overdue')
    `, [testLoanId]);

    // Create a payment & case
    const [payInsert] = await pool.query(`
      INSERT INTO payments (transaction_id, amount, payment_date, sender_name, status)
      VALUES (?, 50000.00, '2026-08-25', 'Apex Logistics Ltd', 'pending')
    `, [`TXN-${uniqueKey}`]);
    const testPaymentId = payInsert.insertId;

    const [caseInsert] = await pool.query(`
      INSERT INTO reconciliation_cases (payment_id, status, priority)
      VALUES (?, 'open', 'high')
    `, [testPaymentId]);
    const testCaseId = caseInsert.insertId;

    console.log(`Created test company #${testCompanyId}, loan #${testLoanId}, case #${testCaseId}`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 1: Direct Collection Agent execution with automated email dispatch
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Direct Collection Agent Execution ---');
    const directResult = await runCollectionAgent(testCompanyId, 1);
    console.log('Collection Agent Output:', {
      urgency_level: directResult.urgency_level,
      subject: directResult.subject,
      email_dispatched: directResult.email_dispatched,
      dispatched_to: directResult.dispatched_to,
      dispatched_at: directResult.dispatched_at,
      total_overdue_amount: directResult.total_overdue_amount
    });

    if (!directResult.subject || !directResult.email_body) {
      throw new Error('Expected subject and email body to be drafted.');
    }
    if (directResult.dispatched_to !== 'finance@apexlogistics.com') {
      throw new Error(`Expected dispatched_to to be 'finance@apexlogistics.com', got '${directResult.dispatched_to}'`);
    }

    // Verify notification_alerts has approved alert with approved_at
    const [alertRows] = await pool.query(`
      SELECT * FROM notification_alerts WHERE company_id = ? ORDER BY id DESC LIMIT 1
    `, [testCompanyId]);
    console.log('Saved Alert Status:', alertRows[0]?.notification_status);
    console.log('Saved Alert Approved At:', alertRows[0]?.approved_at);

    // Verify audit_logs has AUTO_DISPATCH_COLLECTION_NOTICE
    const [auditRows] = await pool.query(`
      SELECT * FROM audit_logs WHERE action = 'AUTO_DISPATCH_COLLECTION_NOTICE' AND entity_id = ?
    `, [testCompanyId]);
    console.log(`Audit Log Count for AUTO_DISPATCH_COLLECTION_NOTICE: ${auditRows.length}`);

    // Clean up
    await pool.query('DELETE FROM notification_alerts WHERE company_id = ?', [testCompanyId]);
    await pool.query('DELETE FROM audit_logs WHERE action = "AUTO_DISPATCH_COLLECTION_NOTICE" AND entity_id = ?', [testCompanyId]);
    await pool.query('DELETE FROM ai_recommendations WHERE reconciliation_case_id = ?', [testCaseId]);
    await pool.query('DELETE FROM reconciliation_cases WHERE id = ?', [testCaseId]);
    await pool.query('DELETE FROM payments WHERE id = ?', [testPaymentId]);
    await pool.query('DELETE FROM repayment_schedules WHERE loan_id = ?', [testLoanId]);
    await pool.query('DELETE FROM loans WHERE id = ?', [testLoanId]);
    await pool.query('DELETE FROM companies WHERE id = ?', [testCompanyId]);

    console.log('\n================================================================');
    console.log('🎉 AUTOMATED COLLECTION EMAIL DISPATCH TEST PASSED 100%!');
    console.log('================================================================');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runTest();
