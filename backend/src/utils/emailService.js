import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

/**
 * Utility: Centralized Email Service (Nodemailer + SMTP)
 * 
 * Purpose:
 * Provides resilient email dispatch for:
 * 1. User Invitation & Password Setup Links (Admin / Super Admin account provisioning)
 * 2. AI Escalation & Collection Follow-Up Notices (Agent 3 & Agent 6 dispatch)
 * 
 * Fail-Safe Design:
 * If SMTP credentials (SMTP_USER / SMTP_PASS) are not provided in environment variables,
 * the service logs formatted email previews to console without throwing errors or halting operations.
 */

// Dynamic Nodemailer Transporter Getter (Optimized for Gmail & Cloud Hosting)
const getTransporter = () => {
  const user = process.env.SMTP_USER || config.smtp.user;
  const pass = process.env.SMTP_PASS || config.smtp.pass;
  const host = process.env.SMTP_HOST || config.smtp.host || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || config.smtp.port || '465', 10);
  const secure = port === 465 || (process.env.SMTP_SECURE || config.smtp.secure) === true || (process.env.SMTP_SECURE === 'true');

  if (user && pass && user.trim() !== '' && pass.trim() !== '') {
    // If using Gmail, use nodemailer's optimized 'gmail' preset to prevent Render/Cloud STARTTLS port 587 timeouts
    if (host.includes('gmail') || user.includes('@gmail.com')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: user.trim(),
          pass: pass.replace(/\s+/g, ''),
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: user.trim(),
        pass: pass.replace(/\s+/g, ''),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return null;
};

/**
 * Sends a User Invitation & Password Setup Email
 * 
 * @param {Object} params
 * @param {string} params.email - Recipient user email
 * @param {string} params.name - Recipient user full name
 * @param {string} params.roleName - Assigned role (e.g., 'Senior Accountant', 'Manager')
 * @param {string} params.invitationUrl - Front-end URL to set initial password
 */
export const sendUserInvitationEmail = async ({ email, name, roleName, invitationUrl }) => {
  const subject = `Welcome to FinanceFlow AI — Set Up Your ${roleName} Account`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0b0f17 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .header span { color: #818cf8; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-top: 8px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; margin: 24px 0; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); }
        .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .link-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 12px; word-break: break-all; color: #475569; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FinanceFlow <span>AI</span></h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">Agentic Financial Operations & Repayment Platform</p>
        </div>
        <div class="content">
          <h2>Welcome, ${name}! 👋</h2>
          <p>An administrator has provisioned a new user account for you on the FinanceFlow AI platform.</p>
          
          <div style="margin: 16px 0;">
            <strong>Assigned Role:</strong><br>
            <span class="badge">${roleName}</span>
          </div>

          <p>To activate your account and establish your secure credentials, please click the link below to set your password:</p>
          
          <div style="text-align: center;">
            <a href="${invitationUrl}" class="btn" target="_blank">Set Password & Activate Account</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">This link is valid for <strong>24 hours</strong>. If you did not request this account, please notify your platform administrator.</p>

          <div style="margin-top: 24px;">
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Or copy and paste this link into your browser:</p>
            <div class="link-box">${invitationUrl}</div>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} FinanceFlow AI Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[EmailService] ✅ Sent account invitation email to ${email} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.error(`[EmailService Error] Failed to send email to ${email} via SMTP:`, err.message);
      return { success: false, error: err.message, mode: 'smtp_failed' };
    }
  } else {
    // Console Fallback when SMTP credentials are not configured
    console.log('\n=============================================================');
    console.log('📧 [MOCK EMAIL DISPATCH — SMTP CREDENTIALS NOT SET IN .ENV]');
    console.log(`TO: ${name} <${email}>`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`INVITATION URL: ${invitationUrl}`);
    console.log('=============================================================\n');
    return { success: true, mode: 'mock_console', invitationUrl };
  }
};

/**
 * Sends an AI Escalation / Collection Notice Email to Borrower Company
 * 
 * @param {Object} params
 * @param {string} params.recipientEmail - Borrower contact email
 * @param {string} params.companyName - Borrower company name
 * @param {string} params.subject - Email subject
 * @param {string} params.body - AI-drafted email body content
 * @param {string} params.priority - Urgency priority ('critical', 'high', 'medium', 'low')
 * @param {number|string} [params.alertId] - Optional escalation alert ID reference
 */
export const sendEscalationNoticeEmail = async ({
  recipientEmail,
  fromEmail = 'yuvanbharathin@gmail.com',
  companyName = 'Borrower Company',
  subject,
  body,
  priority = 'high',
  alertId
}) => {
  const priorityColor = priority === 'critical' ? '#dc2626' : priority === 'high' ? '#ea580c' : '#f59e0b';
  const targetRecipient = recipientEmail || 'finance@abctech.com';
  const senderFrom = `"FinanceFlow AI Operations" <${fromEmail || 'yuvanbharathin@gmail.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 24px; text-align: left; color: #ffffff; display: flex; align-items: center; justify-content: space-between; }
        .priority-banner { background: ${priorityColor}; color: #ffffff; padding: 8px 16px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
        .content { padding: 32px 24px; }
        .message-box { background: #f8fafc; border-left: 4px solid ${priorityColor}; padding: 18px; border-radius: 0 10px 10px 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="priority-banner">
          ${priority.toUpperCase()} URGENCY — OFFICIAL FINANCIAL REMINDER
        </div>
        <div class="header">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">FinanceFlow <span style="color:#818cf8;">AI</span></h2>
          <span style="font-size: 12px; color: #94a3b8;">Ref Alert #${alertId || 'N/A'}</span>
        </div>
        <div class="content">
          <h3>Attention: ${companyName}</h3>
          <p style="font-size: 14px; color: #475569;">Please review the official repayment notice below regarding your outstanding facility balance:</p>
          
          <div class="message-box">${body}</div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            If you have already processed this payment, please disregard this notice or reply directly to this email (<a href="mailto:${fromEmail}">${fromEmail}</a>).
          </p>
        </div>
        <div class="footer">
          This is an automated notification managed by FinanceFlow AI Operational Agents. &copy; ${new Date().getFullYear()} FinanceFlow AI.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: senderFrom,
        to: targetRecipient,
        subject,
        html: htmlContent,
      });
      console.log(`[EmailService] ✅ Sent escalation notice email from ${fromEmail} to ${targetRecipient} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, mode: 'smtp', from: fromEmail, to: targetRecipient };
    } catch (err) {
      console.error(`[EmailService Error] Failed to send escalation notice to ${targetRecipient} via SMTP:`, err.message);
      return { success: false, error: err.message, mode: 'smtp_failed', from: fromEmail, to: targetRecipient };
    }
  } else {
    // Console Fallback when SMTP credentials are not configured in environment variables
    console.log('\n=============================================================');
    console.log('📧 [MOCK ESCALATION MAIL DISPATCH — REAL SMTP CREDENTIALS NOT SET]');
    console.log(`FROM: ${senderFrom}`);
    console.log(`TO: ${companyName} <${targetRecipient}>`);
    console.log(`PRIORITY: ${priority.toUpperCase()}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${body}`);
    console.log('=============================================================\n');
    return {
      success: true,
      mode: 'mock_console',
      from: fromEmail,
      to: targetRecipient,
      notice: 'Email logged to server console. To deliver real emails, set SMTP_USER and SMTP_PASS in your Render Environment Variables.'
    };
  }
};
