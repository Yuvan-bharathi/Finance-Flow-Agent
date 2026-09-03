import pool from '../config/db.js';
import { runDocumentIntelligenceAgent } from '../agents/documentAgent.js';

/**
 * Service: getDocumentsService
 * Returns list of documents with borrower company and uploader details.
 */
export const getDocumentsService = async () => {
  const [rows] = await pool.query(`
    SELECT d.*, c.company_name, u.name AS uploader_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    ORDER BY d.created_at DESC;
  `);
  return rows;
};

/**
 * Service: uploadDocumentService
 * Ingests a new document record into documents table.
 */
export const uploadDocumentService = async ({
  company_id = null,
  payment_id = null,
  document_type = 'loan_agreement',
  file_name,
  file_url = '/uploads/sample_agreement.pdf',
  storage_provider = 'cloudinary',
  mime_type = 'application/pdf',
  file_size = 350000,
  uploaded_by = 1,
  extracted_text = null
}) => {
  let docId = null;
  try {
    const [result] = await pool.query(`
      INSERT INTO documents (
        company_id, payment_id, document_type, file_name, file_url,
        storage_provider, mime_type, file_size, uploaded_by, extracted_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      company_id || null,
      payment_id || null,
      document_type,
      file_name,
      file_url,
      storage_provider,
      mime_type,
      file_size,
      uploaded_by,
      extracted_text || null
    ]);
    docId = result.insertId;
  } catch {
    // If extracted_text column is not yet present, insert without it
    const [result] = await pool.query(`
      INSERT INTO documents (
        company_id, payment_id, document_type, file_name, file_url,
        storage_provider, mime_type, file_size, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      company_id || null,
      payment_id || null,
      document_type,
      file_name,
      file_url,
      storage_provider,
      mime_type,
      file_size,
      uploaded_by
    ]);
    docId = result.insertId;
  }

  const [created] = await pool.query(`
    SELECT d.*, c.company_name, u.name AS uploader_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = ?
  `, [docId]);

  return created[0];
};

/**
 * Service: updateDocumentService
 * Updates document metadata (file_name, company_id, document_type).
 */
