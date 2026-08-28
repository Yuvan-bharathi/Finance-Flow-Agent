import pool from '../config/db.js';

const showUsers = async () => {
  const [cols] = await pool.query(`DESCRIBE users;`);
  console.log('users columns:', cols.map(c => c.Field));
  const [users] = await pool.query(`SELECT id, email, role_id FROM users;`);
  console.log('users:', users);
  await pool.end();
};

showUsers();
