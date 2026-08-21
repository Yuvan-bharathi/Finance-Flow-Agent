import jwt from 'jsonwebtoken';

async function testLiveAgent1() {
  try {
    const token = jwt.sign(
      { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' },
      'financeflow_ai_super_secret_jwt_key_2026_production',
      { expiresIn: '1d' }
    );

    console.log('Sending live query: "Show me exactly what Agent 1 did, Payment Reconciliation Agent"...');
    const res = await fetch('http://localhost:5000/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        message: 'Show me exactly what Agent 1 did, Payment Reconciliation Agent',
        conversationHistory: [],
        contextPayload: { page: 'agents' }
      })
    });

    const json = await res.json();
    console.log('\n--- Live Copilot Response (HTTP ' + res.status + ') ---');
    console.log('Answer:\n', json.data?.answer);
    console.log('\nSources count:', json.data?.sources?.length);
    console.log('Sources:', json.data?.sources);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

testLiveAgent1();
