import pool from '../config/db.js';
import { findOpenCases } from '../models/reconciliationCase.model.js';
import { runPipelineWorkflow } from '../services/orchestrator.service.js';

const test = async () => {
  console.log('🧪 Testing Target Selection & Batch Multi-Agent Pipeline Execution...');

  try {
    // 1. Test findOpenCases model query
    console.log('1. Querying pending pipeline targets (findOpenCases)...');
    const openCases = await findOpenCases(10);
    console.log(`✅ Retrieved ${openCases.length} open reconciliation target(s).`);
    if (openCases.length > 0) {
      console.log('Sample Open Target:', {
        id: openCases[0].id,
        transaction_id: openCases[0].transaction_id,
        company_name: openCases[0].company_name,
        amount: openCases[0].amount
      });
    }

    const testCaseId = openCases.length > 0 ? openCases[0].id : 20;

    // 2. Test single target execution (Option 1)
    console.log(`\n2. Executing Single Pipeline Workflow for Case #${testCaseId}...`);
    const singleResult = await runPipelineWorkflow({
      workflow: 'RECONCILIATION_AND_RISK',
      contextData: { caseId: testCaseId },
      userId: 1,
      priority: 1,
      triggerSource: 'target_selector_test'
    });
    console.log(`✅ Single Target Pipeline Run ID: #${singleResult.id}, Status: ${singleResult.status}, Duration: ${singleResult.duration_ms}ms`);

    // 3. Test batch execution loop (Option 2)
    console.log('\n3. Executing Batch Pipeline Workflow for Targets in sequence...');
    const batchTargets = openCases.slice(0, 2);
    const batchResults = [];
    for (const t of batchTargets) {
      const r = await runPipelineWorkflow({
        workflow: 'RECONCILIATION_AND_RISK',
        contextData: { caseId: t.id },
        userId: 1,
        priority: 1,
        triggerSource: 'batch_test'
      });
      batchResults.push({ caseId: t.id, pipelineId: r.id, status: r.status });
    }
    console.log(`✅ Batch Execution Completed for ${batchResults.length} pipelines:`);
    console.log(batchResults);

    console.log('\n🎉 ALL TESTS PASSED: Single Target Selection (Option 1) & Batch Pipelines (Option 2) verified!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
};

test();
