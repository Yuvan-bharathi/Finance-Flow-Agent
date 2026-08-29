import https from 'https';

const checkRender = () => {
  https.get('https://finance-flow-agent.onrender.com/api/loans/1', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`HTTP Status from Render: ${res.statusCode}`);
      console.log('Response body:', data.slice(0, 300));
    });
  }).on('error', err => {
    console.error('Error contacting Render:', err.message);
  });
};

checkRender();
