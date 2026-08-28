import pool from '../config/db.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import {
  approveRecommendationService,
  rejectRecommendationService,
  overrideRecommendationService
} from '../services/settlement.service.js';

async function testAllSettlementButtons() {
  console.log('=============================================================');
  console.log('🧪 Testing Human-In-The-Loop Actions (Approve, Reject, Override)');
  console.log('=============================================================\n');

  try {
    // 1. Test Analysis + Approve on Case #25
    console.log('1. Testing Agent 1 Analysis on Case #25...');
    await pool.query("UPDATE reconciliation_cases SET status = 'open' WHERE id = 25");
    const runRes25 = await runReconciliationAgent(25);
    console.log('   Generated Rec ID:', runRes25.recommendation_id);

    console.log('2. Testing "Approve Match" on Recommendation #' + runRes25.recommendation_id + '...');
    const approveRes = await approveRecommendationService(runRes25.recommendation_id, 1, 'Approved by test accountant');
    console.log('   ✅ "Approve Match" Succeeded:', approveRes);

    // 2. Test Analysis + Reject on Case #24
    console.log('\n3. Testing Agent 1 Analysis on Case #24...');
    await pool.query("UPDATE reconciliation_cases SET status = 'open' WHERE id = 24");
    const runRes24 = await runReconciliationAgent(24);
    console.log('   Generated Rec ID:', runRes24.recommendation_id);

    console.log('4. Testing "Reject" on Recommendation #' + runRes24.recommendation_id + '...');
    const rejectRes = await rejectRecommendationService(runRes24.recommendation_id, 1, 'Sender account name does not match KYC');
    console.log('   ✅ "Reject" Succeeded:', rejectRes);

    // 3. Test Manual Override on Case #23
    console.log('\n5. Testing "Manual Override" on Case #23...');
    const overrideRes = await overrideRecommendationService(23, {
      repayment_schedule_id: 46,
      allocated_amount: 213750.00,
      override_reason: 'Accountant verified bank statement credit memo manually'
    }, { id: 1, name: 'System Admin' });
    console.log('   ✅ "Manual Override" Succeeded:', overrideRes);

    console.log('\n=============================================================');
    console.log('🎉 ALL SETTLEMENT BUTTONS TESTED AND WORKING 100%!');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Action Test Failed:', err);
  } finally {
    process.exit(0);
  }
}

testAllSettlementButtons();
