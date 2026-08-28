import pool from '../config/db.js';

const restoreCompanyEmails = async () => {
  try {
    await pool.query(`
      UPDATE companies 
      SET contact_email = 'finance@abctech.com' 
      WHERE id = 1;
    `);
    console.log('✓ Set Company #1 contact_email = finance@abctech.com');

    await pool.query(`
      UPDATE notification_alerts 
      SET recommended_recipient = 'Rajesh Kumar <finance@abctech.com>' 
      WHERE company_id = 1;
    `);
    console.log('✓ Set notification_alerts recommended_recipient = Rajesh Kumar <finance@abctech.com>');

    const [rows] = await pool.query(`SELECT id, company_name, contact_name, contact_email FROM companies LIMIT 5;`);
    console.table(rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

restoreCompanyEmails();
