import pool from '../config/db.js';

const inspect = async () => {
  const [companies] = await pool.query(`
    SELECT id, company_name, registration_number, contact_name, contact_email, created_at
    FROM companies
    ORDER BY id ASC;
  `);
  console.log(`Found ${companies.length} companies:`);
  console.table(companies.map(c => ({ id: c.id, name: c.company_name, reg: c.registration_number })));

  const [loans] = await pool.query(`
    SELECT l.id, l.company_id, c.company_name, l.loan_number, l.principal_amount, l.interest_rate, l.status
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    ORDER BY l.id ASC;
  `);
  console.log(`Found ${loans.length} loans:`);
  console.table(loans.map(l => ({ id: l.id, company: l.company_name, loan_number: l.loan_number, principal: l.principal_amount })));

  await pool.end();
};

inspect();
