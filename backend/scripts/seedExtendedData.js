import pool from '../src/config/db.js';

/**
 * Seed Script: Seed Extended Multi-Agent Test Data
 * Inserts realistic test data for Agent 2 (Risk Assessment), Agent 3 (Collection Follow-Up), and Agent 4 (Document Intelligence).
 */
async function seedExtendedData() {
  try {
    console.log('--- 1. Seeding Extended Borrower Companies ---');
    
    // Check if Apex Logistics exists
    const [compCheck] = await pool.query(`SELECT id FROM companies WHERE company_name = 'Apex Logistics Pvt Ltd'`);
    let apexId = compCheck[0]?.id;
    
    if (!apexId) {
      const [res] = await pool.query(`
        INSERT INTO companies (company_name, registration_number, tax_identifier, bank_account_number, contact_name, contact_email, contact_phone, address, status)
        VALUES 
        ('Apex Logistics Pvt Ltd', 'REG-2024-APX400', 'TAX-9988776644', '990088776655', 'Sunil Verma', 'finance@apexlogistics.com', '+91 9876543220', 'Logistics Hub, NH-8, Gurugram, India', 'active'),
        ('CyberNet Systems Inc', 'REG-2024-CYB500', 'TAX-9988776655', '112233445566', 'Meera Nair', 'accounts@cybernetsys.com', '+91 9876543221', 'IT City, Electronic City, Bengaluru, India', 'active')
      `);
      console.log('Inserted extended companies!');
    }

    const [compApex] = await pool.query(`SELECT id FROM companies WHERE company_name = 'Apex Logistics Pvt Ltd'`);
    apexId = compApex[0].id;

    const [compCyb] = await pool.query(`SELECT id FROM companies WHERE company_name = 'CyberNet Systems Inc'`);
    const cybId = compCyb[0].id;

    console.log('Apex Logistics ID:', apexId, '| CyberNet Systems ID:', cybId);

    console.log('\n--- 2. Seeding Overdue Loans & Installments ---');

    // Loan 3 for Apex Logistics
    const [loanApexCheck] = await pool.query(`SELECT id FROM loans WHERE loan_number = 'LN-APX-2026-01'`);
    let loanApexId = loanApexCheck[0]?.id;

    if (!loanApexId) {
      const [lRes] = await pool.query(`
        INSERT INTO loans (company_id, loan_number, principal_amount, interest_rate, total_payable, start_date, end_date, status)
        VALUES (?, 'LN-APX-2026-01', 1500000.00, 12.50, 1687500.00, '2026-01-15', '2026-12-15', 'active')
      `, [apexId]);
      loanApexId = lRes.insertId;

      // Overdue Installments for Apex Logistics
      await pool.query(`
        INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
        VALUES 
        (?, 1, '2026-06-15', 168750.00, 0.00, 'overdue'),
        (?, 2, '2026-07-15', 168750.00, 0.00, 'overdue'),
        (?, 3, '2026-08-15', 168750.00, 0.00, 'pending')
      `, [loanApexId, loanApexId, loanApexId]);
      console.log('Inserted overdue loan LN-APX-2026-01!');
    }

    // Loan 4 for CyberNet Systems
    const [loanCybCheck] = await pool.query(`SELECT id FROM loans WHERE loan_number = 'LN-CYB-2026-02'`);
    let loanCybId = loanCybCheck[0]?.id;

    if (!loanCybId) {
      const [lRes2] = await pool.query(`
        INSERT INTO loans (company_id, loan_number, principal_amount, interest_rate, total_payable, start_date, end_date, status)
        VALUES (?, 'LN-CYB-2026-02', 800000.00, 14.00, 912000.00, '2026-02-01', '2026-10-01', 'active')
      `, [cybId]);
      loanCybId = lRes2.insertId;

      await pool.query(`
        INSERT INTO repayment_schedules (loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
        VALUES 
        (?, 1, '2026-07-01', 114000.00, 0.00, 'overdue'),
        (?, 2, '2026-08-01', 114000.00, 0.00, 'pending')
      `, [loanCybId, loanCybId]);
      console.log('Inserted overdue loan LN-CYB-2026-02!');
    }

    console.log('\n--- 3. Seeding Contract Documents in documents Table ---');
    
    // Check documents table
    const [docCheck] = await pool.query(`SELECT id FROM documents WHERE file_name = 'Apex_Logistics_Master_Facility_Agreement.pdf'`);
    if (docCheck.length === 0) {
      await pool.query(`
        INSERT INTO documents (company_id, document_type, file_name, file_url, storage_provider, mime_type, file_size, uploaded_by)
        VALUES 
        (?, 'loan_agreement', 'Apex_Logistics_Master_Facility_Agreement.pdf', '/documents/Apex_Logistics_Master_Facility_Agreement.pdf', 'local', 'application/pdf', 345000, 1),
        (?, 'loan_agreement', 'CyberNet_Systems_Credit_Facility_Agreement.pdf', '/documents/CyberNet_Systems_Credit_Facility_Agreement.pdf', 'local', 'application/pdf', 512000, 1)
      `, [apexId, cybId]);
      console.log('Inserted sample contract documents!');
    }

    console.log('\n======================================================');
    console.log('🎉 MULTI-AGENT TEST DATA SEEDED SUCCESSFULLY!');
    console.log('======================================================');
    await pool.end();
  } catch (err) {
    console.error('Seed Error:', err);
    await pool.end();
  }
}

seedExtendedData();
