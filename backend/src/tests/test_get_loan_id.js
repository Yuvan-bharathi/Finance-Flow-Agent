import pool from '../config/db.js';
import { getLoanByIdService } from '../services/loan.service.js';

const testGetLoan = async () => {
  try {
    console.log('Testing getLoanByIdService(1)...');
    const result = await getLoanByIdService(1);
    console.log('Success! Result:', result);
  } catch (err) {
    console.error('Error in getLoanByIdService:', err);
  } finally {
    await pool.end();
  }
};

testGetLoan();
