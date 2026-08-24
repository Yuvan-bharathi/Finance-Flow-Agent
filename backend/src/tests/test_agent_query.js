import { runAssistantAgent } from '../agents/assistantAgent.js';

async function testGeneralAgentQuery() {
  console.log('Testing query from general Agents page: "Show me exactly what Agent 1 did, Payment Reconciliation Agent"');
  const result = await runAssistantAgent({
    message: 'Show me exactly what Agent 1 did, Payment Reconciliation Agent',
    conversationHistory: [],
    contextPayload: { page: 'agents' }, // No recordId provided (user is on general Agents page)
    user: { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' }
  });

  console.log('\n--- Copilot Response ---');
  console.log(result.answer);
  console.log('\nSources count:', result.sources?.length);
  console.log('Sources:', result.sources);
  process.exit(0);
}

testGeneralAgentQuery().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
