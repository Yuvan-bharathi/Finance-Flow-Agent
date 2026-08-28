import { runPipelineWorkflow } from '../services/orchestrator.service.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';
import pool from '../config/db.js';

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 Starting Collection Follow-Up Eligibility & Skip Tests');
  console.log('================================================================');

  try {
    const uniqueKey = `ZERO-${Date.now()}`;
    const [compInsert] = await pool.query(`
      INSERT INTO companies (company_name, registration_number, contact_name, contact_email)
      VALUES ('Zero Overdue Test Corp', ?, 'Aditi Sharma', 'aditi@zerotest.com')
    `, [`REG-${uniqueKey}`]);
    const cleanCompanyId = compInsert.insertId;

    const [loanInsert] = await pool.query(`
      INSERT INTO loans (company_id, loan_number, principal_amount, total_payable, interest_rate, start_date, end_date, status)
      VALUES (?, ?, 500000.00, 550000.00, 10.00, '2026-01-01', '2027-02-01', 'active')
    `, [cleanCompanyId, `LN-${uniqueKey}`]);
    const cleanLoanId = loanInsert.insertId;

    // Insert 2 paid installments and 2 future pending installments
    await pool.query(`
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
      VALUES 
        (?, 1, '2026-01-01', 55000.00, 55000.00, 'paid'),
        (?, 2, '2026-02-01', 55000.00, 55000.00, 'paid'),
        (?, 3, '2027-01-01', 55000.00, 0.00, 'pending'),
        (?, 4, '2027-02-01', 55000.00, 0.00, 'pending')
    `, [cleanLoanId, cleanLoanId, cleanLoanId, cleanLoanId]);

    // Create a payment and reconciliation case for this clean company
    const [payInsert] = await pool.query(`
      INSERT INTO payments (transaction_id, amount, payment_date, sender_name, status)
      VALUES (?, 55000.00, '2026-08-25', 'Zero Overdue Test Corp', 'pending')
    `, [`TXN-${uniqueKey}`]);
    const cleanPaymentId = payInsert.insertId;

    const [caseInsert] = await pool.query(`
      INSERT INTO reconciliation_cases (payment_id, status, priority)
      VALUES (?, 'open', 'low')
    `, [cleanPaymentId]);
    const cleanCaseId = caseInsert.insertId;

    console.log(`\nCreated zero-overdue test company #${cleanCompanyId}, case #${cleanCaseId}`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 1: Orchestrator Step 3 Skip for Zero-Overdue Borrower
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Pipeline Step 3 Skip for Zero-Overdue Borrower ---');
    const pipeline = await runPipelineWorkflow({
      workflow: 'RECONCILIATION_AND_RISK',
      contextData: {
        caseId: cleanCaseId,
        companyId: cleanCompanyId
      },
      userId: 1
    });

    const step3 = pipeline.steps.find(s => s.agent_name === 'AutomatedCollectionFollowUpAgent');
    if (!step3) throw new Error('Step 3 not found in pipeline execution');

    console.log(`Step 3 Status: ${step3.status}`);
    console.log(`Step 3 Reason: ${step3.output_payload?.reason}`);

    if (step3.status !== 'skipped') {
      throw new Error(`Expected Step 3 to be 'skipped', got: '${step3.status}'`);
    }
    console.log('✅ PASS: Step 3 was accurately SKIPPED by orchestrator. No Groq call or reminder generated.');

    // ───────────────────────────────────────────────────────────────────────────
    // Test 2: Single-Agent Direct Call Skip for Zero-Overdue Borrower
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Direct Collection Agent Run for Zero-Overdue Borrower ---');
    const directResult = await runCollectionAgent(cleanCompanyId, 1);
    if (!directResult.skipped || directResult.status !== 'SKIPPED') {
      throw new Error(`Expected direct run to return SKIPPED, got: ${JSON.stringify(directResult)}`);
    }
    console.log('✅ PASS: Direct agent execution returned status: SKIPPED with message:');
    console.log(`         "${directResult.message}"`);

    // Clean up test data
    await pool.query('DELETE FROM ai_recommendations WHERE reconciliation_case_id = ?', [cleanCaseId]);
    await pool.query('DELETE FROM reconciliation_cases WHERE id = ?', [cleanCaseId]);
    await pool.query('DELETE FROM payments WHERE id = ?', [cleanPaymentId]);
    await pool.query('DELETE FROM repayment_schedules WHERE loan_id = ?', [cleanLoanId]);
    await pool.query('DELETE FROM loans WHERE id = ?', [cleanLoanId]);
    await pool.query('DELETE FROM companies WHERE id = ?', [cleanCompanyId]);

    console.log('\n================================================================');
    console.log('🎉 ALL COLLECTION ELIGIBILITY & SKIP TESTS PASSED 100%!');
    console.log('================================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runTests();
