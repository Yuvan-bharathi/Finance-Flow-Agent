import dnsPromises from 'dns/promises';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true' || port === 465;

console.log('Testing Port 587 with Direct IPv4:');
console.log('Port:', port);
console.log('Secure:', secure);
console.log('User:', user);

async function testPort587() {
  const ips = await dnsPromises.resolve4('smtp.gmail.com');
  const targetIp = ips[0];
  console.log(`Resolved IP: ${targetIp}`);

  const transporter = nodemailer.createTransport({
    host: targetIp,
    port: 587,
    secure: false, // Port 587 uses STARTTLS
    requireTLS: true,
    auth: { user, pass },
    tls: {
      servername: 'smtp.gmail.com',
      rejectUnauthorized: false
    },
    connectionTimeout: 10000
  });

  try {
    const verified = await transporter.verify();
    console.log('✅ Port 587 Verification Succeeded:', verified);

    const testRecipient = 'yuvanbharathinaveen@gmail.com';
    const info = await transporter.sendMail({
      from: `"FinanceFlow AI Operations" <${user}>`,
      to: testRecipient,
      subject: '✅ FinanceFlow AI — Port 587 Live Test',
      html: `<h3>Delivery Success via Port 587 STARTTLS (${targetIp}:587)</h3>`
    });

    console.log('🎉 Email sent successfully via Port 587!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ Port 587 Failed:', err);
  }
}

testPort587();
