import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

async function verifyUsers() {
  try {
    const [rows] = await pool.query('SELECT id, name, email, password_hash, is_active FROM users');
    console.log('Users in DB:');
    for (const u of rows) {
      const match123 = await bcrypt.compare('Password123!', u.password_hash);
      const matchAdmin = await bcrypt.compare('Admin@1234', u.password_hash);
      console.log(`- ID: ${u.id} | Email: ${u.email} | Match Password123!: ${match123} | Match Admin@1234: ${matchAdmin}`);
    }
  } catch (err) {
    console.error('Error verifying users:', err.message);
  }
  process.exit(0);
}

verifyUsers();
