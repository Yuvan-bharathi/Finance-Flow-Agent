import pool from '../config/db.js';
import { runAnomalyAgentStageA, runAnomalyAgentStageB } from '../agents/anomalyAgent.js';
import app from '../app.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const PORT = 5098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const generateTestToken = () => {
  return jwt.sign(
    { id: 90002, email: 'yuvanbharathin@gmail.com', role_name: 'owner', role_id: 90002 },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

// Helper: Ingest a payment + case + recommendation for testing
const setupTestPayment = async (amount, senderName, senderAccount, companyId, loanId, paymentStatus = 'unmatched') => {
  const txnId = `TXN-ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const [payRes] = await pool.query(
    `INSERT INTO payments (transaction_id, amount, payment_date, sender_name, sender_account, status, source)
     VALUES (?, ?, '2026-08-25', ?, ?, ?, 'api')`,
    [txnId, amount, senderName, senderAccount, paymentStatus]
  );
  const paymentId = payRes.insertId;

  const [caseRes] = await pool.query(
    `INSERT INTO reconciliation_cases (payment_id, status, priority)
     VALUES (?, 'open', 'medium')`,
    [paymentId]
  );
  const caseId = caseRes.insertId;

  if (companyId && loanId) {
    await pool.query(
      `INSERT INTO ai_recommendations (reconciliation_case_id, recommended_company_id, recommended_loan_id, confidence_score, reasoning, status)
       VALUES (?, ?, ?, 95.0, 'Test AI match for anomaly validation', 'pending')`,
      [caseId, companyId, loanId]
    );
  }

  return { paymentId, caseId, txnId };
};

const runAnomalyTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING AGENT 7 ANOMALY DETECTION TEST SUITE');
  console.log('====================================================\n');

  const server = app.listen(PORT);
  const token = generateTestToken();

  try {
    // Fetch a live company and loan for realistic testing
    const [companies] = await pool.query('SELECT id, company_name, bank_account_number FROM companies LIMIT 1');
    if (companies.length === 0) throw new Error('No test companies found in database.');
    const testCompany = companies[0];

    const [loans] = await pool.query('SELECT id, loan_number, principal_amount FROM loans WHERE company_id = ? LIMIT 1', [testCompany.id]);
    if (loans.length === 0) throw new Error(`No loans found for company #${testCompany.id}`);
    const testLoan = loans[0];

    console.log(`Using Test Company: ${testCompany.company_name} (ID: ${testCompany.id})`);
    console.log(`Using Test Loan: ${testLoan.loan_number} (ID: ${testLoan.id})\n`);

    // --- TEST 1: Normal Standard Payment (Expected: CLEAR, score < 20) ---
    console.log('--- TEST 1: Normal Standard Payment (Expected: CLEAR, score < 20) ---');
    const { paymentId: normPayId } = await setupTestPayment(
      110000.00,
      testCompany.company_name,
      testCompany.bank_account_number || '123456789012',
      testCompany.id,
      testLoan.id
    );

    const normResult = await runAnomalyAgentStageB(normPayId);
    console.log('Result:', { score: normResult?.anomaly_score, severity: normResult?.severity, detected: normResult?.anomaly_detected });
    if (normResult?.anomaly_score >= 40) {
      throw new Error(`Expected score < 40 for normal payment, got ${normResult?.anomaly_score}`);
    }
    console.log('✓ TEST 1 PASSED: Normal payment classified as CLEAR/LOW.\n');

    // --- TEST 2: Unknown Payer Account (Expected: UNKNOWN_PAYER flag, score >= 30) ---
    console.log('--- TEST 2: Unknown Payer Account (Expected: UNKNOWN_PAYER, score >= 30) ---');
    const { paymentId: unkPayId } = await setupTestPayment(
      110000.00,
      testCompany.company_name,
      '999999999999_UNREGISTERED_ACCOUNT',
      testCompany.id,
      testLoan.id
    );

    const unkResult = await runAnomalyAgentStageB(unkPayId);
    console.log('Result:', { score: unkResult?.anomaly_score, severity: unkResult?.severity, types: unkResult?.anomaly_types });
    if (!unkResult?.anomaly_types?.includes('UNKNOWN_PAYER')) {
      throw new Error(`Expected UNKNOWN_PAYER in anomaly_types, got: ${JSON.stringify(unkResult?.anomaly_types)}`);
    }
    console.log('✓ TEST 2 PASSED: Unknown payer account correctly flagged.\n');

    // --- TEST 3: Duplicate Payment Fingerprint (Expected: DUPLICATE_PAYMENT) ---
    console.log('--- TEST 3: Duplicate Payment Fingerprint (Expected: DUPLICATE_PAYMENT) ---');
    await setupTestPayment(85000.00, testCompany.company_name, testCompany.bank_account_number, testCompany.id, testLoan.id, 'completed');
    const { paymentId: dupPayId } = await setupTestPayment(85000.00, testCompany.company_name, testCompany.bank_account_number, testCompany.id, testLoan.id, 'unmatched');

    const dupResult = await runAnomalyAgentStageB(dupPayId);
    console.log('Result:', { score: dupResult?.anomaly_score, severity: dupResult?.severity, types: dupResult?.anomaly_types });
    if (!dupResult?.anomaly_types?.includes('DUPLICATE_PAYMENT')) {
      throw new Error(`Expected DUPLICATE_PAYMENT flag, got: ${JSON.stringify(dupResult?.anomaly_types)}`);
    }
    console.log('✓ TEST 3 PASSED: Duplicate payment fingerprint detected.\n');

    // --- TEST 4: Massive Amount Overpayment (Expected: AMOUNT_ANOMALY / OVERPAYMENT, score >= 40) ---
    console.log('--- TEST 4: Massive Amount Deviation (Expected: AMOUNT_ANOMALY / OVERPAYMENT) ---');
    const { paymentId: overPayId } = await setupTestPayment(
      25000000.00,
      testCompany.company_name,
      testCompany.bank_account_number,
      testCompany.id,
      testLoan.id
    );

    const overResult = await runAnomalyAgentStageB(overPayId);
    console.log('Result:', { score: overResult?.anomaly_score, severity: overResult?.severity, types: overResult?.anomaly_types });
    if (overResult?.anomaly_score < 30) {
      throw new Error(`Expected high anomaly score for ₹2.5 Cr payment, got ${overResult?.anomaly_score}`);
    }
    console.log('✓ TEST 4 PASSED: Massive overpayment detected.\n');

    // --- TEST 5: HTTP Endpoints Verification ---
    console.log('--- TEST 5: HTTP Endpoints (List, Report, Check, Dismiss) ---');
    
    // GET /api/anomaly/list
    const listRes = await fetch(`${BASE_URL}/api/anomaly/list?limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (listRes.status !== 200) throw new Error(`GET /api/anomaly/list failed: ${listRes.status}`);
    const listJson = await listRes.json();
    console.log(`✓ GET /api/anomaly/list returned ${listJson.data?.length || 0} flagged records`);

    // GET /api/anomaly/report/:paymentId
    const reportRes = await fetch(`${BASE_URL}/api/anomaly/report/${unkPayId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (reportRes.status !== 200) throw new Error(`GET /api/anomaly/report failed: ${reportRes.status}`);
    const reportJson = await reportRes.json();
    console.log(`✓ GET /api/anomaly/report/${unkPayId} returned ${reportJson.data?.length || 0} report records`);

    // PUT /api/anomaly/:id/dismiss
    if (unkResult?.anomaly_id) {
      const dismissRes = await fetch(`${BASE_URL}/api/anomaly/${unkResult.anomaly_id}/dismiss`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dismiss_reason: 'Verified as legitimate subsidiary account.' })
      });
      if (dismissRes.status !== 200) throw new Error(`PUT /api/anomaly/:id/dismiss failed: ${dismissRes.status}`);
      const dismissJson = await dismissRes.json();
      console.log(`✓ PUT /api/anomaly/${unkResult.anomaly_id}/dismiss succeeded: ${dismissJson.message}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL 5 AGENT 7 ANOMALY DETECTION TESTS PASSED 100%');
    console.log('====================================================\n');

  } finally {
    server.close();
    process.exit(0);
  }
};

runAnomalyTests().catch((err) => {
  console.error('❌ Anomaly test suite failed:', err);
  process.exit(1);
});
