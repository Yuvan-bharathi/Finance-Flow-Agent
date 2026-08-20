import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { COLLECTION_AGENT_SYSTEM_PROMPT } from '../prompts/collection.prompt.js';
import { executeCollectionTool } from '../tools/collectionTools.js';
import pool from '../config/db.js';

/**
 * Agent 3: Automated Collection Follow-Up Agent
 * Drafts professional payment reminder emails for past-due/high-risk borrowers.
 * 
 * Called by:
 * - collection.service.js
 * 
 * @param {number} companyId - Target Company ID.
 * @returns {Promise<Object>} Generated collection email draft object.
 */
export const runCollectionAgent = async (companyId) => {
  const [compRows] = await pool.query(`SELECT * FROM companies WHERE id = ?`, [companyId]);
  if (compRows.length === 0) {
    throw new Error(`Company ID ${companyId} not found for collection follow-up.`);
  }
  const company = compRows[0];

  const overdueList = await executeCollectionTool('getOverdueInstallments', { companyId });

  let totalOverdue = 0;
  let oldestDueDate = new Date();
  
  if (overdueList.length > 0) {
    oldestDueDate = new Date(overdueList[0].due_date);
    overdueList.forEach(item => {
      totalOverdue += parseFloat(item.scheduled_amount) - parseFloat(item.paid_amount);
    });
  }

  const now = new Date();
  const overdueDays = Math.max(1, Math.floor((now - oldestDueDate) / (1000 * 60 * 60 * 24)));
  const loanNumber = overdueList[0]?.loan_number || 'LN-GENERAL';

  let urgency = 'POLITE_REMINDER';
  if (overdueDays > 45) urgency = 'FINAL_NOTICE';
  else if (overdueDays > 30) urgency = 'URGENT_DEMAND';
  else if (overdueDays > 15) urgency = 'FIRM_NOTICE';

  const defaultSubject = `[${urgency.replace('_', ' ')}] Payment Overdue Notice - Loan ${loanNumber} (${company.company_name})`;
  const defaultBody = `Dear ${company.contact_name || 'Finance Team'},\n\nThis is a formal notification regarding outstanding repayment installments for Loan Facility **${loanNumber}** under **${company.company_name}**.\n\nOur records indicate a total overdue amount of **₹${totalOverdue.toLocaleString('en-IN')}**, which is currently **${overdueDays} days past due** (Due Date: ${oldestDueDate.toISOString().split('T')[0]}).\n\nPlease remit the payment to our designated Virtual Account **${company.bank_account_number || '123456789012'}** or provide a formal payment promise date.\n\nSincerely,\nFinanceFlow AI Operations Team`;

  const fallbackDraft = {
    company_id: company.id,
    company_name: company.company_name,
    recipient_name: company.contact_name || 'Finance Team',
    recipient_email: company.contact_email,
    loan_number: loanNumber,
    overdue_amount: totalOverdue,
    overdue_days: overdueDays,
    urgency_level: urgency,
    subject: defaultSubject,
    email_body: defaultBody
  };

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: COLLECTION_AGENT_SYSTEM_PROMPT },
        { role: 'user', content: `Draft a professional collection email for ${company.company_name} (Contact: ${company.contact_name}, Email: ${company.contact_email}). Overdue details: ${JSON.stringify(overdueList)}` }
      ],
      temperature: 0.2
    });

    const choice = response.choices[0].message;
    if (choice.content) {
      try {
        const parsed = JSON.parse(choice.content);
        return {
          ...fallbackDraft,
          ...parsed
        };
      } catch (e) {
        // Return structured markdown fallback if non-JSON
      }
    }
  } catch (err) {
    console.warn('[Collection Agent Groq Fallback Triggered]:', err.message);
  }

  return fallbackDraft;
};
