import pool from '../config/db.js';

async function checkUserSchema() {
  const [cols] = await pool.query('DESCRIBE users');
  console.log('Users columns:', cols.map(c => c.Field));
  const [rows] = await pool.query('SELECT * FROM users');
  console.log('Users:', rows.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role || u.user_role })));
  process.exit(0);
}

checkUserSchema();