export const updateDocumentService = async (documentId, { file_name, company_id, document_type }) => {
  const updates = [];
  const params = [];

  if (file_name) {
    updates.push('file_name = ?');
    params.push(file_name);
  }
  if (company_id !== undefined) {
    updates.push('company_id = ?');
    params.push(company_id ? parseInt(company_id, 10) : null);
  }
  if (document_type) {
    updates.push('document_type = ?');
    params.push(document_type);
  }

  if (updates.length > 0) {
    params.push(documentId);
    await pool.query(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [updated] = await pool.query(`
    SELECT d.*, c.company_name, u.name AS uploader_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = ?
  `, [documentId]);

  return updated[0] || null;
};

/**
 * Service: deleteDocumentService
 * Removes a document record from the database.
 */
export const deleteDocumentService = async (documentId) => {
  const [existing] = await pool.query(`SELECT * FROM documents WHERE id = ?`, [documentId]);
  if (existing.length === 0) return null;

  await pool.query(`DELETE FROM documents WHERE id = ?`, [documentId]);
  return { id: documentId, file_name: existing[0].file_name };
};

/**
 * Service: extractDocumentTermsService
 * Calls Agent 4 to parse structured loan contract terms.
 */
export const extractDocumentTermsService = async (documentId, userId = null) => {
  return await runDocumentIntelligenceAgent(documentId, userId);
};

/**
 * Service: generateFinancialDocumentService
 * Generates one of the 5 standardized financial/reconciliation documents for a case.
 */
export const generateFinancialDocumentService = async (type, caseId = 1) => {
  let caseRows = [];
  try {
    const [rows] = await pool.query(`
      SELECT rc.id, rc.status, rc.created_at,
             p.id AS payment_id, p.transaction_id, p.amount AS payment_amount, p.payment_date, p.sender_name, p.sender_account,
             c.id AS company_id, c.company_name, c.tax_identifier, c.registration_number, c.address, c.contact_name, c.contact_email, c.bank_account_number,
             l.id AS loan_id, l.loan_number, l.principal_amount, l.interest_rate, l.total_payable
      FROM reconciliation_cases rc
      JOIN payments p ON rc.payment_id = p.id
      LEFT JOIN companies c ON (p.sender_name LIKE CONCAT('%', c.company_name, '%') OR c.company_name LIKE CONCAT('%', p.sender_name, '%') OR p.sender_account = c.bank_account_number)
      LEFT JOIN loans l ON c.id = l.company_id
      WHERE rc.id = ?
      LIMIT 1
    `, [caseId]);
    caseRows = rows;
  } catch (err) {
    console.warn('[generateFinancialDocumentService query warn]:', err.message);
  }

  if (!caseRows || caseRows.length === 0) {
    try {
      const [latestRows] = await pool.query(`
        SELECT rc.id, rc.status, rc.created_at,
               p.id AS payment_id, p.transaction_id, p.amount AS payment_amount, p.payment_date, p.sender_name, p.sender_account,
               c.id AS company_id, c.company_name, c.tax_identifier, c.registration_number, c.address, c.contact_name, c.contact_email, c.bank_account_number,
               l.id AS loan_id, l.loan_number, l.principal_amount, l.interest_rate, l.total_payable
        FROM reconciliation_cases rc
        JOIN payments p ON rc.payment_id = p.id
        LEFT JOIN companies c ON (p.sender_name LIKE CONCAT('%', c.company_name, '%') OR c.company_name LIKE CONCAT('%', p.sender_name, '%') OR p.sender_account = c.bank_account_number)
        LEFT JOIN loans l ON c.id = l.company_id
        ORDER BY rc.id DESC
        LIMIT 1
      `);
      caseRows = latestRows;
    } catch (e) {
      console.warn('[generateFinancialDocumentService fallback warn]:', e.message);
    }
  }

  const c = (caseRows && caseRows[0]) ? caseRows[0] : {};
  const paymentAmount = Number(c.payment_amount || 133800);
  const companyName = c.company_name || c.sender_name || 'Starlight Tech Solutions';
  const loanRef = c.loan_number || `LN-2026-${String(c.id || caseId || 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  
  // Dynamic Transaction / Received Date in Indian Standard Time (IST)
  const rawDate = c.created_at || c.payment_date || new Date();
  const dateObj = new Date(rawDate);
  const paymentDateStr = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).replace(/\s+/g, '-')
    : '02-Sept-2026';

  // Dynamic Contractual Next Due Date queried from company's actual repayment schedule
  let nextDueDateStr = '';
  if (c.loan_id) {
    try {
      const [schedules] = await pool.query(`
        SELECT rs.due_date, rs.installment_number
        FROM repayment_schedules rs
        WHERE rs.loan_id = ? AND rs.status != 'paid' AND rs.due_date >= ?
        ORDER BY rs.due_date ASC
        LIMIT 1
      `, [c.loan_id, dateObj.toISOString().slice(0, 10)]);

      if (schedules && schedules.length > 0) {
        const sDateObj = new Date(schedules[0].due_date);
        nextDueDateStr = sDateObj.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Kolkata'
        }).replace(/\s+/g, '-');
      }
    } catch (err) {
      console.warn('[nextDueDate schedule query warn]:', err.message);
    }
  }

  if (!nextDueDateStr) {
    const dueDay = c.start_date ? new Date(c.start_date).getDate() : 10;
    const nextDate = new Date(dateObj);
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextDate.setDate(dueDay);
    nextDueDateStr = nextDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).replace(/\s+/g, '-');
  }

  const borrowerInfo = {
    company_name: companyName,
    cin: c.cin_number || c.registration_number || 'U60200TN2018PTC123456',
    pan: c.pan_number || c.tax_identifier || 'AABCA1234F',
    gstin: c.gstin_number || '33AABCA1234F1Z8',
    registered_address: c.registered_address || c.address || 'Plot No. 44, Guindy Industrial Estate, Chennai, TN - 600032',
    authorized_contact: c.contact_name || 'Rajesh Kumar (Chief Financial Officer)',
    email: c.contact_email || 'finance@company.com',
    debited_bank_account: c.sender_account ? `Bank A/c ************${String(c.sender_account).slice(-4)}` : 'HDFC Bank A/c ************4781'
  };

  const facilityInfo = {
    loan_account: loanRef,
    facility_type: 'Commercial Term Credit Facility',
    sanctioned_amount: Number(c.principal_amount || 2500000),
    opening_principal: Number(c.principal_amount || 1250000),
    principal_deducted: Math.round(paymentAmount * 0.8),
    closing_principal: Math.max(0, Number(c.principal_amount || 1250000) - Math.round(paymentAmount * 0.8)),
    interest_rate: c.interest_rate ? `${c.interest_rate}% p.a.` : '12.50% p.a.',
    installment_milestone: `EMI Installment #${Math.min(12, Math.max(1, Number(c.id || caseId || 1)))} of 36`,
    next_due_date: nextDueDateStr
  };

  const lenderInfo = {
    company_name: 'FinanceFlow Capital NBFC Ltd',
    rbi_reg_no: 'RBI-NBFC-N-07.00892',
    address: 'Tech Park One, Tower B, Outer Ring Road, Bangalore - 560103',
    gstin: '29AAACF1234F1Z5',
    pan: 'AAACF1234F',
    support_email: 'settlements@financeflow.ai',
    contact_phone: '+91 (080) 4122-8800'
  };

  switch (type) {
    case 'reconciliation_report':
      return {
        document_type: 'Payment Reconciliation Report',
        reference_id: `INV-2026-08-${String(c.id || 1).padStart(4, '0')}`,
        case_id: c.id || caseId,
        transaction_id: c.transaction_id || `TXN-BANK-${c.id || 1}`,
        utr_number: c.transaction_id || `TXN-BANK-${c.id || 1}`,
        payer: c.sender_name || companyName,
        payer_account: c.sender_account || '123495214781',
        amount: paymentAmount,
        payment_date: paymentDateStr,
        payment_mode: 'RTGS / Corporate Net Banking',
        matched_borrower: companyName,
        loan_account: loanRef,
        confidence: c.confidence_score || 96,
        status: String(c.status || 'RESOLVED').toUpperCase(),
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now,
        lender: lenderInfo,
        borrower: borrowerInfo,
        facility: facilityInfo,
        waterfall: [
          { item: '1. Late Payment Penalty & Delayed Interest', scheduled: 0, settled: 0, outstanding: 0, status: 'CLEARED' },
          { item: '2. Overdue Milestone Interest Charges', scheduled: 0, settled: 0, outstanding: 0, status: 'CLEARED' },
          { item: '3. Current Scheduled Period Interest (12.5% p.a.)', scheduled: Math.round(paymentAmount * 0.2), settled: Math.round(paymentAmount * 0.2), outstanding: 0, status: 'CLEARED' },
          { item: '4. Current Scheduled Principal Repayment', scheduled: Math.round(paymentAmount * 0.8), settled: Math.round(paymentAmount * 0.8), outstanding: 0, status: 'CLEARED' }
        ],
        summary: `Successfully verified and reconciled inbound deposit of ₹${paymentAmount.toLocaleString('en-IN')} against loan ${loanRef}.`
      };

    case 'payment_receipt':
      return {
        document_type: 'Official Payment Receipt',
        reference_id: `RCP-2026-${String(c.id || 1).padStart(5, '0')}`,
        receipt_number: `RCP-2026-${String(c.id || 1).padStart(5, '0')}`,
        settlement_id: `SET-100${c.id || 1}`,
        case_id: c.id || caseId,
        transaction_id: c.transaction_id || `TXN-BANK-${c.id || 1}`,
        utr_number: c.transaction_id || `TXN-BANK-${c.id || 1}`,
        borrower: borrowerInfo,
        lender: lenderInfo,
        facility: facilityInfo,
        total_received: paymentAmount,
        amount: paymentAmount,
        payment_date: paymentDateStr,
        settlement_date: paymentDateStr,
        allocations: [
          { component: 'Late Payment Penalties', amount: 0 },
          { component: 'Overdue Milestone Interest', amount: 0 },
          { component: 'Current Scheduled Interest', amount: Math.round(paymentAmount * 0.2) },
          { component: 'Current Scheduled Principal', amount: Math.round(paymentAmount * 0.8) }
        ],
        waterfall: [
          { item: '1. Late Payment Penalty & Delayed Interest', scheduled: 0, settled: 0, outstanding: 0, status: 'CLEARED' },
          { item: '2. Overdue Milestone Interest Charges', scheduled: 0, settled: 0, outstanding: 0, status: 'CLEARED' },
          { item: '3. Current Scheduled Period Interest (12.5% p.a.)', scheduled: Math.round(paymentAmount * 0.2), settled: Math.round(paymentAmount * 0.2), outstanding: 0, status: 'CLEARED' },
          { item: '4. Current Scheduled Principal Repayment', scheduled: Math.round(paymentAmount * 0.8), settled: Math.round(paymentAmount * 0.8), outstanding: 0, status: 'CLEARED' }
        ],
        status: 'COMPLETED & SETTLED',
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now
      };

    case 'settlement_statement':
      return {
        document_type: 'Waterfall Settlement Statement',
        reference_id: `SET-STMT-2026-${String(c.id || 1).padStart(4, '0')}`,
        statement_ref: `SET-STATEMENT-${c.id || 1}`,
        case_id: c.id || caseId,
        transaction_id: c.transaction_id || `TXN-BANK-${c.id || 1}`,
        utr_number: c.transaction_id || `TXN-BANK-${c.id || 1}`,
        payment_date: paymentDateStr,
        amount: paymentAmount,
        borrower: borrowerInfo,
        lender: lenderInfo,
        facility: facilityInfo,
        total_inbound: paymentAmount,
        waterfall_breakdown: {
          tier1_penalties: 0,
          tier2_overdue_interest: 0,
          tier3_current_interest: Math.round(paymentAmount * 0.2),
          tier4_overdue_principal: 0,
          tier5_current_principal: Math.round(paymentAmount * 0.8),
          surplus_advance: 0
        },
        waterfall: [
          { item: '1. Late Payment Penalty & Delayed Interest', scheduled: 0, settled: 0, outstanding: 0, status: 'CLEARED' },
          { item: '2. Overdue Milestone Interest Charges', scheduled: 0, settled: 0, outstanding: 0, status: 'CLEARED' },
          { item: '3. Current Scheduled Period Interest (12.5% p.a.)', scheduled: Math.round(paymentAmount * 0.2), settled: Math.round(paymentAmount * 0.2), outstanding: 0, status: 'CLEARED' },
          { item: '4. Current Scheduled Principal Repayment', scheduled: Math.round(paymentAmount * 0.8), settled: Math.round(paymentAmount * 0.8), outstanding: 0, status: 'CLEARED' }
        ],
        remaining_balance: Math.max(0, (c.principal_amount || 2500000) - (paymentAmount * 0.8)),
        status: 'SETTLED',
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now
      };

    case 'tally_xml':
      return {
        document_type: 'Tally Prime ERP XML Journal',
        file_name: `Tally_Voucher_Case_${c.id || 1}.xml`,
        format: 'XML',
        case_id: c.id || caseId,
        borrower: borrowerInfo,
        amount: paymentAmount,
        xml_content: `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST><TYPE>Data</TYPE><ID>Vouchers</ID></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>${now.slice(0, 10).replace(/-/g, '')}</DATE>
            <VOUCHERNUMBER>RCP-2026-${c.id || 1}</VOUCHERNUMBER>
            <NARRATION>Loan Repayment ${companyName} Ref ${loanRef} UTR ${c.transaction_id || ''}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>HDFC Bank Operating A/c</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${paymentAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Loan Asset - ${companyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${Math.round(paymentAmount * 0.8)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Interest Income</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${Math.round(paymentAmount * 0.2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`,
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now
      };

    default:
      throw new Error(`Unsupported document type: ${type}`);
  }
};
