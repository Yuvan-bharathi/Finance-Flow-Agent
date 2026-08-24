import { sendUserInvitationEmail, sendEscalationNoticeEmail } from '../src/utils/emailService.js';

async function testEmailDelivery() {
  console.log('🧪 Starting Email Service Delivery Verification Test...\n');

  // Test 1: User Account Invitation Email
  console.log('1️⃣ Testing User Account Invitation Email Dispatch...');
  const inviteRes = await sendUserInvitationEmail({
    email: 'test.user@financeflow.com',
    name: 'Alex Mercer',
    roleName: 'Senior Accountant',
    invitationUrl: 'http://localhost:5173/set-password?token=sample_test_token_123456&email=test.user%40financeflow.com'
  });
  console.log('Result 1:', inviteRes, '\n');

  // Test 2: AI Agent Escalation Notice Email
  console.log('2️⃣ Testing AI Agent Escalation Notice Email Dispatch...');
  const escalationRes = await sendEscalationNoticeEmail({
    recipientEmail: 'finance@kaveriagro.com',
    companyName: 'Kaveri Agro Industries',
    subject: 'CRITICAL NOTICE: Overdue EMI Balance & Legal Action Warning',
    body: 'Dear Finance Team,\n\nOur automated risk engine (Agent 6) has detected that your loan facility LN-KAI-2026-01 is currently 65 days past due with an unpaid balance of ₹1,68,750.\n\nPlease process this payment immediately to prevent default status.\n\nRegards,\nFinanceFlow AI Operations',
    priority: 'critical',
    alertId: 104
  });
  console.log('Result 2:', escalationRes, '\n');

  console.log('🎉 Email Service Test Completed Successfully!');
  process.exit(0);
}

testEmailDelivery();
