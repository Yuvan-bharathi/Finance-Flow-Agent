const testLiveRender = async () => {
  try {
    console.log('1. Logging into Render backend with admin@financeflow.com...');
    const loginRes = await fetch('https://finance-flow-agent.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@financeflow.com',
        password: 'Password123!'
      })
    });

    const loginData = await loginRes.json();
    console.log('Login Response status:', loginRes.status);
    const token = loginData.data?.accessToken || loginData.data?.token || loginData.token;

    if (!token) {
      console.log('Login failed payload:', loginData);
      return;
    }

    console.log('2. Requesting GET /api/loans/1 from Render...');
    const loanRes = await fetch('https://finance-flow-agent.onrender.com/api/loans/1', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const loanData = await loanRes.json();
    console.log(`Render status for /api/loans/1: ${loanRes.status}`);
    console.log('Loan Data:', loanData);
  } catch (err) {
    console.error('Error:', err);
  }
};

testLiveRender();
