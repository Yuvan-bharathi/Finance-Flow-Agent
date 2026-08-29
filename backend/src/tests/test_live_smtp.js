import dns from 'dns';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch (e) {}

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const from = process.env.SMTP_FROM || `FinanceFlow AI <${user}>`;

console.log('--- Testing SMTP Configuration ---');
console.log('Host:', host);
console.log('Port:', port);
console.log('User:', user);
console.log('Pass Length:', pass ? pass.length : 0);

async function runTest() {
  // Test with port 465 SSL first
  console.log('\n[1/2] Attempting connection via Port 465 (SSL) with family 4...');
  const transporter465 = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    family: 4,
    tls: { rejectUnauthorized: false }
  });

  try {
    const verifyRes = await transporter465.verify();
    console.log('✅ Port 465 SMTP Verification Succeeded:', verifyRes);

    const testRecipient = 'mani30saravanan@gmail.com';
    console.log(`\nSending real test email to ${testRecipient}...`);

    const info = await transporter465.sendMail({
      from,
      to: testRecipient,
      subject: '✅ FinanceFlow AI — SMTP Live Delivery Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #4f46e5; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-top: 0;">FinanceFlow AI Live Delivery Confirmation</h2>
          <p>This is a live test email sent from FinanceFlow AI Operations via Gmail SMTP.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Sender:</strong> ${from}</p>
          <p><strong>Recipient:</strong> ${testRecipient}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">FinanceFlow AI &copy; 2026</p>
        </div>
      `
    });

    console.log('🎉 Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
  } catch (err) {
    console.error('❌ Port 465 Failed:', err);

    console.log('\n[2/2] Attempting fallback via Port 587 (TLS)...');
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      family: 4,
      tls: { rejectUnauthorized: false }
    });

    try {
      await transporter587.verify();
      console.log('✅ Port 587 SMTP Verification Succeeded');

      const info587 = await transporter587.sendMail({
        from,
        to: 'mani30saravanan@gmail.com',
        subject: '✅ FinanceFlow AI — SMTP Live Delivery Test (Port 587)',
        html: `<p>Test email via Port 587</p>`
      });

      console.log('🎉 Email sent successfully via Port 587!');
      console.log('Message ID:', info587.messageId);
    } catch (err587) {
      console.error('❌ Port 587 Failed:', err587);
    }
  }
}

runTest();
