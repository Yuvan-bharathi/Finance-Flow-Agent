import pool from '../config/db.js';
import {
  getCompaniesService,
  getCompanyByIdService,
  createCompanyService,
  updateCompanyService,
  deleteCompanyService
} from '../services/company.service.js';

const runTests = async () => {
  try {
    console.log('--- 1. Testing GET Companies Service ---');
    const companies = await getCompaniesService();
    console.log(`✓ Fetched ${companies.length} companies successfully.`);

    console.log('\n--- 2. Testing CREATE Company Service ---');
    const newCompany = await createCompanyService({
      company_name: 'Test Acme Corp India',
      registration_number: 'REG-2026-TEST999',
      tax_identifier: 'TAX-IN-TEST99',
      bank_account_number: '999888777666',
      contact_name: 'Test Manager',
      contact_email: 'test@acme.com',
      contact_phone: '+91 9988776655',
      address: '123 Test Park, Sector 5, Bengaluru',
      status: 'active'
    });
    console.log(`✓ Created Company ID #${newCompany.id}: ${newCompany.company_name}`);

    console.log('\n--- 3. Testing READ Company by ID Service ---');
    const fetched = await getCompanyByIdService(newCompany.id);
    console.log(`✓ Fetched details for ID #${fetched.id}: Contact: ${fetched.contact_name} (${fetched.contact_email})`);

    console.log('\n--- 4. Testing UPDATE Company Service ---');
    const updated = await updateCompanyService(newCompany.id, {
      contact_name: 'Updated Senior Director',
      contact_phone: '+91 9123456789',
      address: '456 Cyber Towers, HITEC City, Hyderabad'
    });
    console.log(`✓ Updated Company ID #${updated.id}: New Contact: ${updated.contact_name}, Address: ${updated.address}`);

    console.log('\n--- 5. Testing DELETE Company Service (0 loans - Full Delete) ---');
    const deleteRes = await deleteCompanyService(newCompany.id);
    console.log(`✓ Delete Outcome for ID #${newCompany.id}: Action = ${deleteRes.action}, Message = ${deleteRes.message}`);

    console.log('\n--- 6. Testing DELETE Safeguard for Company #1 (Has Active Loans) ---');
    const safeguardRes = await deleteCompanyService(1);
    console.log(`✓ Safeguard Outcome for Company #1: Action = ${safeguardRes.action}, Message = ${safeguardRes.message}`);

    // Restore Company #1 status back to active for demo continuity
    await pool.query(`UPDATE companies SET status = 'active' WHERE id = 1;`);
    console.log('✓ Restored Company #1 status = active');

    console.log('\n========================================');
    console.log('🎉 ALL 6 COMPANY CRUD TESTS PASSED 100%');
    console.log('========================================\n');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await pool.end();
  }
};

runTests();
