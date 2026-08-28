import pool from '../config/db.js';

const updateCompanyContactEmail = async () => {
  try {
    console.log('Updating Company #1 contact_email to yuvanbharathin@gmail.com...');
    await pool.query(`
      UPDATE companies 
      SET contact_email = 'yuvanbharathin@gmail.com' 
      WHERE id = 1;
    `);
    console.log('✓ Company #1 contact_email set to yuvanbharathin@gmail.com');

    const [rows] = await pool.query(`SELECT id, company_name, contact_name, contact_email FROM companies WHERE id = 1;`);
    console.table(rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

updateCompanyContactEmail();
