import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

async function setSeedPasswords() {
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    console.log('Generated Bcrypt Hash for Password123!:', passwordHash);

    await pool.query(`
      UPDATE users 
      SET password_hash = ?
      WHERE email IN ('admin@financeflow.com', 'manager@financeflow.com', 'accountant@financeflow.com', 'viewer@financeflow.com')
    `, [passwordHash]);

    console.log('✅ Updated all users in DB to password "Password123!"');

    const [users] = await pool.query('SELECT id, name, email FROM users');
    console.log('Current DB Users:', users);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

setSeedPasswords();
