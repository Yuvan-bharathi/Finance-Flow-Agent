import { runAssistantAgent } from '../agents/assistantAgent.js';

async function runVerification() {
  console.log('--- Test 1: General Agent 1 Query ---');
  const res1 = await runAssistantAgent({
    message: 'What does Agent 1 do in FinanceFlow?',
    conversationHistory: [],
    contextPayload: { page: 'agents' },
    user: { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' }
  });
  console.log('Answer 1:\n', res1.answer);
  console.log('Sources 1 count:', res1.sources?.length);

  console.log('\n--- Test 2: Specific Case Investigation ---');
  const res2 = await runAssistantAgent({
    message: 'Investigate Case #16 and tell me what the AI recommendation is',
    conversationHistory: [],
    contextPayload: { page: 'reconciliations', recordType: 'reconciliation_case', recordId: 16 },
    user: { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' }
  });
  console.log('Answer 2:\n', res2.answer);
  console.log('Sources 2 count:', res2.sources?.length);

  process.exit(0);
}

runVerification().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
