import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const testGmailService = async () => {
  const user = process.env.SMTP_USER || config.smtp.user;
  const pass = process.env.SMTP_PASS || config.smtp.pass;

  console.log('Testing Gmail Service Transporter with user:', user);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.replace(/\s+/g, ''),
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"FinanceFlow AI Operations" <${user}>`,
      to: 'aaronbca123@gmail.com',
      subject: '[FINAL DEMAND] Payment Notice for ABC Technologies Pvt Ltd',
      text: 'Dear Rajesh Kumar,\n\nOur records indicate an outstanding balance of ₹2,60,000 for ABC Technologies Pvt Ltd. Please arrange for settlement at your earliest convenience.\n\nBest regards,\nFinanceFlow AI Operations'
    });
    console.log('✅ Sent successfully via service: "gmail"!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
};

testGmailService();
