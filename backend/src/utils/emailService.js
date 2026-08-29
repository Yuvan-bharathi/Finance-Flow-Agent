import nodemailer from 'nodemailer';
import { createRequire } from 'module';
import { config } from '../config/env.js';

// ─────────────────────────────────────────────────────────────────────────────
// IPv4-Force: Use callback-style dns.resolve4 (available on ALL Node versions)
// This is the ONLY reliable way to bypass IPv6 on Render's Linux containers.
// ─────────────────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const dnsModule = require('dns');

// Also try setting ipv4first if available (Node 17+)
try {
  if (typeof dnsModule.setDefaultResultOrder === 'function') {
    dnsModule.setDefaultResultOrder('ipv4first');
    console.log('[EmailService] ✅ dns.setDefaultResultOrder set to ipv4first');
  }
} catch (_) {}

/**
 * Helper: Resolves a hostname to its first IPv4 address using callback-style DNS (Node 12+).
 * Falls back to the original hostname if resolution fails.
 */
const resolveIPv4Address = (hostname) => {
  return new Promise((resolve) => {
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return resolve(hostname);
    }
    dnsModule.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        console.warn(`[EmailService DNS] Could not resolve IPv4 for ${hostname}: ${err?.message}. Using hostname.`);
        return resolve(hostname);
      }
      const ip = addresses[0];
      console.log(`[EmailService DNS] ✅ Resolved ${hostname} → IPv4: ${ip}`);
      resolve(ip);
    });
  });
};

/**
 * Helper: Sends email via HTTPS REST API (Port 443)
 * Port 443 is 100% open on Render, Vercel, AWS, and GCP free tiers (immune to SMTP port blocks).
 */
