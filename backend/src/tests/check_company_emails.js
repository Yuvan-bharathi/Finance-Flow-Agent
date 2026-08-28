import pool from '../config/db.js';

const checkCompanyEmails = async () => {
  try {
    const [companies] = await pool.query(`
      SELECT id, company_name, contact_name, contact_email 
      FROM companies 
      LIMIT 10;
    `);
    console.table(companies);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

checkCompanyEmails();
