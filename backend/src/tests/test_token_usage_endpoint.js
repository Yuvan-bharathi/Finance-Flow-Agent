import jwt from 'jsonwebtoken';

async function testTokenUsageEndpoint() {
  try {
    const token = jwt.sign(
      { id: 1, name: 'Platform Admin', email: 'admin@financeflow.com', role: 'admin' },
      'financeflow_ai_super_secret_jwt_key_2026_production',
      { expiresIn: '1d' }
    );

    console.log('Testing GET /api/settings/token-usage...');
    const res = await fetch('http://localhost:5000/api/settings/token-usage', {
      headers: {
        'Cookie': `token=${token}`
      }
    });

    const json = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Data:', JSON.stringify(json.data, null, 2));

    console.log('\nTesting PUT /api/settings/active-model with qwen/qwen3.6-27b...');
    const putRes = await fetch('http://localhost:5000/api/settings/active-model', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({ model: 'qwen/qwen3.6-27b' })
    });

    const putJson = await putRes.json();
    console.log('Switch Model HTTP Status:', putRes.status);
    console.log('Switch Model Response:', putJson);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

testTokenUsageEndpoint();
