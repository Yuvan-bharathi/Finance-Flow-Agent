import { runPipelineWorkflow } from '../services/orchestrator.service.js';
import pool from '../config/db.js';

const testPipeline = async () => {
  console.log('🧪 Testing Orchestrator Eligibility Gate for Step 3...');

  try {
    const pipeline = await runPipelineWorkflow('RECONCILIATION_AND_RISK', {
      caseId: 1,
      companyId: 1
    }, 1);

    console.log(`\nPipeline #${pipeline.id} Status: ${pipeline.status}`);
    console.log('Pipeline Steps Executed:');
    
    for (const step of pipeline.steps) {
      console.log(`  Step #${step.step_index}: ${step.agent_name}`);
      console.log(`    Status: ${step.status}`);
      console.log(`    Duration: ${step.duration_ms}ms, Tokens: ${step.tokens_used}`);
      if (step.agent_name === 'AutomatedCollectionFollowUpAgent') {
        console.log(`    Output Reason: ${step.output_payload?.reason || step.output_payload?.message}`);
        if (step.status !== 'skipped') {
          throw new Error(`Expected Step 3 to be SKIPPED, got: ${step.status}`);
        }
      }
    }

    console.log('\n✅ PASS: Step 3 was successfully SKIPPED by orchestrator eligibility gate!');
  } catch (err) {
    console.error('❌ Pipeline Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

testPipeline();
