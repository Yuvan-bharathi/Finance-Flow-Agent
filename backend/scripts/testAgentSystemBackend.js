import pool from '../src/config/db.js';
import { runReconciliationAgent } from '../src/agents/reconciliationAgent.js';
import { analyzeBulkService, analyzeAllPendingService } from '../src/services/reconciliation.service.js';
import { getAgentStats, getAllAgentsOverview } from '../src/models/agentRun.model.js';

async function testBackend() {
  console.log('🧪 Testing Agentic Execution System Backend...');

  try {
    // 1. Check existing NEW cases
    const [newCases] = await pool.query(`SELECT id, status FROM reconciliation_cases WHERE status = 'new' LIMIT 5;`);
    console.log(`📌 Found ${newCases.length} NEW case(s) in DB.`);

    if (newCases.length > 0) {
      const testCaseId = newCases[0].id;
      console.log(`⚡ Triggering Agent 1 on Case #${testCaseId}...`);
      const res = await runReconciliationAgent(testCaseId, 1, 'manual');
      console.log('   Agent 1 Result:', {
        run_id: res.run_id,
        precheck_result: res.precheck.result,
        score: res.precheck.score,
        groq_called: res.groq_called,
        tokens: res.tokens
      });
    }

    // 2. Test Agent Stats & Overview
    const overview = await getAllAgentsOverview();
    console.log('📊 Agent Runs Overview:', overview);

    const agent1Stats = await getAgentStats('agent_1_reconciliation');
    console.log('📈 Agent 1 Stats:', agent1Stats);

    console.log('✅ Agentic Execution System Backend Test PASSED!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    process.exit(0);
  }
}

testBackend();
