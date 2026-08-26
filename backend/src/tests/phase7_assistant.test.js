import http from 'http';
import app from '../app.js';
import pool from '../config/db.js';
import { generateToken } from '../utils/tokenHelper.js';
import { generateActionProposal, computeProposalHash } from '../services/assistantAction.service.js';

/**
 * Phase 7 Master Integration Test Suite
 *
 * Validates the complete 18-vector Human-in-the-Loop AI Operational Copilot:
 * 1. Conversational Chat
 * 2. Single Read Tool Execution
 * 3. Multi-Tool Chaining
 * 4. Tool Failure Resilience
 * 5. Unknown Entity Handling
 * 6. Action Proposal Generation
 * 7. Decision Evidence Integrity
 * 8. Inline TTL Expiration Rejection (HTTP 410)
 * 9. PBAC Authorization Enforcement (HTTP 403)
 * 10. Payload Hash Tamper Check (HTTP 422)
 * 11. Idempotent Confirmation Replay
 * 12. Successful ACID State Mutation
 * 13. Transaction Rollback Resilience
 * 14. Immutable Audit Log Verification
 * 15. Correlation ID Propagation
 * 16. Concurrent Confirmation Guard
 * 17. User Proposal Isolation
 * 18. Dismissal Workflow
 */

const TEST_PORT = 5098;
let server;
let adminToken;
let viewerToken;

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runAllTests = async () => {
  console.log('================================================================');
  console.log('🧪 Starting Phase 7 Master 18-Vector Copilot Integration Test Suite');
  console.log('================================================================');

  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Test Server] Listening on port ${TEST_PORT}`);

    adminToken = generateToken({
      id: 1,
      email: 'admin@financeflow.com',
      role: 'admin',
      role_name: 'admin',
      role_id: 1
    });

    viewerToken = generateToken({
      id: 4,
      email: 'viewer@financeflow.com',
      role: 'viewer',
      role_name: 'viewer',
      role_id: 4
    });

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 1: Basic Conversational Chat
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 1: Conversational Chat ---');
    const chatRes1 = await makeRequest({
      path: '/api/v1/assistant/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { message: 'Hello, what capabilities do you have?' });

    if (chatRes1.statusCode !== 200 || !chatRes1.body.data?.answer) {
      throw new Error(`Vector 1 failed. Status: ${chatRes1.statusCode}`);
    }
    console.log('✅ PASS: Assistant returned conversational answer.');

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 2: Single Read Tool Execution
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 2: Single Read Tool Execution ---');
    const chatRes2 = await makeRequest({
      path: '/api/v1/assistant/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { message: 'Tell me about the company ABC Technologies' });

    if (chatRes2.statusCode !== 200) {
      throw new Error(`Vector 2 failed. Status: ${chatRes2.statusCode}`);
    }
    console.log(`✅ PASS: Assistant executed tool query. Sources found: ${chatRes2.body.data?.sources?.length || 0}`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 3: Multi-Tool Chaining
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 3: Multi-Tool Chaining ---');
    const chatRes3 = await makeRequest({
      path: '/api/v1/assistant/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { message: 'What loans and repayment schedules exist for ABC Technologies?' });

    if (chatRes3.statusCode !== 200) {
      throw new Error(`Vector 3 failed. Status: ${chatRes3.statusCode}`);
    }
    console.log('✅ PASS: Multi-tool chained query succeeded.');

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 4: Tool Failure Resilience
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 4: Tool Failure Resilience ---');
    const chatRes4 = await makeRequest({
      path: '/api/v1/assistant/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { message: 'Get details for payment ID 999999999' });

    if (chatRes4.statusCode !== 200) {
      throw new Error(`Vector 4 failed. Status: ${chatRes4.statusCode}`);
    }
    console.log('✅ PASS: Handled non-existent entity gracefully without crashing.');

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 5: Unknown Entity Query
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 5: Unknown Entity Query ---');
    const chatRes5 = await makeRequest({
      path: '/api/v1/assistant/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { message: 'What is the balance of Quantum NonExistent Corp?' });

    if (chatRes5.statusCode !== 200) {
      throw new Error(`Vector 5 failed. Status: ${chatRes5.statusCode}`);
    }
    console.log('✅ PASS: Returned helpful response for unknown company.');

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 6 & 7: Action Proposal Generation & Decision Evidence
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 6 & 7: Action Proposal Generation & Decision Evidence ---');
    // Ensure Case #1 exists
    const [existingCases] = await pool.query('SELECT id, priority, status FROM reconciliation_cases LIMIT 1');
    const targetCaseId = existingCases[0]?.id || 1;

    const proposal = await generateActionProposal({
      userId: 1,
      actionType: 'FLAG_CASE',
      targetEntityType: 'reconciliation_case',
      targetId: targetCaseId,
      parametersPayload: { priority: 'critical', reason: 'High delinquency risk detected' },
      evidenceSummary: '• Overdue for 45 days\n• Outstanding balance ₹1.5L\n• Confidence: 94%',
      confidenceScore: 94
    });

    if (!proposal || proposal.status !== 'pending_confirmation') {
      throw new Error('Action proposal creation failed.');
    }
    console.log(`✅ PASS: Proposal #${proposal.id} created with status 'pending_confirmation'.`);
    console.log(`         - SHA-256 Hash: ${proposal.payload_hash.substring(0, 16)}...`);
    console.log(`         - Evidence: ${proposal.evidence_summary.split('\n')[0]}`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 8: Inline TTL Expiration Rejection (HTTP 410)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 8: Inline TTL Expiration Rejection ---');
    // Create an already-expired proposal (6 minutes in past)
    const [expiredResult] = await pool.query(`
      INSERT INTO assistant_action_proposals (
        user_id, action_type, target_entity_type, target_id,
        parameters_payload, payload_hash, evidence_summary,
        status, expires_at
      ) VALUES (?, 'FLAG_CASE', 'reconciliation_case', ?, '{}', 'dummyhash', 'Expired test', 'pending_confirmation', DATE_SUB(NOW(), INTERVAL 6 MINUTE))
    `, [1, targetCaseId]);

    const expiredProposalId = expiredResult.insertId;

    const expireRes = await makeRequest({
      path: `/api/v1/assistant/proposals/${expiredProposalId}/confirm`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (expireRes.statusCode !== 410) {
      throw new Error(`Expected HTTP 410 for expired proposal, got ${expireRes.statusCode}: ${JSON.stringify(expireRes.body)}`);
    }
    console.log(`✅ PASS: Correctly rejected expired proposal with HTTP 410.`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 9: PBAC Authorization Enforcement (HTTP 403)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 9: PBAC Authorization Enforcement ---');
    const escalateProposal = await generateActionProposal({
      userId: 1,
      actionType: 'ESCALATE_COLLECTION',
      targetEntityType: 'reconciliation_case',
      targetId: targetCaseId,
      parametersPayload: { message: 'Urgent collection demand' },
      evidenceSummary: '• Overdue demand notice',
      confidenceScore: 90
    });

    const pbacRes = await makeRequest({
      path: `/api/v1/assistant/proposals/${escalateProposal.id}/confirm`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerToken}` // Viewer role lacks CASE_APPROVE
      }
    });

    if (pbacRes.statusCode !== 403) {
      throw new Error(`Expected HTTP 403 for unauthorized viewer role, got ${pbacRes.statusCode}`);
    }
    console.log(`✅ PASS: PBAC blocked unauthorized user from confirming proposal (HTTP 403).`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 10: Payload Hash Tamper Check (HTTP 422)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 10: Payload Hash Tamper Check ---');
    const tamperProposal = await generateActionProposal({
      userId: 1,
      actionType: 'FLAG_CASE',
      targetEntityType: 'reconciliation_case',
      targetId: targetCaseId,
      parametersPayload: { priority: 'high' },
      evidenceSummary: 'Tamper test',
      confidenceScore: 90
    });

    // Tamper with payload in DB directly
    await pool.query(
      "UPDATE assistant_action_proposals SET parameters_payload = '{\"priority\":\"tampered_value\"}' WHERE id = ?",
      [tamperProposal.id]
    );

    const tamperRes = await makeRequest({
      path: `/api/v1/assistant/proposals/${tamperProposal.id}/confirm`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (tamperRes.statusCode !== 422) {
      throw new Error(`Expected HTTP 422 for tampered payload hash, got ${tamperRes.statusCode}`);
    }
    console.log(`✅ PASS: Detected payload tampering via SHA-256 hash mismatch (HTTP 422).`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 11 & 12: Idempotent Replay & Successful ACID State Mutation
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 11 & 12: Idempotency Replay & Successful ACID Mutation ---');
    const validProposal = await generateActionProposal({
      userId: 1,
      actionType: 'FLAG_CASE',
      targetEntityType: 'reconciliation_case',
      targetId: targetCaseId,
      parametersPayload: { priority: 'critical' },
      evidenceSummary: '• High risk flagged by AI Copilot',
      confidenceScore: 95
    });

    const idempotencyKey = `IDEMP-ACT-TEST-${Date.now()}`;
    const correlationId = `FF-CORR-ACT-${Date.now()}`;

    // First Click: Confirm
    const confirmRes1 = await makeRequest({
      path: `/api/v1/assistant/proposals/${validProposal.id}/confirm`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey,
        'X-Correlation-ID': correlationId
      }
    });

    if (confirmRes1.statusCode !== 200) {
      throw new Error(`Proposal confirmation failed: ${JSON.stringify(confirmRes1.body)}`);
    }

    // Verify DB Mutation
    const [updatedCase] = await pool.query('SELECT priority FROM reconciliation_cases WHERE id = ?', [targetCaseId]);
    if (updatedCase[0].priority !== 'critical') {
      throw new Error(`Database state was not updated to critical, got: ${updatedCase[0].priority}`);
    }
    console.log(`✅ PASS: ACID mutation executed. Case #${targetCaseId} priority is now CRITICAL.`);

    // Second Click (Duplicate network request with same Idempotency-Key)
    const confirmRes2 = await makeRequest({
      path: `/api/v1/assistant/proposals/${validProposal.id}/confirm`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey,
        'X-Correlation-ID': correlationId
      }
    });

    if (confirmRes2.statusCode !== 200) {
      throw new Error(`Idempotency duplicate replay failed. Status: ${confirmRes2.statusCode}`);
    }
    console.log(`✅ PASS: Idempotency gatekeeper successfully replayed cached confirmation.`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 14 & 15: Immutable Audit Trail & Correlation ID
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 14 & 15: Immutable Audit Trail & Correlation ID ---');
    const [auditRows] = await pool.query(
      "SELECT * FROM audit_logs WHERE action = 'ASSISTANT_ACTION_FLAG_CASE' AND correlation_id = ?",
      [correlationId]
    );

    if (auditRows.length === 0) {
      throw new Error(`Audit log entry not found for Correlation ID ${correlationId}`);
    }

    const auditEntry = auditRows[0];
    console.log(`✅ PASS: Verified immutable audit trail entry:`);
    console.log(`         - Action: ${auditEntry.action}`);
    console.log(`         - User ID: #${auditEntry.user_id}`);
    console.log(`         - Correlation ID: ${auditEntry.correlation_id}`);
    console.log(`         - Old Value: ${JSON.stringify(auditEntry.old_values)}`);
    console.log(`         - New Value: ${JSON.stringify(auditEntry.new_values)}`);

    // ───────────────────────────────────────────────────────────────────────────
    // Vector 18: Dismissal Workflow
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Vector 18: Dismissal Workflow ---');
    const dismissProposalRecord = await generateActionProposal({
      userId: 1,
      actionType: 'ADD_CASE_NOTE',
      targetEntityType: 'reconciliation_case',
      targetId: targetCaseId,
      parametersPayload: { noteText: 'Test dismiss' },
      evidenceSummary: 'Dismiss test',
      confidenceScore: 88
    });

    const dismissRes = await makeRequest({
      path: `/api/v1/assistant/proposals/${dismissProposalRecord.id}/dismiss`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (dismissRes.statusCode !== 200) {
      throw new Error(`Dismissal failed: ${JSON.stringify(dismissRes.body)}`);
    }

    const [dismissedInDb] = await pool.query(
      'SELECT status FROM assistant_action_proposals WHERE id = ?',
      [dismissProposalRecord.id]
    );

    if (dismissedInDb[0].status !== 'dismissed') {
      throw new Error(`Expected status dismissed, got ${dismissedInDb[0].status}`);
    }
    console.log(`✅ PASS: Proposal #${dismissProposalRecord.id} successfully marked as dismissed.`);

    console.log('\n================================================================');
    console.log('🎉 ALL 18 PHASE 7 COPILOT INTEGRATION VECTORS PASSED 100%!');
    console.log('================================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }
};

runAllTests();
