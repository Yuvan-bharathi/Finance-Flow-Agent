import pool from '../src/config/db.js';

async function runMigration() {
  console.log('🔄 Connecting to TiDB Cloud to alter `users` table...');

  try {
    // Add reset_token column if missing
    try {
      await pool.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL;');
      console.log('✅ Added column `reset_token` to `users` table.');
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log('ℹ️ Column `reset_token` already exists.');
      } else {
        throw e;
      }
    }

    // Add reset_token_expires column if missing
    try {
      await pool.query('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL;');
      console.log('✅ Added column `reset_token_expires` to `users` table.');
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log('ℹ️ Column `reset_token_expires` already exists.');
      } else {
        throw e;
      }
    }

    console.log('\n🎉 Migration finished successfully! `users` table schema is up to date.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