const sendWithHttpsApiFallback = async ({ from, to, subject, html }) => {
  const smtpPass = (process.env.SMTP_PASS || config.smtp.pass || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || config.smtp.resendApiKey || (smtpPass.startsWith('re_') ? smtpPass : '')).trim();
  const brevoKey = (process.env.BREVO_API_KEY || config.smtp.brevoApiKey || (smtpPass.startsWith('xkeysib-') ? smtpPass : '')).trim();

  // 1. Resend HTTPS API (Port 443)
  if (resendKey) {
    try {
      // Resend rejects public @gmail.com senders with 403. Use RESEND_FROM_EMAIL if set, otherwise fallback to onboarding@resend.dev
      let defaultResendFrom = process.env.RESEND_FROM_EMAIL;
      if (!defaultResendFrom) {
        const candidate = from || process.env.SMTP_FROM || '';
        if (candidate && !candidate.includes('@gmail.com')) {
          defaultResendFrom = candidate;
        } else {
          defaultResendFrom = 'FinanceFlow AI <onboarding@resend.dev>';
        }
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: defaultResendFrom,
          to: [to],
          subject,
          html
        })
      });
      const data = await res.json();
      console.log(`[EmailService HTTPS] Resend API Response Status: ${res.status}`, data);

      if (res.ok && data.id) {
        console.log(`[EmailService HTTPS] ✅ Delivered via Resend API Port 443 (Message ID: ${data.id})`);
        return { success: true, messageId: data.id, mode: 'resend_https_api', status: res.status };
      } else {
        const errorMsg = data?.message || data?.error || `HTTP ${res.status}`;
        console.warn(`[EmailService HTTPS] ⚠️ Resend API Error (${res.status}):`, errorMsg);
        return {
          success: false,
          status: res.status,
          error: `Resend API Error (${res.status}): ${errorMsg}`,
          mode: 'resend_https_api_failed',
          details: data
        };
      }
    } catch (err) {
      console.warn('[EmailService HTTPS] Resend fetch exception:', err.message);
      return { success: false, error: `Resend Fetch Exception: ${err.message}`, mode: 'resend_https_api_error' };
    }
  }

  // 2. Brevo HTTPS API (Port 443)
  if (brevoKey) {
    try {
      console.log(`[EmailService HTTPS] 🚀 Attempting Brevo API dispatch to ${to}...`);
      const senderEmail = (process.env.SMTP_USER || 'yuvanbharathin@gmail.com').trim();
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: 'FinanceFlow AI Operations' },
          to: [{ email: to }],
          subject,
          htmlContent: html
        })
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[EmailService HTTPS] ✅ Delivered via Brevo API (Message ID: ${data.messageId})`);
        return { success: true, messageId: data.messageId, mode: 'brevo_https_api', status: res.status };
      } else {
        console.warn('[EmailService HTTPS] Brevo API response error:', data);
        return {
          success: false,
          status: res.status,
          error: `Brevo API Error (${res.status}): ${data?.message || 'Unknown Brevo Error'}`,
          mode: 'brevo_https_api_failed',
          details: data
        };
      }
    } catch (err) {
      console.warn('[EmailService HTTPS] Brevo fetch exception:', err.message);
      return { success: false, error: `Brevo Fetch Exception: ${err.message}`, mode: 'brevo_https_api_error' };
    }
  }

  return null;
};

/**
 * Helper: Creates a Nodemailer transport that connects via direct IPv4 address
 * with proper SNI (servername) so Gmail's TLS cert is validated correctly.
 */
const createTransporterForPort = (ipv4Host, rawHost, port, user, pass) => {
  const isSecure = port === 465;
  return nodemailer.createTransport({
    host: ipv4Host,          // Direct IPv4 — bypasses OS DNS lookup entirely
    port,
    secure: isSecure,        // true for 465 (SSL), false for 587 (STARTTLS)
    requireTLS: !isSecure,   // Force STARTTLS upgrade on port 587
    auth: { user, pass },
    tls: {
      servername: rawHost,   // Use smtp.gmail.com as SNI for cert validation
      rejectUnauthorized: true // Production SSL Certificate Validation
    },
    connectionTimeout: 6000, // 6s fast fail on blocked cloud ports
    greetingTimeout: 6000,
    socketTimeout: 8000,
  });
};

/**
 * Core dispatch helper — tries HTTPS API first, then SMTP ports (587 / 465)
 */
const sendWithTransporterFallback = async (mailOptions) => {
  // 1. Check for HTTPS API Keys (Port 443 - immune to Render outbound port blocking)
  const httpsResult = await sendWithHttpsApiFallback(mailOptions);
  if (httpsResult && httpsResult.success) {
    return httpsResult;
  }

  const user = (process.env.SMTP_USER || config.smtp.user || '').trim();
  const pass = (process.env.SMTP_PASS || config.smtp.pass || '').replace(/\s+/g, '');
  const rawHost = (process.env.SMTP_HOST || config.smtp.host || 'smtp.gmail.com').trim();
  let configuredPort = parseInt(process.env.SMTP_PORT || config.smtp.port || '587', 10);
  if (configuredPort === 443) {
    // Port 443 is for HTTPS REST APIs. For raw Nodemailer TCP sockets, map to SSL (465)
    configuredPort = 465;
  }
  const fallbackPort = configuredPort === 587 ? 465 : 587;

  if (!user || !pass) {
    console.warn('[EmailService] ⚠️ SMTP_USER or SMTP_PASS not set. Cannot send email.');
    return { success: false, notConfigured: true };
  }

  console.log(`[EmailService] 📨 Dispatching to: ${mailOptions.to}`);
  console.log(`[EmailService] 📤 From: ${user} | Host: ${rawHost} | Configured port: ${configuredPort}`);

  // Resolve to IPv4 using Node callback-style DNS
  const ipv4Host = await resolveIPv4Address(rawHost);

  // Attempt 1: Configured port (e.g., 587 STARTTLS)
  try {
    console.log(`[EmailService] 🔌 Connecting to ${ipv4Host}:${configuredPort} (SNI: ${rawHost}, Mode: ${configuredPort === 465 ? 'SSL' : 'STARTTLS'})...`);
    const t1 = createTransporterForPort(ipv4Host, rawHost, configuredPort, user, pass);
    const info = await t1.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email delivered! Port: ${configuredPort}, MsgID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, port: configuredPort, response: info.response, host: ipv4Host };
  } catch (err1) {
    console.warn(`[EmailService] ⚠️ Port ${configuredPort} failed: "${err1.message}" — trying fallback port ${fallbackPort}...`);

    // Attempt 2: Fallback port (e.g., 465 SSL)
    try {
      console.log(`[EmailService] 🔌 Fallback connecting to ${ipv4Host}:${fallbackPort} (Mode: ${fallbackPort === 465 ? 'SSL' : 'STARTTLS'})...`);
      const t2 = createTransporterForPort(ipv4Host, rawHost, fallbackPort, user, pass);
      const info2 = await t2.sendMail(mailOptions);
      console.log(`[EmailService] ✅ Email delivered via fallback! Port: ${fallbackPort}, MsgID: ${info2.messageId}`);
      return { success: true, messageId: info2.messageId, port: fallbackPort, response: info2.response, host: ipv4Host };
    } catch (err2) {
      const isCloudBlocked = err1.message.includes('timeout') && err2.message.includes('timeout');
      const errMessage = isCloudBlocked
        ? `Outbound SMTP ports (465/587) are blocked by cloud hosting provider (Render Free Tier). Add RESEND_API_KEY or BREVO_API_KEY in Render Environment Variables for HTTPS (Port 443) delivery.`
        : `Port ${configuredPort}: ${err1.message}; Port ${fallbackPort}: ${err2.message}`;

      console.error(`[EmailService] ❌ Email dispatch failed to ${mailOptions.to}: ${errMessage}`);
      return {
        success: false,
        error: errMessage,
        mode: 'smtp_failed',
        resolvedHost: ipv4Host,
        rawHost,
        user
      };
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a User Invitation & Password Setup Email
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
  const result = await sendWithTransporterFallback({ from: senderFrom, to: email, subject, html: htmlContent });

  if (result.notConfigured) {
    console.log('📧 [MOCK INVITATION EMAIL — SMTP CREDENTIALS NOT CONFIGURED]');
    return { success: true, mode: 'mock_console' };
  }

  return result;
};

/**
 * Sends an AI Escalation / Collection Follow-Up Email to Borrower
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
        .priority-banner { background: ${priorityColor}; color: #ffffff; padding: 8px 16px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
        .header { background: #0f172a; padding: 24px; display: flex; align-items: center; justify-content: space-between; }
        .content { padding: 32px 24px; }
        .message-box { background: #f8fafc; border-left: 4px solid ${priorityColor}; padding: 18px; border-radius: 0 10px 10px 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="priority-banner">${priority.toUpperCase()} URGENCY — OFFICIAL FINANCIAL REMINDER</div>
        <div class="header">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">FinanceFlow <span style="color:#818cf8;">AI</span></h2>
          <span style="font-size: 12px; color: #94a3b8;">Ref Alert #${alertId || 'N/A'}</span>
        </div>
        <div class="content">
          <h3>Attention: ${companyName}</h3>
          <p style="font-size: 14px; color: #475569;">Please review the official repayment notice below regarding your outstanding facility balance:</p>
          <div class="message-box">${body}</div>
          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            If you have already processed this payment, please disregard this notice or reply to
            <a href="mailto:${fromEmail || process.env.SMTP_USER}">${fromEmail || process.env.SMTP_USER}</a>.
          </p>
        </div>
        <div class="footer">
          Automated notification by FinanceFlow AI Operational Agents. &copy; ${new Date().getFullYear()} FinanceFlow AI.
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await sendWithTransporterFallback({ from: senderFrom, to: targetRecipient, subject, html: htmlContent });

  if (result.notConfigured) {
    console.log('📧 [MOCK ESCALATION EMAIL — SMTP NOT CONFIGURED]');
    return { success: true, mode: 'mock_console', from: fromEmail, to: targetRecipient };
  }

  return { ...result, from: fromEmail, to: targetRecipient };
};

/**
 * Diagnostic: Tests SMTP connectivity directly from Render's container.
 * Call GET /api/notifications/test-smtp to verify production email delivery.
 */
export const testSmtpConnection = async (targetEmail = 'mani30saravanan@gmail.com') => {
  const user = (process.env.SMTP_USER || config.smtp.user || '').trim();
  return await sendWithTransporterFallback({
    from: `"FinanceFlow Diagnostics" <${user}>`,
    to: targetEmail,
    subject: '🧪 FinanceFlow AI — SMTP Production Diagnostic Ping',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #4f46e5; border-radius: 12px;">
        <h2 style="color: #4f46e5;">SMTP Production Diagnostic</h2>
        <p>This ping confirms SMTP delivery is working from Render cloud container.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>To:</strong> ${targetEmail}</p>
        <p><strong>Sender:</strong> ${user}</p>
      </div>
    `
  });
};

