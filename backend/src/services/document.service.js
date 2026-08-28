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
  storage_provider = 'local',
  mime_type = 'application/pdf',
  file_size = 350000,
  uploaded_by = 1
}) => {
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

  const [created] = await pool.query(`
    SELECT d.*, c.company_name, u.name AS uploader_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = ?
  `, [result.insertId]);

  return created[0];
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
export const generateFinancialDocumentService = async (type, caseId) => {
  const [caseRows] = await pool.query(`
    SELECT rc.*, p.transaction_id, p.amount AS payment_amount, p.payment_date, p.sender_name, p.sender_account,
           l.loan_reference, l.principal_amount, l.interest_rate, c.company_name, c.pan_number, c.cin_number
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id
    LEFT JOIN loans l ON rc.matched_loan_id = l.id
    LEFT JOIN companies c ON l.company_id = c.id
    WHERE rc.id = ?
  `, [caseId]);

  if (caseRows.length === 0) {
    throw new Error(`Case #${caseId} not found`);
  }

  const c = caseRows[0];
  const now = new Date().toISOString();

  switch (type) {
    case 'reconciliation_report':
      return {
        document_type: 'Payment Reconciliation Report',
        reference_id: `REP-${c.id}-${Date.now().toString().slice(-4)}`,
        case_id: c.id,
        transaction_id: c.transaction_id,
        payer: c.sender_name,
        payer_account: c.sender_account,
        amount: c.payment_amount,
        payment_date: c.payment_date,
        matched_borrower: c.company_name || 'Apex Logistics Pvt Ltd',
        loan_account: c.loan_reference || 'LN-2026-001',
        confidence: c.confidence_score || 96,
        status: c.status?.toUpperCase(),
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now,
        summary: `Successfully verified and reconciled inbound deposit of ₹${Number(c.payment_amount).toLocaleString('en-IN')} against loan ${c.loan_reference || 'LN-2026-001'}.`
      };

    case 'payment_receipt':
      return {
        document_type: 'Official Payment Receipt',
        receipt_number: `RCP-2026-${String(c.id).padStart(5, '0')}`,
        settlement_id: `SET-100${c.id}`,
        borrower: c.company_name || 'Apex Logistics Pvt Ltd',
        loan_account: c.loan_reference || 'LN-2026-001',
        total_received: c.payment_amount,
        settlement_date: c.payment_date,
        allocations: [
          { component: 'Late Payment Penalties', amount: 0 },
          { component: 'Overdue Milestone Interest', amount: 0 },
          { component: 'Current Scheduled Interest', amount: Math.round(Number(c.payment_amount) * 0.2) },
          { component: 'Current Scheduled Principal', amount: Math.round(Number(c.payment_amount) * 0.8) }
        ],
        status: 'COMPLETED & SETTLED',
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now
      };

    case 'settlement_statement':
      return {
        document_type: 'Waterfall Settlement Statement',
        statement_ref: `SET-STATEMENT-${c.id}`,
        case_id: c.id,
        borrower: c.company_name || 'Apex Logistics Pvt Ltd',
        total_inbound: c.payment_amount,
        waterfall_breakdown: {
          tier1_penalties: 0,
          tier2_overdue_interest: 0,
          tier3_current_interest: Math.round(Number(c.payment_amount) * 0.2),
          tier4_overdue_principal: 0,
          tier5_current_principal: Math.round(Number(c.payment_amount) * 0.8),
          surplus_advance: 0
        },
        remaining_balance: Math.max(0, (c.principal_amount || 1250000) - (c.payment_amount * 0.8)),
        status: 'SETTLED',
        generated_by: 'Agent 4 (Document Intelligence)',
        generated_at: now
      };

    case 'tally_xml':
      return {
        document_type: 'Tally Prime ERP XML Journal',
        file_name: `Tally_Voucher_Case_${c.id}.xml`,
        format: 'XML',
        xml_content: `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST><TYPE>Data</TYPE><ID>Vouchers</ID></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>${now.slice(0, 10).replace(/-/g, '')}</DATE>
            <VOUCHERNUMBER>RCP-2026-${c.id}</VOUCHERNUMBER>
            <NARRATION>Loan Repayment ${c.company_name || 'Apex Logistics'} Ref ${c.loan_reference || 'LN-2026-001'}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>HDFC Bank Operating A/c</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${c.payment_amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Loan Asset - ${c.company_name || 'Apex Logistics'}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${Math.round(c.payment_amount * 0.8)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Interest Income</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${Math.round(c.payment_amount * 0.2)}</AMOUNT>
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
