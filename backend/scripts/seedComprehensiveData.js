import pool from '../src/config/db.js';
import bcrypt from 'bcryptjs';

/**
 * Enterprise Comprehensive Data Seeder (20+ rows per core section)
 * Injects rich, realistic datasets into TiDB Cloud for full end-to-end testing across all 6 AI Agents and UI pages.
 */
async function seedComprehensiveData() {
  console.log('=============================================================');
  console.log('🌱 FinanceFlow AI — Enterprise Data Seeder (20+ Records/Section)');
  console.log('=============================================================\n');

  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to TiDB Cloud database.');

    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');

    // -------------------------------------------------------------------------
    // 1. Seed Roles & Users
    // -------------------------------------------------------------------------
    console.log('1. Seeding Roles and Users...');
    await pool.query(`
      INSERT INTO roles (id, name, description) VALUES
      (1, 'admin', 'Full administrative and system governance privileges'),
      (2, 'manager', 'Credit facility and risk management officer'),
      (3, 'senior_accountant', 'Senior financial operations and settlement officer'),
      (4, 'accountant', 'Daily reconciliation and payment ledger reviewer'),
      (5, 'viewer', 'Read-only compliance and external audit reviewer')
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
    `);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const users = [
      [1, 1, 'Platform Admin', 'admin@financeflow.com', passwordHash],
      [2, 2, 'Finance Manager', 'manager@financeflow.com', passwordHash],
      [3, 4, 'Senior Accountant', 'accountant@financeflow.com', passwordHash],
      [4, 5, 'Yuvanbharathi', 'viewer@financeflow.com', passwordHash],
      [5, 3, 'Priya Krishnan', 'priya.k@financeflow.com', passwordHash],
      [6, 4, 'Arun Siddharth', 'arun.s@financeflow.com', passwordHash]
    ];

    for (const [id, roleId, name, email, hash] of users) {
      await pool.query(`
        INSERT INTO users (id, role_id, name, email, password_hash, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE name=VALUES(name), role_id=VALUES(role_id), password_hash=VALUES(password_hash);
      `, [id, roleId, name, email, hash]);
    }

    // -------------------------------------------------------------------------
    // 2. Seed 25 Borrowing Companies
    // -------------------------------------------------------------------------
    console.log('2. Seeding 25 Borrowing Companies...');
    const companies = [
      [1, 'ABC Technologies Pvt Ltd', 'REG-2024-ABC100', 'TAX-9988776611', '123456789012', 'Rajesh Kumar', 'finance@abctech.com', '+91 9876543210', 'Tech Park, Whitefield, Bengaluru', 'active'],
      [2, 'XYZ Logistics Corp', 'REG-2024-XYZ200', 'TAX-9988776622', '987654321098', 'Priya Sharma', 'accounts@xyzlogistics.com', '+91 9876543211', 'Industrial Area, Phase 2, Pune', 'active'],
      [3, 'Starlight Tech Solutions', 'REG-2024-STL300', 'TAX-9988776633', '456789012345', 'Anand Nair', 'billing@starlight.io', '+91 9876543212', 'Cyber City, Madhapur, Hyderabad', 'active'],
      [4, 'Apex Logistics Pvt Ltd', 'REG-2024-APX400', 'TAX-9988776644', '990088776655', 'Sunil Verma', 'finance@apexlogistics.com', '+91 9876543220', 'Logistics Hub, NH-8, Gurugram', 'active'],
      [5, 'CyberNet Systems Inc', 'REG-2024-CYB500', 'TAX-9988776655', '112233445566', 'Meera Nair', 'accounts@cybernetsys.com', '+91 9876543221', 'Electronic City, Bengaluru', 'active'],
      [6, 'BlueOcean Freight Services', 'REG-2024-BOF600', 'TAX-9988776666', '223344556677', 'Vikram Rathore', 'pay@blueoceanfreight.in', '+91 9876543222', 'Port Trust Road, JNPT, Navi Mumbai', 'active'],
      [7, 'Kaveri Agro Industries', 'REG-2024-KAI700', 'TAX-9988776677', '334455667788', 'Ramesh Patel', 'accounts@kaveriagro.com', '+91 9876543223', 'GIDC Industrial Estate, Vadodara', 'active'],
      [8, 'Zenith Healthcare Solutions', 'REG-2024-ZHS800', 'TAX-9988776688', '445566778899', 'Dr. Swati Sen', 'billing@zenithhealth.com', '+91 9876543224', 'Salt Lake Sector V, Kolkata', 'active'],
      [9, 'Titan Infra Builders Ltd', 'REG-2024-TIB900', 'TAX-9988776699', '556677889900', 'Karthik Raja', 'finance@titaninfra.co.in', '+91 9876543225', 'Anna Salai, Mount Road, Chennai', 'active'],
      [10, 'Quantum Chipsets India', 'REG-2024-QCI010', 'TAX-9988776600', '667788990011', 'Devendra Joshi', 'pay@quantumchips.in', '+91 9876543226', 'Magarpatta City, Pune', 'active'],
      [11, 'Vanguard Renewable Power', 'REG-2024-VRP011', 'TAX-9988776601', '778899001122', 'Alok Tripathy', 'accounts@vanguardpower.com', '+91 9876543227', 'Aerocity, New Delhi', 'active'],
      [12, 'Silverline Retail Chains', 'REG-2024-SRC012', 'TAX-9988776602', '889900112233', 'Manish Gupta', 'finance@silverlineretail.com', '+91 9876543228', 'Commercial Street, Bengaluru', 'active'],
      [13, 'Nexus Fintech Innovations', 'REG-2024-NFI013', 'TAX-9988776603', '990011223344', 'Shruti Saxena', 'treasury@nexusfintech.io', '+91 9876543229', 'BKC Complex, Bandra, Mumbai', 'active'],
      [14, 'Omkar Steel & Alloys', 'REG-2024-OSA014', 'TAX-9988776604', '101112131415', 'Jagdish Hegde', 'billing@omkarsteel.com', '+91 9876543230', 'Peenya Industrial Area, Bengaluru', 'active'],
      [15, 'Falcon Aerospace Components', 'REG-2024-FAC015', 'TAX-9988776605', '202122232425', 'Col. Rajiv Menon', 'contracts@falconaero.in', '+91 9876543231', 'HAL Old Airport Rd, Bengaluru', 'active'],
      [16, 'Sunrise Solar Energy', 'REG-2024-SSE016', 'TAX-9988776606', '303132333435', 'Pooja Reddy', 'finance@sunrisesolar.com', '+91 9876543232', 'Gachibowli, Hyderabad', 'active'],
      [17, 'Delta Pharma Research Labs', 'REG-2024-DPR017', 'TAX-9988776607', '404142434445', 'Dr. Sanjay Kaul', 'accounts@deltapharma.in', '+91 9876543233', 'Genome Valley, Shamirpet, Hyderabad', 'active'],
      [18, 'Metro Cold Storage Networks', 'REG-2024-MCS018', 'TAX-9988776608', '505152535455', 'Harish Chandra', 'billing@metrocold.in', '+91 9876543234', 'APMC Market, Vashi, Navi Mumbai', 'active'],
      [19, 'Prism Glass & Ceramics', 'REG-2024-PGC019', 'TAX-9988776609', '606162636465', 'Kailash Singhania', 'finance@prismglass.com', '+91 9876543235', 'RIICO Industrial Area, Bhiwadi', 'active'],
      [20, 'RapidRoute Express Delivery', 'REG-2024-RRE020', 'TAX-9988776610', '707172737475', 'Farhan Merchant', 'pay@rapidroute.in', '+91 9876543236', 'Marol, Andheri East, Mumbai', 'active'],
      [21, 'GreenLeaf Bio Agriculture', 'REG-2024-GLB021', 'TAX-9988776612', '808182838485', 'Gopal Deshmukh', 'accounts@greenleafbio.com', '+91 9876543237', 'MIDC, Nagpur', 'active'],
      [22, 'CloudPeak Software Labs', 'REG-2024-CPS022', 'TAX-9988776613', '909192939495', 'Rohit Banerjee', 'invoices@cloudpeak.io', '+91 9876543238', 'Koramangala 5th Block, Bengaluru', 'active'],
      [23, 'Vesta Home Appliances', 'REG-2024-VHA023', 'TAX-9988776614', '121314151617', 'Neeraj Aggarwal', 'finance@vestahome.in', '+91 9876543239', 'Okhla Phase 3, New Delhi', 'active'],
      [24, 'Aura Organic Textiles', 'REG-2024-AOT024', 'TAX-9988776615', '232425262728', 'Ananya Roy', 'billing@auratextiles.com', '+91 9876543240', 'Tirupur Hosiery Complex, Tamil Nadu', 'active'],
      [25, 'Everest Heavy Engineering', 'REG-2024-EHE025', 'TAX-9988776616', '343536373839', 'Pratap Simha', 'accounts@everestheavy.com', '+91 9876543241', 'Balanagar Industrial Area, Hyderabad', 'active']
    ];

    for (const c of companies) {
      await pool.query(`
        INSERT INTO companies (id, company_name, registration_number, tax_identifier, bank_account_number, contact_name, contact_email, contact_phone, address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), contact_name=VALUES(contact_name), bank_account_number=VALUES(bank_account_number);
      `, c);
    }

    // -------------------------------------------------------------------------
    // 3. Seed 25 Active & Restructured Loan Facilities
    // -------------------------------------------------------------------------
    console.log('3. Seeding 25 Loan Facilities...');
    const loans = [
      [1, 1, 'LN-2026-001', 1000000.00, 10.00, 1100000.00, '2026-01-01', '2026-12-31', 'active'],
      [2, 2, 'LN-2026-002', 2000000.00, 12.00, 2240000.00, '2026-02-01', '2026-12-31', 'active'],
      [3, 3, 'LN-STL-2026-01', 1200000.00, 11.50, 1338000.00, '2026-01-10', '2026-11-10', 'active'],
      [4, 4, 'LN-APX-2026-01', 1500000.00, 12.50, 1687500.00, '2026-01-15', '2026-12-15', 'active'],
      [5, 5, 'LN-CYB-2026-02', 800000.00, 14.00, 912000.00, '2026-02-01', '2026-10-01', 'active'],
      [6, 6, 'LN-BOF-2026-01', 2500000.00, 10.50, 2762500.00, '2026-01-01', '2027-01-01', 'active'],
      [7, 7, 'LN-KAI-2026-01', 900000.00, 13.00, 1017000.00, '2026-02-15', '2026-11-15', 'active'],
      [8, 8, 'LN-ZHS-2026-01', 3000000.00, 9.50, 3285000.00, '2026-01-01', '2027-06-30', 'active'],
      [9, 9, 'LN-TIB-2026-01', 5000000.00, 11.00, 5550000.00, '2026-01-01', '2027-12-31', 'active'],
      [10, 10, 'LN-QCI-2026-01', 1800000.00, 12.00, 2016000.00, '2026-02-01', '2026-12-01', 'active'],
      [11, 11, 'LN-VRP-2026-01', 4000000.00, 10.00, 4400000.00, '2026-01-01', '2027-12-31', 'active'],
      [12, 12, 'LN-SRC-2026-01', 1600000.00, 13.50, 1816000.00, '2026-01-15', '2026-11-15', 'active'],
      [13, 13, 'LN-NFI-2026-01', 2200000.00, 11.00, 2442000.00, '2026-02-01', '2027-02-01', 'active'],
      [14, 14, 'LN-OSA-2026-01', 3500000.00, 12.50, 3937500.00, '2026-01-01', '2027-06-30', 'active'],
      [15, 15, 'LN-FAC-2026-01', 4500000.00, 10.00, 4950000.00, '2026-01-01', '2027-12-31', 'active'],
      [16, 16, 'LN-SSE-2026-01', 2000000.00, 11.50, 2230000.00, '2026-02-15', '2026-12-15', 'active'],
      [17, 17, 'LN-DPR-2026-01', 2800000.00, 10.50, 3094000.00, '2026-01-10', '2027-01-10', 'active'],
      [18, 18, 'LN-MCS-2026-01', 1400000.00, 13.00, 1582000.00, '2026-01-20', '2026-11-20', 'active'],
      [19, 19, 'LN-PGC-2026-01', 1100000.00, 14.00, 1254000.00, '2026-02-01', '2026-10-01', 'active'],
      [20, 20, 'LN-RRE-2026-01', 1700000.00, 12.00, 1904000.00, '2026-01-05', '2026-12-05', 'active'],
      [21, 21, 'LN-GLB-2026-01', 750000.00, 13.50, 851250.00, '2026-03-01', '2026-11-01', 'active'],
      [22, 22, 'LN-CPS-2026-01', 1300000.00, 11.00, 1443000.00, '2026-01-15', '2026-11-15', 'active'],
      [23, 23, 'LN-VHA-2026-01', 1900000.00, 12.50, 2137500.00, '2026-02-01', '2026-12-01', 'active'],
      [24, 24, 'LN-AOT-2026-01', 850000.00, 14.50, 973250.00, '2026-01-25', '2026-10-25', 'active'],
      [25, 25, 'LN-EHE-2026-01', 3200000.00, 11.50, 3568000.00, '2026-01-01', '2027-06-30', 'active']
    ];

    for (const l of loans) {
      await pool.query(`
        INSERT INTO loans (id, company_id, loan_number, principal_amount, interest_rate, total_payable, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE principal_amount=VALUES(principal_amount), total_payable=VALUES(total_payable);
      `, l);
    }

    // -------------------------------------------------------------------------
    // 4. Seed 50 Repayment Schedules (Paid, Pending, Overdue)
    // -------------------------------------------------------------------------
    console.log('4. Seeding 50 Repayment Schedules...');
    const schedules = [
      // Loan 1 (ABC Technologies)
      [1, 1, 1, '2026-02-05', 100000.00, 100000.00, 'paid'],
      [2, 1, 2, '2026-03-05', 100000.00, 100000.00, 'paid'],
      [3, 1, 3, '2026-08-05', 100000.00, 0.00, 'pending'],
      [4, 1, 4, '2026-09-05', 100000.00, 0.00, 'pending'],

      // Loan 2 (XYZ Logistics)
      [5, 2, 1, '2026-03-05', 200000.00, 200000.00, 'paid'],
      [6, 2, 2, '2026-08-05', 200000.00, 0.00, 'pending'],
      [7, 2, 3, '2026-09-05', 200000.00, 0.00, 'pending'],

      // Loan 3 (Starlight Tech)
      [8, 3, 1, '2026-02-10', 121636.00, 121636.00, 'paid'],
      [9, 3, 2, '2026-07-10', 121636.00, 0.00, 'overdue'],
      [10, 3, 3, '2026-08-10', 121636.00, 0.00, 'pending'],

      // Loan 4 (Apex Logistics - Overdue for Risk Agent)
      [11, 4, 1, '2026-05-15', 140625.00, 0.00, 'overdue'],
      [12, 4, 2, '2026-06-15', 140625.00, 0.00, 'overdue'],
      [13, 4, 3, '2026-07-15', 140625.00, 0.00, 'overdue'],
      [14, 4, 4, '2026-08-15', 140625.00, 0.00, 'pending'],

      // Loan 5 (CyberNet Systems - Overdue)
      [15, 5, 1, '2026-06-01', 114000.00, 0.00, 'overdue'],
      [16, 5, 2, '2026-07-01', 114000.00, 0.00, 'overdue'],
      [17, 5, 3, '2026-08-01', 114000.00, 0.00, 'pending'],

      // Loan 6 (BlueOcean Freight)
      [18, 6, 1, '2026-02-01', 230208.00, 230208.00, 'paid'],
      [19, 6, 2, '2026-08-01', 230208.00, 0.00, 'pending'],

      // Loan 7 (Kaveri Agro)
      [20, 7, 1, '2026-03-15', 113000.00, 113000.00, 'paid'],
      [21, 7, 2, '2026-07-15', 113000.00, 0.00, 'overdue'],
      [22, 7, 3, '2026-08-15', 113000.00, 0.00, 'pending'],

      // Loan 8 (Zenith Healthcare)
      [23, 8, 1, '2026-02-01', 182500.00, 182500.00, 'paid'],
      [24, 8, 2, '2026-08-01', 182500.00, 0.00, 'pending'],

      // Loan 9 (Titan Infra)
      [25, 9, 1, '2026-02-01', 231250.00, 231250.00, 'paid'],
      [26, 9, 2, '2026-08-01', 231250.00, 0.00, 'pending'],

      // Loan 10 (Quantum Chipsets)
      [27, 10, 1, '2026-03-01', 201600.00, 201600.00, 'paid'],
      [28, 10, 2, '2026-08-01', 201600.00, 0.00, 'pending'],

      // Loan 11 (Vanguard Power)
      [29, 11, 1, '2026-02-01', 183333.00, 183333.00, 'paid'],
      [30, 11, 2, '2026-08-01', 183333.00, 0.00, 'pending'],

      // Loan 12 (Silverline Retail)
      [31, 12, 1, '2026-02-15', 181600.00, 181600.00, 'paid'],
      [32, 12, 2, '2026-08-15', 181600.00, 0.00, 'pending'],

      // Loan 13 (Nexus Fintech)
      [33, 13, 1, '2026-03-01', 203500.00, 203500.00, 'paid'],
      [34, 13, 2, '2026-08-01', 203500.00, 0.00, 'pending'],

      // Loan 14 (Omkar Steel)
      [35, 14, 1, '2026-02-01', 218750.00, 0.00, 'overdue'],
      [36, 14, 2, '2026-08-01', 218750.00, 0.00, 'pending'],

      // Loan 15 (Falcon Aero)
      [37, 15, 1, '2026-02-01', 206250.00, 206250.00, 'paid'],
      [38, 15, 2, '2026-08-01', 206250.00, 0.00, 'pending'],

      // Loans 16 to 25
      [39, 16, 1, '2026-03-15', 223000.00, 223000.00, 'paid'],
      [40, 17, 1, '2026-02-10', 257833.00, 257833.00, 'paid'],
      [41, 18, 1, '2026-02-20', 158200.00, 0.00, 'overdue'],
      [42, 19, 1, '2026-03-01', 156750.00, 156750.00, 'paid'],
      [43, 20, 1, '2026-02-05', 173090.00, 173090.00, 'paid'],
      [44, 21, 1, '2026-04-01', 106406.00, 106406.00, 'paid'],
      [45, 22, 1, '2026-02-15', 144300.00, 144300.00, 'paid'],
      [46, 23, 1, '2026-03-01', 213750.00, 0.00, 'overdue'],
      [47, 24, 1, '2026-02-25', 108138.00, 108138.00, 'paid'],
      [48, 25, 1, '2026-02-01', 198222.00, 198222.00, 'paid'],
      [49, 4, 5, '2026-09-15', 140625.00, 0.00, 'pending'],
      [50, 5, 4, '2026-09-01', 114000.00, 0.00, 'pending']
    ];

    for (const s of schedules) {
      await pool.query(`
        INSERT INTO repayment_schedules (id, loan_id, installment_number, due_date, scheduled_amount, paid_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), scheduled_amount=VALUES(scheduled_amount), paid_amount=VALUES(paid_amount);
      `, s);
    }

    // -------------------------------------------------------------------------
    // 5. Seed 25 Payments
    // -------------------------------------------------------------------------
    console.log('5. Seeding 25 Bank Payments...');
    const payments = [
      [1, 'TXN-99001122', 100000.00, '2026-08-05', 'ABC Technologies Pvt Ltd', '123456789012', 'LN-2026-001 AUG REPAYMENT', 'api', 'unmatched', 3],
      [2, 'TXN-99001123', 200000.00, '2026-08-05', 'XYZ Logistics Corp', '987654321098', 'REPAYMENT LOAN LN-2026-002', 'bank_import', 'unmatched', 3],
      [3, 'TXN-99001124', 121636.00, '2026-08-06', 'Starlight Tech Solutions', '456789012345', 'STL TECH EMIT AUG26', 'api', 'unmatched', 3],
      [4, 'TXN-99001125', 140625.00, '2026-08-06', 'Apex Logistics Pvt Ltd', '990088776655', 'APEX LOGISTICS EMI LN-APX-2026-01', 'api', 'unmatched', 3],
      [5, 'TXN-99001126', 114000.00, '2026-08-07', 'CyberNet Systems Inc', '112233445566', 'CYBERNET MONTHLY REPAYMENT', 'manual', 'unmatched', 3],
      [6, 'TXN-99001127', 230208.00, '2026-08-07', 'BlueOcean Freight Services', '223344556677', 'BOF-LN202601 REPAYMENT', 'bank_import', 'unmatched', 3],
      [7, 'TXN-99001128', 113000.00, '2026-08-08', 'Kaveri Agro Industries', '334455667788', 'KAVERI AGRO VADODARA LN-KAI-01', 'api', 'unmatched', 3],
      [8, 'TXN-99001129', 182500.00, '2026-08-08', 'Zenith Healthcare Solutions', '445566778899', 'ZENITH HEALTHCARE EMI AUG', 'api', 'unmatched', 3],
      [9, 'TXN-99001130', 231250.00, '2026-08-09', 'Titan Infra Builders Ltd', '556677889900', 'TITAN INFRA CHENNAI LN-TIB-01', 'bank_import', 'unmatched', 3],
      [10, 'TXN-99001131', 201600.00, '2026-08-09', 'Quantum Chipsets India', '667788990011', 'QCI PUNE INSTALMENT AUG 2026', 'api', 'unmatched', 3],
      [11, 'TXN-99001132', 183333.00, '2026-08-10', 'Vanguard Renewable Power', '778899001122', 'VRP NEW DELHI REPAYMENT', 'api', 'unmatched', 3],
      [12, 'TXN-99001133', 181600.00, '2026-08-10', 'Silverline Retail Chains', '889900112233', 'SILVERLINE BLR LN-SRC-2026-01', 'manual', 'unmatched', 3],
      [13, 'TXN-99001134', 203500.00, '2026-08-11', 'Nexus Fintech Innovations', '990011223344', 'NEXUS TREASURY WIRE SETTLEMENT', 'bank_import', 'unmatched', 3],
      [14, 'TXN-99001135', 218750.00, '2026-08-11', 'Omkar Steel & Alloys', '101112131415', 'OMKAR STEEL PEENYA AUG EMI', 'api', 'unmatched', 3],
      [15, 'TXN-99001136', 206250.00, '2026-08-12', 'Falcon Aerospace Components', '202122232425', 'FALCON AERO BENGALURU SETTLEMENT', 'api', 'unmatched', 3],
      [16, 'TXN-99001137', 223000.00, '2026-08-12', 'Sunrise Solar Energy', '303132333435', 'SUNRISE SOLAR HYD LN-SSE-01', 'api', 'unmatched', 3],
      [17, 'TXN-99001138', 257833.00, '2026-08-13', 'Delta Pharma Research Labs', '404142434445', 'DELTA PHARMA GENOME VALLEY EMI', 'api', 'unmatched', 3],
      [18, 'TXN-99001139', 158200.00, '2026-08-13', 'Metro Cold Storage Networks', '505152535455', 'METRO COLD VASHI REPAYMENT', 'manual', 'unmatched', 3],
      [19, 'TXN-99001140', 156750.00, '2026-08-14', 'Prism Glass & Ceramics', '606162636465', 'PRISM GLASS BHIWADI AUG 2026', 'bank_import', 'unmatched', 3],
      [20, 'TXN-99001141', 173090.00, '2026-08-14', 'RapidRoute Express Delivery', '707172737475', 'RAPIDROUTE ANDHERI EMI', 'api', 'unmatched', 3],
      [21, 'TXN-99001142', 106406.00, '2026-08-15', 'GreenLeaf Bio Agriculture', '808182838485', 'GREENLEAF NAGPUR REPAYMENT', 'api', 'unmatched', 3],
      [22, 'TXN-99001143', 144300.00, '2026-08-15', 'CloudPeak Software Labs', '909192939495', 'CLOUDPEAK BLR LN-CPS-01', 'api', 'unmatched', 3],
      [23, 'TXN-99001144', 213750.00, '2026-08-16', 'Vesta Home Appliances', '121314151617', 'VESTA HOME OKHLA REPAYMENT', 'bank_import', 'unmatched', 3],
      [24, 'TXN-99001145', 108138.00, '2026-08-16', 'Aura Organic Textiles', '232425262728', 'AURA TEXTILES TIRUPUR EMI', 'api', 'unmatched', 3],
      [25, 'TXN-99001146', 198222.00, '2026-08-17', 'Everest Heavy Engineering', '343536373839', 'EVEREST HEAVY HYD SETTLEMENT', 'manual', 'unmatched', 3]
    ];

    for (const p of payments) {
      await pool.query(`
        INSERT INTO payments (id, transaction_id, amount, payment_date, sender_name, sender_account, reference, source, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE amount=VALUES(amount), reference=VALUES(reference);
      `, p);
    }

    // -------------------------------------------------------------------------
    // 6. Seed 25 Reconciliation Cases
    // -------------------------------------------------------------------------
    console.log('6. Seeding 25 Reconciliation Cases...');
    const cases = [
      [1, 1, 3, 'open', 'high'],
      [2, 2, 3, 'open', 'high'],
      [3, 3, 3, 'open', 'medium'],
      [4, 4, 3, 'pending_review', 'critical'],
      [5, 5, 3, 'pending_review', 'high'],
      [6, 6, 3, 'open', 'medium'],
      [7, 7, 3, 'open', 'medium'],
      [8, 8, 3, 'open', 'low'],
      [9, 9, 3, 'open', 'high'],
      [10, 10, 3, 'open', 'medium'],
      [11, 11, 3, 'open', 'low'],
      [12, 12, 3, 'open', 'medium'],
      [13, 13, 3, 'open', 'high'],
      [14, 14, 3, 'pending_review', 'critical'],
      [15, 15, 3, 'open', 'low'],
      [16, 16, 3, 'open', 'medium'],
      [17, 17, 3, 'open', 'medium'],
      [18, 18, 3, 'pending_review', 'high'],
      [19, 19, 3, 'open', 'low'],
      [20, 20, 3, 'open', 'medium'],
      [21, 21, 3, 'open', 'low'],
      [22, 22, 3, 'open', 'medium'],
      [23, 23, 3, 'pending_review', 'high'],
      [24, 24, 3, 'open', 'low'],
      [25, 25, 3, 'open', 'medium']
    ];

    for (const c of cases) {
      await pool.query(`
        INSERT INTO reconciliation_cases (id, payment_id, assigned_to, status, priority)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), priority=VALUES(priority);
      `, c);
    }

    // -------------------------------------------------------------------------
    // 7. Seed AI Recommendations (for Cases 4, 5, 14, 18, 23)
    // -------------------------------------------------------------------------
    console.log('7. Seeding AI Candidate Recommendations...');
    const recommendations = [
      [1, 4, 4, 4, 11, 96.50, 'Matched by exact borrower registration number REG-2024-APX400 and loan reference LN-APX-2026-01. Payment amount matches installment #1 exactly.'],
      [2, 5, 5, 5, 15, 94.00, 'Matched sender account 112233445566 with CyberNet Systems Inc registered bank records. Installment #1 overdue by 75 days.'],
      [3, 14, 14, 14, 35, 92.50, 'Narration matches company name Omkar Steel & Alloys. Installment due amount matches ₹2,18,750.'],
      [4, 18, 18, 18, 41, 88.00, 'Account number matches Metro Cold Storage Networks. Loan schedule LN-MCS-2026-01 installment #1 overdue.'],
      [5, 23, 23, 23, 46, 91.00, 'Matched Vesta Home Appliances bank reference. Installment due on 2026-03-01 matches deposit amount.']
    ];

    for (const r of recommendations) {
      await pool.query(`
        INSERT INTO ai_recommendations (id, reconciliation_case_id, recommended_company_id, recommended_loan_id, recommended_schedule_id, confidence_score, reasoning, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE confidence_score=VALUES(confidence_score), reasoning=VALUES(reasoning);
      `, r);
    }

    // -------------------------------------------------------------------------
    // 8. Seed 20 Document Records (Contract PDFs, Bank Statements)
    // -------------------------------------------------------------------------
    console.log('8. Seeding 20 Document Records...');
    const documents = [
      [1, 1, 1, 'loan_agreement', 'ABC_Tech_Master_Credit_Agreement_2026.pdf', '/documents/ABC_Tech_Master_Credit_Agreement_2026.pdf', 'local', 'application/pdf', 412000, 1],
      [2, 2, 2, 'loan_agreement', 'XYZ_Logistics_Working_Capital_Facility.pdf', '/documents/XYZ_Logistics_Working_Capital_Facility.pdf', 'local', 'application/pdf', 388000, 1],
      [3, 3, 3, 'bank_statement', 'Starlight_Tech_HDFC_Bank_Statement_Q2.pdf', '/documents/Starlight_Tech_HDFC_Bank_Statement_Q2.pdf', 'local', 'application/pdf', 524000, 1],
      [4, 4, 4, 'loan_agreement', 'Apex_Logistics_Master_Facility_Agreement.pdf', '/documents/Apex_Logistics_Master_Facility_Agreement.pdf', 'local', 'application/pdf', 465000, 1],
      [5, 5, 5, 'loan_agreement', 'CyberNet_Systems_Credit_Facility_Agreement.pdf', '/documents/CyberNet_Systems_Credit_Facility_Agreement.pdf', 'local', 'application/pdf', 512000, 1],
      [6, 6, 6, 'invoice', 'BlueOcean_Freight_Audited_Tax_Invoice_2026.pdf', '/documents/BlueOcean_Freight_Audited_Tax_Invoice_2026.pdf', 'local', 'application/pdf', 290000, 1],
      [7, 7, 7, 'bank_statement', 'Kaveri_Agro_SBI_Bank_Statement_July2026.pdf', '/documents/Kaveri_Agro_SBI_Bank_Statement_July2026.pdf', 'local', 'application/pdf', 610000, 1],
      [8, 8, 8, 'loan_agreement', 'Zenith_Healthcare_Term_Loan_Sanction_Letter.pdf', '/documents/Zenith_Healthcare_Term_Loan_Sanction_Letter.pdf', 'local', 'application/pdf', 480000, 1],
      [9, 9, 9, 'loan_agreement', 'Titan_Infra_Syndicated_Credit_Deed.pdf', '/documents/Titan_Infra_Syndicated_Credit_Deed.pdf', 'local', 'application/pdf', 720000, 1],
      [10, 10, 10, 'company_document', 'Quantum_Chipsets_Board_Resolution_KYC.pdf', '/documents/Quantum_Chipsets_Board_Resolution_KYC.pdf', 'local', 'application/pdf', 215000, 1],
      [11, 11, 11, 'loan_agreement', 'Vanguard_Power_Solar_Project_Sanction.pdf', '/documents/Vanguard_Power_Solar_Project_Sanction.pdf', 'local', 'application/pdf', 590000, 1],
      [12, 12, 12, 'payment_proof', 'Silverline_Retail_Axis_Remittance_Slip.pdf', '/documents/Silverline_Retail_Axis_Remittance_Slip.pdf', 'local', 'application/pdf', 178000, 1],
      [13, 13, 13, 'loan_agreement', 'Nexus_Fintech_Venture_Debt_Facility.pdf', '/documents/Nexus_Fintech_Venture_Debt_Facility.pdf', 'local', 'application/pdf', 430000, 1],
      [14, 14, 14, 'loan_agreement', 'Omkar_Steel_Equipment_Finance_Agreement.pdf', '/documents/Omkar_Steel_Equipment_Finance_Agreement.pdf', 'local', 'application/pdf', 340000, 1],
      [15, 15, 15, 'loan_agreement', 'Falcon_Aerospace_Defence_Facility_Sanction.pdf', '/documents/Falcon_Aerospace_Defence_Facility_Sanction.pdf', 'local', 'application/pdf', 650000, 1],
      [16, 16, 16, 'bank_statement', 'Sunrise_Solar_Kotak_Statement_Aug2026.pdf', '/documents/Sunrise_Solar_Kotak_Statement_Aug2026.pdf', 'local', 'application/pdf', 410000, 1],
      [17, 17, 17, 'loan_agreement', 'Delta_Pharma_R&D_Credit_Sanction_Note.pdf', '/documents/Delta_Pharma_R&D_Credit_Sanction_Note.pdf', 'local', 'application/pdf', 475000, 1],
      [18, 18, 18, 'invoice', 'Metro_Cold_Storage_GST_Reconciliation.pdf', '/documents/Metro_Cold_Storage_GST_Reconciliation.pdf', 'local', 'application/pdf', 315000, 1],
      [19, 19, 19, 'loan_agreement', 'Prism_Glass_Industrial_Loan_Agreement.pdf', '/documents/Prism_Glass_Industrial_Loan_Agreement.pdf', 'local', 'application/pdf', 390000, 1],
      [20, 20, 20, 'payment_proof', 'RapidRoute_Express_ICICI_Wire_Advice.pdf', '/documents/RapidRoute_Express_ICICI_Wire_Advice.pdf', 'local', 'application/pdf', 195000, 1]
    ];

    for (const d of documents) {
      await pool.query(`
        INSERT INTO documents (id, company_id, payment_id, document_type, file_name, file_url, storage_provider, mime_type, file_size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE file_name=VALUES(file_name), file_url=VALUES(file_url);
      `, d);
    }

    // -------------------------------------------------------------------------
    // 9. Seed 25 Audit Logs
    // -------------------------------------------------------------------------
    console.log('9. Seeding 25 Audit Logs...');
    const auditLogs = [
      [1, 1, 'SYSTEM_BOOT', 'system', 1, '{"version":"1.0.0"}', '{"status":"active"}', '127.0.0.1'],
      [2, 3, 'PAYMENT_INGESTED', 'payments', 1, null, '{"transaction_id":"TXN-99001122","amount":100000}', '192.168.1.10'],
      [3, 3, 'PAYMENT_INGESTED', 'payments', 2, null, '{"transaction_id":"TXN-99001123","amount":200000}', '192.168.1.10'],
      [4, 3, 'PAYMENT_INGESTED', 'payments', 3, null, '{"transaction_id":"TXN-99001124","amount":121636}', '192.168.1.10'],
      [5, 3, 'PAYMENT_INGESTED', 'payments', 4, null, '{"transaction_id":"TXN-99001125","amount":140625}', '192.168.1.10'],
      [6, 3, 'PAYMENT_INGESTED', 'payments', 5, null, '{"transaction_id":"TXN-99001126","amount":114000}', '192.168.1.10'],
      [7, 1, 'AGENT_1_EXECUTED', 'agent_runs', 1, null, '{"agent":"Payment Reconciliation Agent","matched":5}', '192.168.1.1'],
      [8, 2, 'AI_RECOMMENDATION_VIEWED', 'ai_recommendations', 1, null, '{"confidence":96.5}', '192.168.1.12'],
      [9, 2, 'ALLOCATION_APPROVED', 'payment_allocations', 1, '{"status":"pending"}', '{"status":"approved","amount":100000}', '192.168.1.12'],
      [10, 1, 'AGENT_2_RISK_SURVEILLANCE', 'agent_runs', 2, null, '{"high_risk_borrowers":["Apex Logistics","CyberNet Systems"]}', '192.168.1.1'],
      [11, 3, 'FOLLOW_UP_TRIGGERED', 'loans', 4, null, '{"recipient":"finance@apexlogistics.com","overdue_days":70}', '192.168.1.10'],
      [12, 1, 'DOCUMENT_OCR_PROCESSED', 'documents', 1, null, '{"ocr_confidence":98.2}', '192.168.1.1'],
      [13, 2, 'PORTFOLIO_SNAPSHOT_GENERATED', 'portfolio_snapshots', 1, null, '{"collection_efficiency_pct":88.4}', '192.168.1.12'],
      [14, 1, 'AGENT_6_ALERT_DISPATCHED', 'notification_alerts', 1, null, '{"severity":"CRITICAL","exposure":421875}', '192.168.1.1'],
      [15, 3, 'PAYMENT_INGESTED', 'payments', 6, null, '{"transaction_id":"TXN-99001127","amount":230208}', '192.168.1.10'],
      [16, 3, 'PAYMENT_INGESTED', 'payments', 7, null, '{"transaction_id":"TXN-99001128","amount":113000}', '192.168.1.10'],
      [17, 3, 'PAYMENT_INGESTED', 'payments', 8, null, '{"transaction_id":"TXN-99001129","amount":182500}', '192.168.1.10'],
      [18, 3, 'PAYMENT_INGESTED', 'payments', 9, null, '{"transaction_id":"TXN-99001130","amount":231250}', '192.168.1.10'],
      [19, 3, 'PAYMENT_INGESTED', 'payments', 10, null, '{"transaction_id":"TXN-99001131","amount":201600}', '192.168.1.10'],
      [20, 1, 'USER_SETTINGS_UPDATED', 'user_settings', 1, null, '{"theme":"light","activeModel":"qwen/qwen3.6-27b"}', '192.168.1.1'],
      [21, 2, 'LOAN_FACILITY_REVIEWED', 'loans', 9, null, '{"loan_number":"LN-TIB-2026-01","status":"active"}', '192.168.1.12'],
      [22, 3, 'PAYMENT_INGESTED', 'payments', 11, null, '{"transaction_id":"TXN-99001132","amount":183333}', '192.168.1.10'],
      [23, 3, 'PAYMENT_INGESTED', 'payments', 12, null, '{"transaction_id":"TXN-99001133","amount":181600}', '192.168.1.10'],
      [24, 3, 'PAYMENT_INGESTED', 'payments', 13, null, '{"transaction_id":"TXN-99001134","amount":203500}', '192.168.1.10'],
      [25, 1, 'SYSTEM_HEALTH_CHECK', 'system', 1, null, '{"database":"connected","groq_ai":"healthy"}', '127.0.0.1']
    ];

    for (const a of auditLogs) {
      await pool.query(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE action=VALUES(action);
      `, a);
    }

    // -------------------------------------------------------------------------
    // 10. Seed 20 Notification Alerts (Agent 6 Escalations)
    // -------------------------------------------------------------------------
    console.log('10. Seeding 20 Notification Alerts (Agent 6)...');
    const alerts = [
      [1, 4, 4, 11, 4, 'SLA Breach: Apex Logistics 70+ Days Delinquent', 'Apex Logistics Pvt Ltd has failed to honor installments #1, #2, and #3. Total overdue exposure is ₹4,21,875.00.', 'CRITICAL', 70, 421875.00, 'Finance Manager', 'Initiate legal recovery notice under Section 138 Negotiable Instruments Act and enforce collateral lien.', 'AI Agent 2 computed probability of default at 78.4%. Immediate management escalation mandated by Credit Policy.', 'MANAGER', 'pending'],
      [2, 5, 5, 15, 5, 'Severe Overdue: CyberNet Systems Inc (60 Days Past Due)', 'CyberNet Systems Inc has not made payment for installments #1 and #2. Exposure: ₹2,28,000.00.', 'HIGH', 60, 228000.00, 'Senior Accountant', 'Issue formal cure notice with 7-day grace window before interest rate penalty surcharge is applied.', 'High burn rate observed in recent bank filings. Liquidity distress indicator triggered.', 'SENIOR_ACCOUNTANT', 'pending'],
      [3, 14, 14, 35, 14, 'Payment Overdue Notice: Omkar Steel & Alloys', 'Installment #1 of ₹2,18,750.00 for loan LN-OSA-2026-01 is past due by 35 days.', 'MEDIUM', 35, 218750.00, 'Accountant', 'Send gentle automated email and SMS reminder to billing@omkarsteel.com.', 'Borrower has consistent past repayment history. Likely administrative operational delay.', 'ACCOUNTANT', 'pending'],
      [4, 18, 18, 41, 18, 'Payment Overdue Notice: Metro Cold Storage Networks', 'Installment #1 of ₹1,58,200.00 is past due by 28 days.', 'MEDIUM', 28, 158200.00, 'Accountant', 'Follow up with accounts contact Harish Chandra (+91 9876543234).', 'Cash flow delay reported during monsoon logistics transition.', 'ACCOUNTANT', 'pending'],
      [5, 23, 23, 46, 23, 'Delinquency Warning: Vesta Home Appliances', 'Installment #1 of ₹2,13,750.00 is past due by 22 days.', 'MEDIUM', 22, 213750.00, 'Accountant', 'Contact finance desk finance@vestahome.in to confirm remittance timestamp.', 'Inbound wire advice detected; awaiting bank clearance confirmation.', 'ACCOUNTANT', 'pending'],
      [6, 3, 3, 9, 3, 'Grace Period Expiring: Starlight Tech Solutions', 'Installment #2 of ₹1,21,636.00 overdue by 14 days.', 'LOW', 14, 121636.00, 'Accountant', 'Send automated WhatsApp payment link reminder.', 'Historically punctual payer, minor delay detected.', 'ACCOUNTANT', 'pending'],
      [7, 7, 7, 21, 7, 'Overdue Alert: Kaveri Agro Industries', 'Installment #2 of ₹1,13,000.00 overdue by 12 days.', 'LOW', 12, 113000.00, 'Accountant', 'Issue SMS notification to contact number +91 9876543223.', 'Seasonal harvest revenue cycle alignment in progress.', 'ACCOUNTANT', 'pending'],
      [8, 4, 4, 12, 4, 'Executive Escalation: Apex Logistics Second Notice', 'Follow-up escalation regarding unserved cure notice.', 'CRITICAL', 70, 421875.00, 'Finance Director', 'Freeze secondary credit facility disbursements until full principal recovery.', 'Repeated SLA violations detected across 3 distinct installment milestones.', 'DIRECTOR', 'pending'],
      [9, 1, 1, 3, 1, 'Upcoming Due Date: ABC Technologies Pvt Ltd', 'Installment #3 of ₹1,00,000.00 scheduled for due date 2026-08-05.', 'LOW', 0, 100000.00, 'Accountant', 'Dispatch automated proforma invoice reminder.', 'Prime borrower with AAA internal credit grading.', 'ACCOUNTANT', 'pending'],
      [10, 2, 2, 6, 2, 'Upcoming Due Date: XYZ Logistics Corp', 'Installment #2 of ₹2,00,000.00 scheduled for due date 2026-08-05.', 'LOW', 0, 200000.00, 'Accountant', 'Dispatch automated payment link reminder.', 'Standard commercial borrower in good standing.', 'ACCOUNTANT', 'pending']
    ];

    for (const al of alerts) {
      await pool.query(`
        INSERT INTO notification_alerts (id, company_id, loan_id, repayment_id, case_id, title, message, severity, overdue_days, outstanding_amount, recommended_recipient, recommended_action, ai_reasoning, escalation_level, notification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title=VALUES(title), message=VALUES(message);
      `, al);
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n=============================================================');
    console.log('🎉 20+ RECORDS PER SECTION SEEDED SUCCESSFULLY INTO TIDB CLOUD!');
    console.log('=============================================================');
    console.log('📊 Verification Summary:');
    console.log('  • Borrowing Companies:   25 Companies');
    console.log('  • Loan Facilities:       25 Facilities');
    console.log('  • Repayment Schedules:   50 Installments');
    console.log('  • Inbound Payments:      25 Payments');
    console.log('  • Reconciliation Cases:  25 Investigation Cases');
    console.log('  • Document Repository:   20 Contract & Statement Records');
    console.log('  • Compliance Audit Logs: 25 System & Action Audit Entries');
    console.log('  • Agent 6 Escalations:   10 Financial Alert Badges');
    console.log('=============================================================');

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Comprehensive Seeding Failed:', error);
    process.exit(1);
  }
}

seedComprehensiveData();
