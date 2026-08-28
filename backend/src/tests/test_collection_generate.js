import pool from '../config/db.js';
import { generateCollectionReminderService } from '../services/collection.service.js';

const testGenerate = async () => {
  try {
    console.log('Testing generateCollectionReminderService for Company #1...');
    const result = await generateCollectionReminderService(1);
    console.log('✓ Success! Generated notice:');
    console.log('Subject:', result.subject);
    console.log('Total Overdue Amount:', result.total_overdue_amount);
    console.log('Overdue Milestones Count:', result.overdue_installments?.length);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

testGenerate();
