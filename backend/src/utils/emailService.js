import nodemailer from 'nodemailer';
import dns from 'dns';
import { config } from '../config/env.js';

// Force Node.js DNS resolver to prioritize IPv4 on Cloud/Render containers
try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch (_) {}

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
  const user = (process.env.SMTP_USER || config.smtp.user || '').trim();
  const pass = (process.env.SMTP_PASS || config.smtp.pass || '').replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || config.smtp.host || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || config.smtp.port || '465', 10);
  const secure = port === 465;

  if (user && pass && user !== '' && pass !== '') {
    return nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: port || 465,
      secure: secure,
      auth: {
        user,
        pass,
      },
      family: 4, // CRITICAL: Force IPv4 to prevent Render Linux IPv6 timeout
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
    });
  }
  return null;
};

// Helper: Sends an email attempting Port 465 SSL first, then Port 587 TLS fallback
const sendWithTransporterFallback = async (mailOptions) => {
  const user = (process.env.SMTP_USER || config.smtp.user || '').trim();
  const pass = (process.env.SMTP_PASS || config.smtp.pass || '').replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || config.smtp.host || 'smtp.gmail.com').trim();

  if (!user || !pass) {
    return { success: false, notConfigured: true };
  }

  // Attempt 1: Port 465 (Direct SSL) with explicit IPv4
  try {
    const transporter465 = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass },
      family: 4,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const info = await transporter465.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Delivered via Port 465 SSL to ${mailOptions.to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, port: 465, response: info.response };
  } catch (err465) {
    console.warn(`[EmailService] ⚠️ Port 465 SSL failed (${err465.message}), attempting Port 587 TLS fallback...`);

    // Attempt 2: Port 587 (STARTTLS) with explicit IPv4
    try {
      const transporter587 = nodemailer.createTransport({
        host,
        port: 587,
        secure: false,
        auth: { user, pass },
        family: 4,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const info587 = await transporter587.sendMail(mailOptions);
      console.log(`[EmailService] ✅ Delivered via Port 587 TLS to ${mailOptions.to} (Message ID: ${info587.messageId})`);
      return { success: true, messageId: info587.messageId, port: 587, response: info587.response };
    } catch (err587) {
      console.error(`[EmailService Error] Both Port 465 & 587 failed to send to ${mailOptions.to}:`, err587.message);
      return {
        success: false,
        error: `Port 465 error: ${err465.message}; Port 587 error: ${err587.message}`,
        mode: 'smtp_failed'
      };
    }
  }
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: #111827; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .header h1 span { color: #818cf8; }
        .content { padding: 32px 28px; }
        .content h2 { font-size: 18px; color: #111827; margin-top: 0; margin-bottom: 12px; }
        .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 8px 0; }
        .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin: 24px 0 16px 0; }
        .footer { background: #f9fafb; padding: 16px 28px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FinanceFlow <span>AI</span></h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">Agentic Financial Operations &amp; Repayment Platform</p>
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
            <a href="${invitationUrl}" class="btn" target="_blank">Set Password &amp; Activate Account</a>
          </div>
          
          <p style="font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 16px;">
            Link not working? Paste this URL into your browser:<br>
            <a href="${invitationUrl}" style="color: #4f46e5;">${invitationUrl}</a>
          </p>
        </div>
        <div class="footer">
          This automated security notification was sent by FinanceFlow AI Platform. &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderFrom = process.env.SMTP_FROM || `FinanceFlow AI <${process.env.SMTP_USER || 'yuvanbharathin@gmail.com'}>`;
  const result = await sendWithTransporterFallback({
    from: senderFrom,
    to: email,
    subject,
    html: htmlContent,
  });

  if (result.notConfigured) {
    console.log('📧 [MOCK INVITATION EMAIL — SMTP CREDENTIALS NOT CONFIGURED]');
    return { success: true, mode: 'mock_console' };
  }

  return result;
};

/**
 * Sends an Automated Financial Escalation & Collection Follow-Up Email
 * 
 * @param {Object} params
 * @param {string} params.recipientEmail - Recipient email (borrower finance team)
 * @param {string} params.fromEmail - Sender address
 * @param {string} params.companyName - Delinquent company name
 * @param {string} params.subject - Email subject line
 * @param {string} params.body - Email message content / notice
 * @param {string} params.priority - Urgency priority ('low', 'medium', 'high', 'critical')
 * @param {number|string} params.alertId - Alert ID
 */
export const sendEscalationNoticeEmail = async ({
  recipientEmail,
  fromEmail,
  companyName,
  subject,
  body,
  priority = 'HIGH',
  alertId
}) => {
  const priorityColor = priority.toLowerCase() === 'critical' ? '#dc2626' : priority.toLowerCase() === 'high' ? '#ea580c' : '#f59e0b';
  const targetRecipient = recipientEmail || 'finance@abctech.com';
  const senderFrom = `"FinanceFlow AI Operations" <${fromEmail || process.env.SMTP_USER || 'yuvanbharathin@gmail.com'}>`;

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
            If you have already processed this payment, please disregard this notice or reply directly to this email (<a href="mailto:${fromEmail || 'yuvanbharathin@gmail.com'}">${fromEmail || 'yuvanbharathin@gmail.com'}</a>).
          </p>
        </div>
        <div class="footer">
          This is an automated notification managed by FinanceFlow AI Operational Agents. &copy; ${new Date().getFullYear()} FinanceFlow AI.
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await sendWithTransporterFallback({
    from: senderFrom,
    to: targetRecipient,
    subject,
    html: htmlContent,
  });

  if (result.notConfigured) {
    console.log('📧 [MOCK ESCALATION MAIL DISPATCH — REAL SMTP CREDENTIALS NOT SET]');
    return {
      success: true,
      mode: 'mock_console',
      from: fromEmail,
      to: targetRecipient,
      notice: 'Email logged to server console.'
    };
  }

  return {
    ...result,
    from: fromEmail,
    to: targetRecipient
  };
};

/**
 * Diagnostic utility: tests SMTP connectivity and returns connection details
 */
export const testSmtpConnection = async (targetEmail = 'mani30saravanan@gmail.com') => {
  const user = (process.env.SMTP_USER || config.smtp.user || '').trim();
  
  return await sendWithTransporterFallback({
    from: `"FinanceFlow Diagnostics" <${user}>`,
    to: targetEmail,
    subject: '🧪 FinanceFlow AI — SMTP Production Diagnostic Ping',
    html: `<p>Production SMTP ping from Render container to ${targetEmail} at ${new Date().toISOString()}</p>`
  });
};
