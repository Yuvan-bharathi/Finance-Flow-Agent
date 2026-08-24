import jwt from 'jsonwebtoken';

async function testRoleQuery() {
  try {
    const token = jwt.sign(
      { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' },
      'financeflow_ai_super_secret_jwt_key_2026_production',
      { expiresIn: '1d' }
    );

    console.log('Sending query: "Role-aware assistance, Give the different capabilities for Accountant, Manager, Admin, Super Admin and Owner."');
    const res = await fetch('http://localhost:5000/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        message: 'Role-aware assistance, Give the different capabilities for Accountant, Manager, Admin, Super Admin and Owner.',
        conversationHistory: [],
        contextPayload: { page: 'reconciliations' }
      })
    });

    const json = await res.json();
    console.log('\n--- Live Response (HTTP ' + res.status + ') ---');
    console.log('Answer:\n', json.data?.answer);
    console.log('\nSources count:', json.data?.sources?.length);
    console.log('Total tokens:', json.data?.total_tokens);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

testRoleQuery();
