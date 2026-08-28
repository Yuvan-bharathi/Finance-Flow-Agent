import pool from '../config/db.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';

async function testAgent1() {
  try {
    await pool.query("UPDATE reconciliation_cases SET status = 'open' WHERE status = 'ai_processing'");
    console.log('Running Agent 1 on Case #25...');
    const result = await runReconciliationAgent(25);
    console.log('\n=============================================================');
    console.log('✅ Agent 1 Execution Succeeded!');
    console.log('Recommendation ID:', result.recommendation_id);
    console.log('Confidence Score:', result.recommendation.confidence_score + '%');
    console.log('Reasoning:', result.recommendation.reasoning);
    console.log('Tokens Used:', result.tokens);
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Agent 1 Test Error:', err);
  }
  process.exit(0);
}

testAgent1();
