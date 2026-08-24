import { runAssistantAgent } from '../agents/assistantAgent.js';

async function testDirect() {
  const user = { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' };
  console.log('Testing runAssistantAgent directly with Qwen...');
  const t0 = Date.now();
  const res = await runAssistantAgent({
    message: 'Tell me everything important about ABC Technologies Pvt Ltd.',
    conversationHistory: [],
    contextPayload: { page: 'companies' },
    user
  });
  console.log(`[${Date.now() - t0}ms] Answer:\n`, res.answer);
  console.log('\nSources:', res.sources.map(s => s.title));
  process.exit(0);
}

testDirect();