/**
 * Resend-Only Production Diagnostic Endpoint:
 * Direct Resend HTTPS API test without falling back to SMTP.
 * Call GET /api/notifications/test-resend to verify direct Resend HTTPS API delivery.
 */
export const testResendConnection = async (targetEmail = 'yuvanbharathinaveen@gmail.com') => {
  const smtpPass = (process.env.SMTP_PASS || config.smtp.pass || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || config.smtp.resendApiKey || (smtpPass.startsWith('re_') ? smtpPass : '')).trim();

  if (!resendKey) {
    return {
      success: false,
      mode: 'resend_https_api',
      error: 'RESEND_API_KEY is not configured in Render environment variables.'
    };
  }

  const senderFrom = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'FinanceFlow AI <onboarding@resend.dev>';
  return await sendWithHttpsApiFallback({
    from: senderFrom,
    to: targetEmail,
    subject: '🧪 FinanceFlow AI — Resend Direct HTTPS Diagnostic Ping',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px; max-width: 500px;">
        <h2 style="color: #10b981;">Resend HTTPS API Production Diagnostic</h2>
        <p>This ping confirms direct Resend REST API email delivery over Port 443.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Recipient:</strong> ${targetEmail}</p>
        <p><strong>Sender:</strong> ${senderFrom}</p>
      </div>
    `
  });
};
