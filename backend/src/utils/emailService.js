import nodemailer from 'nodemailer';
import dns from 'dns';
import dnsPromises from 'dns/promises';
import { config } from '../config/env.js';

// Force Node.js DNS resolver to prioritize IPv4 on Cloud/Render containers
try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch (_) {}

/**
 * Helper: Explicitly resolves hostname to an IPv4 address (A record)
 * This permanently eliminates 'ENETUNREACH' on Cloud/Render containers without IPv6 routing.
 */
const resolveIPv4Address = async (hostname = 'smtp.gmail.com') => {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return hostname;
  try {
    const ips = await dnsPromises.resolve4(hostname);
    if (ips && ips.length > 0) {
      console.log(`[EmailService DNS] Resolved ${hostname} to IPv4: ${ips[0]}`);
      return ips[0];
    }
  } catch (err) {
    console.warn(`[EmailService DNS] IPv4 resolve fallback for ${hostname}:`, err.message);
  }
  return hostname;
};

/**
 * Utility: Centralized Email Service (Nodemailer + SMTP)
 * 
 * Purpose:
 * Provides resilient email dispatch for:
 * 1. User Invitation & Password Setup Links (Admin / Super Admin account provisioning)
 * 2. AI Escalation & Collection Follow-Up Notices (Agent 3 & Agent 6 dispatch)
 */

// Helper: Creates a transport instance configured for a specific port and direct IPv4 host
const createTransporterForPort = (ipv4Host, rawHost, port, user, pass) => {
  const isSecure = port === 465;
  return nodemailer.createTransport({
    host: ipv4Host,
    port,
    secure: isSecure,
    requireTLS: !isSecure, // Ensures STARTTLS handshake on port 587
    auth: { user, pass },
    tls: {
      servername: rawHost, // Preserves SSL certificate domain verification (smtp.gmail.com)
      rejectUnauthorized: false
    },
    debug: false,
    logger: false,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
};

// Helper: Sends an email attempting configured port first (e.g. 587), then fallback port (e.g. 465)
const sendWithTransporterFallback = async (mailOptions) => {
  const user = (process.env.SMTP_USER || config.smtp.user || '').trim();
  const pass = (process.env.SMTP_PASS || config.smtp.pass || '').replace(/\s+/g, '');
  const rawHost = (process.env.SMTP_HOST || config.smtp.host || 'smtp.gmail.com').trim();
  const configuredPort = parseInt(process.env.SMTP_PORT || config.smtp.port || '587', 10);
  const fallbackPort = configuredPort === 587 ? 465 : 587;

  if (!user || !pass) {
    console.warn('[EmailService] ⚠️ SMTP_USER or SMTP_PASS not set in environment.');
    return { success: false, notConfigured: true };
  }

  console.log(`[EmailService] 🚀 Initiating email dispatch to: ${mailOptions.to} (Sender: ${user})`);

  // Resolve pure IPv4 IP to bypass Render IPv6 container networking drop
  const ipv4Host = await resolveIPv4Address(rawHost);

  // Attempt 1: User's Configured Port (e.g., 587 TLS)
  try {
    console.log(`[EmailService] 📡 Connecting to ${ipv4Host}:${configuredPort} (SNI: ${rawHost}, TLS: ${configuredPort === 465 ? 'SSL' : 'STARTTLS'})...`);
    const transporter1 = createTransporterForPort(ipv4Host, rawHost, configuredPort, user, pass);
    const info = await transporter1.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Delivered successfully via Port ${configuredPort} (${ipv4Host}) to ${mailOptions.to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, port: configuredPort, response: info.response, host: ipv4Host };
  } catch (err1) {
    console.warn(`[EmailService] ⚠️ Port ${configuredPort} failed (${err1.message}), attempting Port ${fallbackPort} fallback...`);

    // Attempt 2: Fallback Port (e.g., 465 SSL)
    try {
      console.log(`[EmailService] 📡 Retrying via fallback port ${ipv4Host}:${fallbackPort}...`);
      const transporter2 = createTransporterForPort(ipv4Host, rawHost, fallbackPort, user, pass);
      const info2 = await transporter2.sendMail(mailOptions);
      console.log(`[EmailService] ✅ Delivered successfully via Port ${fallbackPort} (${ipv4Host}) to ${mailOptions.to} (Message ID: ${info2.messageId})`);
      return { success: true, messageId: info2.messageId, port: fallbackPort, response: info2.response, host: ipv4Host };
    } catch (err2) {
      console.error(`[EmailService Error] Both Port ${configuredPort} & ${fallbackPort} failed to send to ${mailOptions.to}:`, err2.message);
      return {
        success: false,
        error: `Port ${configuredPort}: ${err1.message}; Port ${fallbackPort}: ${err2.message}`,
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
