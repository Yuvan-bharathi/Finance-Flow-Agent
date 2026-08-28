import pool from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function seedRequestedUsers() {
  try {
    console.log('🔄 Connecting to TiDB Cloud database...');

    // 1. Ensure roles 'owner' and 'super_admin' exist in roles table
    const [existingRoles] = await pool.query('SELECT id, name FROM roles');
    console.log('Current roles in database:', existingRoles);

    let ownerRole = existingRoles.find(r => r.name.toLowerCase() === 'owner');
    let superAdminRole = existingRoles.find(r => r.name.toLowerCase() === 'super_admin' || r.name.toLowerCase() === 'super admin');

    let ownerRoleId = ownerRole?.id;
    let superAdminRoleId = superAdminRole?.id;

    if (!ownerRoleId) {
      const [res] = await pool.query(`INSERT INTO roles (name, description) VALUES ('owner', 'Owner - Full system & billing control')`);
      ownerRoleId = res.insertId;
      console.log(`✅ Created 'owner' role with ID: ${ownerRoleId}`);
    } else {
      console.log(`ℹ️ Found existing 'owner' role with ID: ${ownerRoleId}`);
    }

    if (!superAdminRoleId) {
      const [res] = await pool.query(`INSERT INTO roles (name, description) VALUES ('super_admin', 'Super Admin - Elevated administrative privileges')`);
      superAdminRoleId = res.insertId;
      console.log(`✅ Created 'super_admin' role with ID: ${superAdminRoleId}`);
    } else {
      console.log(`ℹ️ Found existing 'super_admin' role with ID: ${superAdminRoleId}`);
    }

    // 2. Hash password "Password123!"
    const rawPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 3. User 1: yuvanbharathin@gmail.com -> Owner
    const email1 = 'yuvanbharathin@gmail.com';
    const name1 = 'Yuvan Bharathi (Owner)';

    const [u1] = await pool.query('SELECT id FROM users WHERE email = ?', [email1]);
    if (u1.length > 0) {
      await pool.query(
        'UPDATE users SET role_id = ?, password_hash = ?, is_active = 1 WHERE email = ?',
        [ownerRoleId, passwordHash, email1]
      );
      console.log(`✅ Updated existing user ${email1} with Owner role.`);
    } else {
      await pool.query(
        'INSERT INTO users (role_id, name, email, password_hash, is_active) VALUES (?, ?, ?, ?, 1)',
        [ownerRoleId, name1, email1, passwordHash]
      );
      console.log(`✅ Created new user ${email1} with Owner role.`);
    }

    // 4. User 2: nyuvanbharathi@gmail.com -> Super Admin
    const email2 = 'nyuvanbharathi@gmail.com';
    const name2 = 'N Yuvan Bharathi (Super Admin)';

    const [u2] = await pool.query('SELECT id FROM users WHERE email = ?', [email2]);
    if (u2.length > 0) {
      await pool.query(
        'UPDATE users SET role_id = ?, password_hash = ?, is_active = 1 WHERE email = ?',
        [superAdminRoleId, passwordHash, email2]
      );
      console.log(`✅ Updated existing user ${email2} with Super Admin role.`);
    } else {
      await pool.query(
        'INSERT INTO users (role_id, name, email, password_hash, is_active) VALUES (?, ?, ?, ?, 1)',
        [superAdminRoleId, name2, email2, passwordHash]
      );
      console.log(`✅ Created new user ${email2} with Super Admin role.`);
    }

    // 5. Verification output
    const [finalUsers] = await pool.query(`
      SELECT u.id, u.name, u.email, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.email IN (?, ?)
    `, [email1, email2]);

    console.log('\n🎉 Successfully seeded requested users in TiDB Cloud:');
    console.table(finalUsers);

  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedRequestedUsers();
