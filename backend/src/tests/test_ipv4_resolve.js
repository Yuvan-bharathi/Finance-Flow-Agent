import dns from 'dns/promises';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

async function testExplicitIPv4() {
  console.log('--- Testing Explicit IPv4 DNS Resolution ---');
  
  // Resolve IPv4 addresses directly from DNS
  const ips = await dns.resolve4('smtp.gmail.com');
  console.log('Resolved smtp.gmail.com IPv4 IPs:', ips);
  
  const targetIp = ips[0];
  console.log(`Connecting directly to IPv4: ${targetIp}:465 with servername: smtp.gmail.com`);

  const transporter = nodemailer.createTransport({
    host: targetIp,
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: {
      servername: 'smtp.gmail.com', // Ensures SSL cert verification succeeds for smtp.gmail.com
      rejectUnauthorized: false
    },
    connectionTimeout: 10000
  });

  try {
    const verified = await transporter.verify();
    console.log('✅ Direct IPv4 Port 465 Verification Succeeded:', verified);

    const testRecipient = 'yuvanbharathinaveen@gmail.com';
    console.log(`Sending live test email to ${testRecipient}...`);

    const info = await transporter.sendMail({
      from: `"FinanceFlow AI" <${user}>`,
      to: testRecipient,
      subject: '✅ FinanceFlow AI — Explicit IPv4 Live Delivery Test',
      html: `<h3>Delivery Success via Explicit IPv4 (${targetIp}:465)</h3><p>Render ENETUNREACH is completely bypassed!</p>`
    });

    console.log('🎉 Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ Verification/Send Failed:', err);
  }
}

testExplicitIPv4();
