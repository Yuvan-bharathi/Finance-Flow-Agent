import jwt from 'jsonwebtoken';

async function testCompanyInvestigation() {
  try {
    const token = jwt.sign(
      { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' },
      'financeflow_ai_super_secret_jwt_key_2026_production',
      { expiresIn: '1d' }
    );

    console.log('Testing query: "Tell me everything important about ABC Technologies Pvt Ltd."');
    const res = await fetch('http://localhost:5000/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        message: 'Tell me everything important about ABC Technologies Pvt Ltd.',
        conversationHistory: [],
        contextPayload: { page: 'companies' }
      })
    });

    const json = await res.json();
    console.log('\n--- Live Company Profile Response (HTTP ' + res.status + ') ---');
    console.log('Answer:\n', json.data?.answer);
    console.log('\nSources count:', json.data?.sources?.length);
    console.log('Sources:', json.data?.sources);
    console.log('Total tokens:', json.data?.total_tokens);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

testCompanyInvestigation();
