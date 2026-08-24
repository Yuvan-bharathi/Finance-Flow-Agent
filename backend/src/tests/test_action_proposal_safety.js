import pool from '../config/db.js';
import { confirmActionProposal } from '../services/assistantAction.service.js';

async function runSafetyAndAuditVerification() {
  console.log('=============================================================');
  console.log('🧪 Starting Phase 3 Action Proposal Safety & Audit Verification');
  console.log('=============================================================\n');

  const testUser = {
    id: 3,
    name: 'Senior Accountant',
    email: 'accountant@financeflow.com',
    role: 'accountant'
  };

  let passedTests = 0;
  let totalTests = 4;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Target-State Validation (Reject Mutation on Resolved Case)
    // -------------------------------------------------------------------------
    console.log('▶ TEST 1: Re-check Target State on Resolved Case...');
    
    // Create a proposal for Case #13 (which is already 'resolved')
    const proposalResolvedId = `ACT-TEST-RESOLVED-${Date.now()}`;
    await pool.query(`
      INSERT INTO assistant_action_proposals (
        id, action_type, target_entity, target_id, requested_params, reason,
        created_by, created_by_name, created_by_role, status, expires_at
      ) VALUES (?, 'FLAG_CASE', 'reconciliation_case', 13, '{"priority":"critical"}', 'Test flag on resolved case',
        ?, ?, ?, 'pending_confirmation', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    `, [proposalResolvedId, testUser.id, testUser.name, testUser.role]);

    try {
      await confirmActionProposal(proposalResolvedId, testUser);
      console.error('❌ TEST 1 FAILED: Action on resolved case should have been rejected!');
    } catch (err) {
      if (err.statusCode === 409 || err.message.includes('already RESOLVED')) {
        console.log('✅ TEST 1 PASSED: Correctly rejected mutation on resolved Case #13 with message:', err.message);
        passedTests++;
      } else {
        console.error('❌ TEST 1 FAILED with unexpected error:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 2: Expiration Validation (Reject Stale Proposals after 15 minutes)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 2: Expiration Validation (Reject Proposals past TTL)...');
    
    const proposalExpiredId = `ACT-TEST-EXPIRED-${Date.now()}`;
    await pool.query(`
      INSERT INTO assistant_action_proposals (
        id, action_type, target_entity, target_id, requested_params, reason,
        created_by, created_by_name, created_by_role, status, expires_at
      ) VALUES (?, 'FLAG_CASE', 'reconciliation_case', 16, '{"priority":"critical"}', 'Expired test',
        ?, ?, ?, 'pending_confirmation', DATE_SUB(NOW(), INTERVAL 1 MINUTE))
    `, [proposalExpiredId, testUser.id, testUser.name, testUser.role]);

    try {
      await confirmActionProposal(proposalExpiredId, testUser);
      console.error('❌ TEST 2 FAILED: Expired proposal should have been rejected!');
    } catch (err) {
      if (err.statusCode === 410 || err.message.includes('expired')) {
        console.log('✅ TEST 2 PASSED: Correctly rejected expired proposal with message:', err.message);
        passedTests++;
      } else {
        console.error('❌ TEST 2 FAILED with unexpected error:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Valid Execution on Active Pending Case
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Valid Action Execution on Active Case (Case #16)...');
    
    const proposalValidId = `ACT-TEST-VALID-${Date.now()}`;
    await pool.query(`
      INSERT INTO assistant_action_proposals (
        id, action_type, target_entity, target_id, requested_params, reason,
        created_by, created_by_name, created_by_role, status, expires_at
      ) VALUES (?, 'FLAG_CASE', 'reconciliation_case', 16, '{"priority":"critical","reason":"Transaction ID mismatch requires immediate investigation."}', 'Transaction ID mismatch requires immediate investigation.',
        ?, ?, ?, 'pending_confirmation', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    `, [proposalValidId, testUser.id, testUser.name, testUser.role]);

    const result = await confirmActionProposal(proposalValidId, testUser);
    console.log('✅ TEST 3 PASSED: Proposal successfully executed. Summary:', result.result_summary);
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 4: Verify 8-Field Immutable Audit Record
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 4: Verifying 8-Field Audit Record in MySQL `audit_logs`...');
    
    const [auditRows] = await pool.query(`
      SELECT * FROM audit_logs
      WHERE action = 'ASSISTANT_ACTION_FLAG_CASE' AND entity_id = 16
      ORDER BY id DESC LIMIT 1
    `);

    if (auditRows.length === 0) {
      console.error('❌ TEST 4 FAILED: No audit log found for Case #16!');
    } else {
      const audit = auditRows[0];
      const auditDetails = typeof audit.new_values === 'string' ? JSON.parse(audit.new_values) : audit.new_values;

      console.log('📋 AUDIT RECORD VERIFICATION:');
      console.log('   1. WHO?         :', auditDetails.who, `(Role: ${auditDetails.role})`);
      console.log('   2. WHAT?        :', auditDetails.what);
      console.log('   3. WHICH RECORD?:', auditDetails.which_record);
      console.log('   4. WHY?         :', auditDetails.why);
      console.log('   5. WHEN?        :', auditDetails.when);
      console.log('   6. SOURCE?      :', auditDetails.source);
      console.log('   7. PROPOSAL?    :', auditDetails.proposal_id);
      console.log('   8. RESULT?      :', auditDetails.result, `(${auditDetails.result_detail})`);

      if (
        auditDetails.who &&
        auditDetails.what === 'FLAG_CASE' &&
        auditDetails.which_record === 'reconciliation_case #16' &&
        auditDetails.why &&
        auditDetails.when &&
        auditDetails.source === 'AI Copilot Assistant' &&
        auditDetails.proposal_id === proposalValidId &&
        auditDetails.result === 'SUCCESS'
      ) {
        console.log('\n✅ TEST 4 PASSED: All 8 audit questions are explicitly answered in `audit_logs`!');
        passedTests++;
      } else {
        console.error('❌ TEST 4 FAILED: One or more audit fields are missing or mismatched!');
      }
    }

    console.log('\n=============================================================');
    console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('=============================================================');

  } catch (error) {
    console.error('Unexpected test error:', error);
  } finally {
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runSafetyAndAuditVerification();
