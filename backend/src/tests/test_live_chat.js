async function testLiveChat() {
  try {
    console.log('1. Logging in as Accountant...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'accountant@financeflow.com',
        password: 'password123'
      })
    });

    const cookie = loginRes.headers.get('set-cookie');
    console.log('   Logged in successfully. Status:', loginRes.status);

    console.log('2. Sending Copilot query: "Show me exactly what Agent 1 did, Payment Reconciliation Agent"');
    const chatRes = await fetch('http://localhost:5000/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie || ''
      },
      body: JSON.stringify({
        message: 'Show me exactly what Agent 1 did, Payment Reconciliation Agent',
        conversationHistory: [],
        contextPayload: { page: 'reconciliations', recordType: 'reconciliation_case', recordId: 16 }
      })
    });

    const json = await chatRes.json();
    console.log('\n--- Live Copilot Response (HTTP ' + chatRes.status + ') ---');
    console.log('Answer:\n', json.data?.answer);
    console.log('\nSources count:', json.data?.sources?.length);
    console.log('Sources:', json.data?.sources);
    console.log('Total tokens:', json.data?.total_tokens);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

testLiveChat();
