import pool from '../config/db.js';
import { findAllLoans } from '../models/loan.model.js';
import { findAllCompanies } from '../models/company.model.js';

const test = async () => {
  console.log('Testing clean database state:');
  const companies = await findAllCompanies();
  console.log(`✓ Total canonical companies: ${companies.length}`);
  console.table(companies.slice(0, 10).map(c => ({ id: c.id, name: c.company_name, reg: c.registration_number })));

  const loans = await findAllLoans();
  console.log(`✓ Total canonical loans: ${loans.length}`);
  console.table(loans.slice(0, 10).map(l => ({
    loan: l.loan_number,
    company: l.company_name,
    principal: l.principal_amount,
    progress: `${l.paid_installments}/${l.total_installments} (${l.progress_percentage}%)`,
    health: l.health_status
  })));

  await pool.end();
};

test();
