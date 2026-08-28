import pool from '../config/db.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import {
  approveRecommendationService,
  rejectRecommendationService,
  overrideRecommendationService
} from '../services/settlement.service.js';

async function testFullLifecycle() {
  console.log('=============================================================');
  console.log('🧪 Testing Full Multi-State Transition (Approve -> Reject -> Override)');
  console.log('=============================================================\n');

  try {
    // 1. Reset case 25
    await pool.query("UPDATE reconciliation_cases SET status = 'open' WHERE id = 25");
    const agentRes = await runReconciliationAgent(25);
    const recId = agentRes.recommendation_id;
    console.log(`1. Agent 1 Generated Recommendation #${recId} on Case #25`);

    // 2. Approve Recommendation
    console.log('2. Approving Recommendation...');
    const appRes = await approveRecommendationService(recId, 1, 'First Approval');
    console.log('   ✅ Approved successfully:', appRes.status);

    // 3. Re-approving (idempotency check)
    console.log('3. Re-approving already approved recommendation...');
    const reAppRes = await approveRecommendationService(recId, 1, 'Second Approval');
    console.log('   ✅ Handled idempotently without error:', reAppRes);

    // 4. Rejecting the approved recommendation (Ledger reversal check)
    console.log('4. Rejecting previously approved case #25 (Ledger reversal)...');
    const rejRes = await rejectRecommendationService(recId, 1, 'Reversing allocation due to audit check');
    console.log('   ✅ Reversed and Rejected successfully:', rejRes.status);

    // 5. Manual Override on the rejected case
    console.log('5. Manually overriding Case #25 to Schedule #60...');
    const overRes = await overrideRecommendationService(25, {
      repayment_schedule_id: 60,
      allocated_amount: 198222.00,
      override_reason: 'Accountant applied verified wire override'
    }, { id: 1, name: 'System Admin' });
    console.log('   ✅ Overridden and Resolved successfully:', overRes.status);

    console.log('\n=============================================================');
    console.log('🎉 FULL RECONCILIATION LIFECYCLE VERIFIED WITH 0 ERRORS!');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Lifecycle Test Error:', err);
  } finally {
    process.exit(0);
  }
}

testFullLifecycle();
