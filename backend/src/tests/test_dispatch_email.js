import { sendEscalationNoticeEmail } from '../utils/emailService.js';

const testDispatchEmail = async () => {
  console.log('Testing Email Dispatch...');
  const res = await sendEscalationNoticeEmail({
    recipientEmail: 'yuvanbharathin@gmail.com',
    fromEmail: 'yuvanbharathin@gmail.com',
    companyName: 'ABC Technologies Pvt Ltd',
    subject: '[FINAL DEMAND] Real SMTP Test Notice — FinanceFlow AI',
    body: 'Dear Rajesh Kumar,\n\nOur records indicate an outstanding overdue balance of ₹2,60,000.00 for ABC Technologies Pvt Ltd across 3 open installments. Please arrange for immediate settlement.\n\nBest regards,\nFinanceFlow AI Operations',
    priority: 'critical',
    alertId: 5612030
  });
  console.log('Dispatch Result:', res);
};

testDispatchEmail();
