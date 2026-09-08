import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const companiesData = [
  {
    fileName: 'Loan_Agreement_CyberNet_Systems.pdf',
    docxName: 'Loan_Agreement_CyberNet_Systems.docx',
    borrowerName: 'CYBERNET SYSTEMS INC',
    displayBorrower: 'CyberNet Systems Inc',
    regNo: 'REG-2024-CYB500',
    pan: 'TAX-1122334455',
    address: 'Cyber City, Phase 2, Whitefield, Bengaluru, Karnataka – 560066',
    director: 'Mr. Vikram Aditya',
    directorTitle: 'Managing Director (DIN: 08472911)',
    facilityRef: 'LN-CYB-2026-01',
    facilityType: 'Secured Enterprise Cloud Infrastructure & Server Term Loan',
    principalAmount: '18,00,000.00',
    principalWords: 'Eighteen Lakhs Only',
    interestRate: '11.75% p.a.',
    penaltyRate: '2.00% / month',
    tenure: '12 Months (15 Jan 2026 to 15 Dec 2026)',
    principalPerMonth: 150000,
    interestPerMonth: 17625,
    emiAmount: '1,67,625.00',
    dueDay: '15th of each month',
    dueDayNumber: 15,
    bankAccount: '112233445566',
    ifsc: 'HDFC0004521',
    bankName: 'HDFC Bank Ltd',
    collateral: 'First Pari-Passu Charge on Cloud Computing Hardware, Data Center Servers, and Enterprise SaaS Receivables',
    guarantor: 'Mr. Vikram Aditya, Managing Director',
    jurisdiction: 'Bengaluru, Karnataka, India',
    date: '15th January 2026',
    startMonth: 1, // Feb
    startYear: 2026
  },
  {
    fileName: 'Loan_Agreement_BlueOcean_Freight.pdf',
    docxName: 'Loan_Agreement_BlueOcean_Freight.docx',
    borrowerName: 'BLUEOCEAN FREIGHT SERVICES PRIVATE LIMITED',
    displayBorrower: 'BlueOcean Freight Services',
    regNo: 'REG-2024-BOF600',
    pan: 'TAX-2233445566',
    address: 'Port Gateway Terminal, Marine Drive, Kochi, Kerala – 682001',
    director: 'Capt. Sameer Merchant',
    directorTitle: 'Managing Director (DIN: 07391824)',
    facilityRef: 'LN-BOF-2026-02',
    facilityType: 'Secured Coastal Container Fleet & Marine Logistics Term Loan',
    principalAmount: '25,00,000.00',
    principalWords: 'Twenty-Five Lakhs Only',
    interestRate: '12.25% p.a.',
    penaltyRate: '2.50% / month',
    tenure: '12 Months (15 Jan 2026 to 15 Dec 2026)',
    principalPerMonth: 208333.33,
    interestPerMonth: 25520.83,
    emiAmount: '2,33,854.16',
    dueDay: '15th of each month',
    dueDayNumber: 15,
    bankAccount: '223344556677',
    ifsc: 'SBIN0008921',
    bankName: 'State Bank of India',
    collateral: 'First Pari-Passu Charge on Coastal Container Vessels, Cargo Handling Cranes, and Port Receivables',
    guarantor: 'Capt. Sameer Merchant, Managing Director',
    jurisdiction: 'Kochi / Ernakulam, Kerala, India',
    date: '15th January 2026',
    startMonth: 1,
    startYear: 2026
  },
  {
    fileName: 'Loan_Agreement_Kaveri_Agro.pdf',
    docxName: 'Loan_Agreement_Kaveri_Agro.docx',
    borrowerName: 'KAVERI AGRO INDUSTRIES PRIVATE LIMITED',
    displayBorrower: 'Kaveri Agro Industries',
    regNo: 'REG-2024-KAI700',
    pan: 'TAX-3344556677',
    address: 'Agri Processing Park, NH-44, Madurai, Tamil Nadu – 625020',
    director: 'Mrs. Radhika Swaminathan',
    directorTitle: 'Managing Director (DIN: 09182736)',
    facilityRef: 'LN-KAI-2026-03',
    facilityType: 'Secured Cold-Chain Grain Storage & Food Processing Term Loan',
    principalAmount: '12,00,000.00',
    principalWords: 'Twelve Lakhs Only',
    interestRate: '9.50% p.a.',
    penaltyRate: '1.75% / month',
    tenure: '12 Months (15 Jan 2026 to 15 Dec 2026)',
    principalPerMonth: 100000,
    interestPerMonth: 9500,
    emiAmount: '1,09,500.00',
    dueDay: '15th of each month',
    dueDayNumber: 15,
    bankAccount: '334455667788',
    ifsc: 'ICIC0001044',
    bankName: 'ICICI Bank Ltd',
    collateral: 'First Pari-Passu Charge on Automated Food Processing Equipment, Silos, and Trade Book Debts',
    guarantor: 'Mrs. Radhika Swaminathan, Managing Director',
    jurisdiction: 'Madurai / Chennai, Tamil Nadu, India',
    date: '15th January 2026',
    startMonth: 1,
    startYear: 2026
  },
  {
    fileName: 'Loan_Agreement_Quantum_Chipsets.pdf',
    docxName: 'Loan_Agreement_Quantum_Chipsets.docx',
    borrowerName: 'QUANTUM CHIPSETS INDIA PRIVATE LIMITED',
    displayBorrower: 'Quantum Chipsets India',
    regNo: 'REG-2024-QCI800',
    pan: 'TAX-6677889900',
    address: 'Semiconductor Fabrication Park, HITEC City, Hyderabad, Telangana – 500081',
    director: 'Dr. Anand Krishnamurthy',
    directorTitle: 'Chief Executive Officer (DIN: 06294719)',
    facilityRef: 'LN-QCI-2026-04',
    facilityType: 'Secured Semiconductor Clean-Room Fabrication Term Loan',
    principalAmount: '35,00,000.00',
    principalWords: 'Thirty-Five Lakhs Only',
    interestRate: '10.50% p.a.',
    penaltyRate: '2.25% / month',
    tenure: '12 Months (15 Jan 2026 to 15 Dec 2026)',
    principalPerMonth: 291666.67,
    interestPerMonth: 30625.00,
    emiAmount: '3,22,291.67',
    dueDay: '15th of each month',
    dueDayNumber: 15,
    bankAccount: '667788990011',
    ifsc: 'UTIB0002190',
    bankName: 'Axis Bank Ltd',
    collateral: 'First Pari-Passu Charge on Clean-Room Photolithography Equipment, Semiconductor Patents, and Receivables',
    guarantor: 'Dr. Anand Krishnamurthy, CEO',
    jurisdiction: 'Hyderabad, Telangana, India',
    date: '15th January 2026',
    startMonth: 1,
    startYear: 2026
  },
  {
    fileName: 'Loan_Agreement_Nexus_Fintech.pdf',
    docxName: 'Loan_Agreement_Nexus_Fintech.docx',
    borrowerName: 'NEXUS FINTECH INNOVATIONS PRIVATE LIMITED',
    displayBorrower: 'Nexus Fintech Innovations',
    regNo: 'REG-2024-NFI900',
    pan: 'TAX-9900112233',
    address: 'Fintech Tower, Level 8, BKC, Bandra East, Mumbai, Maharashtra – 400051',
    director: 'Ms. Ananya Sengupta',
    directorTitle: 'Chief Technology Officer (DIN: 08392014)',
    facilityRef: 'LN-NFI-2026-05',
    facilityType: 'Secured Neo-Banking Core API Infrastructure Term Loan',
    principalAmount: '22,00,000.00',
    principalWords: 'Twenty-Two Lakhs Only',
    interestRate: '11.00% p.a.',
    penaltyRate: '2.00% / month',
    tenure: '12 Months (15 Jan 2026 to 15 Dec 2026)',
    principalPerMonth: 183333.33,
    interestPerMonth: 20166.67,
    emiAmount: '2,03,500.00',
    dueDay: '15th of each month',
    dueDayNumber: 15,
    bankAccount: '990011223344',
    ifsc: 'KKBK0009812',
    bankName: 'Kotak Mahindra Bank',
    collateral: 'First Pari-Passu Charge on API Infrastructure Server Nodes, Escrow Float, and Customer Receivables',
    guarantor: 'Ms. Ananya Sengupta, CTO',
    jurisdiction: 'Mumbai, Maharashtra, India',
    date: '15th January 2026',
    startMonth: 1,
    startYear: 2026
  }
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const outputDir = path.resolve('../test_loan_agreements');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📄 Generating 5 Pristine Multi-Page Loan Agreement PDF Documents with Amortization Tables...');

for (const c of companiesData) {
  const filePath = path.join(outputDir, c.fileName);
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // --- PAGE 1 ---

  // Top Header Bar
  doc.rect(40, 40, 515, 55).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold').text('FINANCEFLOW CAPITAL', 55, 50);
  doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica').text('Corporate & Commercial Lending Division', 55, 70);
  doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text(`FACILITY REF: ${c.facilityRef}`, 340, 60, { align: 'right', width: 200 });

  // Title
  doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('MASTER WORKING CAPITAL FACILITY AGREEMENT', 40, 110, { align: 'center' });
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`Executed on ${c.date}  |  Jurisdiction: ${c.jurisdiction}`, 40, 128, { align: 'center' });

  // Metrics Box
  const boxTop = 145;
  doc.rect(40, boxTop, 515, 48).fillAndStroke('#f8fafc', '#cbd5e1');
  
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('PRINCIPAL FACILITY', 55, boxTop + 8);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`Rs. ${c.principalAmount}`, 55, boxTop + 22);

  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('ANNUAL INTEREST', 230, boxTop + 8);
  doc.fillColor('#0284c7').fontSize(11).font('Helvetica-Bold').text(c.interestRate, 230, boxTop + 22);

  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('DEFAULT PENALTY', 400, boxTop + 8);
  doc.fillColor('#dc2626').fontSize(11).font('Helvetica-Bold').text(c.penaltyRate, 400, boxTop + 22);

  // Section 1: Parties & Details
  let y = boxTop + 60;
  doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('1. PARTIES & DETAILS', 40, y);
  y += 14;
  doc.fillColor('#334155').fontSize(8).font('Helvetica');
  doc.text(`1. LENDER: FINANCEFLOW CAPITAL NBFC PRIVATE LIMITED, registered under the Reserve Bank of India Act, 1934, CIN U65923MH2020PTC345678, corporate office at Level 14, Tower B, Financial Centre, Bandra Kurla Complex (BKC), Mumbai – 400051.`, 40, y, { width: 515, lineGap: 2 });
  y += 26;
  doc.text(`2. BORROWER: ${c.borrowerName}, Registration Number ${c.regNo}, PAN ${c.pan}, registered office at ${c.address}, represented by Managing Director ${c.director}.`, 40, y, { width: 515, lineGap: 2 });
  y += 28;

  // Recitals
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('RECITALS', 40, y);
  y += 12;
  doc.fillColor('#475569').fontSize(7.8).font('Helvetica');
  doc.text(`WHEREAS, Borrower is engaged in commercial operations and business expansion.`, 40, y, { width: 515 }); y += 11;
  doc.text(`WHEREAS, Borrower has approached Lender for a secured Working Capital Term Loan Facility to fund expansion and receivables.`, 40, y, { width: 515 }); y += 11;
  doc.text(`WHEREAS, Lender has sanctioned the Credit Facility subject to the terms and covenants contained herein.`, 40, y, { width: 515 }); y += 18;

  // Section 2: Key Terms & Parameters
  doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('2. KEY TERMS & FACILITY PARAMETERS', 40, y);
  y += 13;
  doc.fillColor('#334155').fontSize(8).font('Helvetica');
  doc.text(`• Facility Type: ${c.facilityType}`, 45, y); y += 11;
  doc.text(`• Sanctioned Amount: Rs. ${c.principalAmount} (Indian Rupees ${c.principalWords})`, 45, y); y += 11;
  doc.text(`• Rate of Interest: ${c.interestRate} (Reducing balance basis)`, 45, y); y += 11;
  doc.text(`• Default Penalty Rate: ${c.penaltyRate} on overdue amounts`, 45, y); y += 11;
  doc.text(`• Tenure: ${c.tenure}`, 45, y); y += 11;
  doc.text(`• Disbursement Account: ${c.bankName} | Account No: ${c.bankAccount} | IFSC: ${c.ifsc}`, 45, y); y += 18;

  // Amortization Schedule Table Title
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('AMORTIZATION & REPAYMENT SCHEDULE', 40, y);
  y += 14;

  // Table Header
  doc.rect(40, y, 515, 16).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
  doc.text('Installment', 45, y + 4);
  doc.text('Due Date', 115, y + 4);
  doc.text('Principal (Rs.)', 195, y + 4, { align: 'right', width: 80 });
  doc.text('Interest (Rs.)', 285, y + 4, { align: 'right', width: 75 });
  doc.text('Total EMI (Rs.)', 370, y + 4, { align: 'right', width: 85 });
  doc.text('Balance (Rs.)', 465, y + 4, { align: 'right', width: 85 });
  y += 16;

  // Table Rows (12 EMIs)
  let currentBalance = parseFloat(c.principalAmount.replace(/,/g, ''));
  const pPerMonth = currentBalance / 12;
  const iPerMonth = (currentBalance * (parseFloat(c.interestRate) / 100)) / 12;
  const emiVal = pPerMonth + iPerMonth;

  for (let i = 1; i <= 12; i++) {
    const isEven = i % 2 === 0;
    doc.rect(40, y, 515, 13.5).fill(isEven ? '#f8fafc' : '#ffffff');

    const dMonth = (c.startMonth + i - 1) % 12;
    const dYear = c.startYear + Math.floor((c.startMonth + i - 1) / 12);
    const dueDateStr = `${c.dueDayNumber} ${months[dMonth]} ${dYear}`;

    currentBalance = Math.max(0, currentBalance - pPerMonth);

    doc.fillColor('#0f172a').fontSize(7).font('Helvetica');
    doc.text(`EMI-${i < 10 ? '0' + i : i}`, 45, y + 3);
    doc.text(dueDateStr, 115, y + 3);
    doc.text(pPerMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, y + 3, { align: 'right', width: 80 });
    doc.text(iPerMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 285, y + 3, { align: 'right', width: 75 });
    doc.fillColor('#4338ca').font('Helvetica-Bold');
    doc.text(emiVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 370, y + 3, { align: 'right', width: 85 });
    doc.fillColor('#475569').font('Helvetica');
    doc.text(currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 465, y + 3, { align: 'right', width: 85 });

    y += 13.5;
  }

  // --- PAGE 2 ---
  doc.addPage();
  y = 45;

  // Header Bar Page 2
  doc.rect(40, y, 515, 30).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('FINANCEFLOW CAPITAL NBFC — FACILITY AGREEMENT', 55, y + 10);
  doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold').text(`REF: ${c.facilityRef}`, 340, y + 10, { align: 'right', width: 200 });
  y += 45;

  // Section 3: Key Covenants & Governance Clauses
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('3. KEY COVENANTS & GOVERNANCE CLAUSES', 40, y);
  y += 16;
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica');

  doc.text(`• Clause 4.1 (Priority Waterfall Settlement): All payment collections ingested from the Borrower shall be applied strictly in sequence: (i) Legal & Out-of-pocket enforcement expenses, (ii) Default Penalty Charges & Late Fees, (iii) Accrued Interest Due, and (iv) Principal Amortization.`, 45, y, { width: 510, lineGap: 3 });
  y += 34;

  doc.text(`• Clause 7.2 (Events of Default): Non-payment exceeding 30 consecutive calendar days, dishonor of NACH mandate, or insolvency/bankruptcy filings under IBC 2016 shall trigger default acceleration.`, 45, y, { width: 510, lineGap: 3 });
  y += 28;

  doc.text(`• Clause 8.2 (Charge & Hypothecation): The Facility is secured by a first pari-passu charge on: ${c.collateral}.`, 45, y, { width: 510, lineGap: 3 });
  y += 26;

  doc.text(`• Clause 9.1 (Personal & Corporate Guarantee): ${c.director}, Managing Director, unconditionally and irrevocably provides a continuous personal guarantee covering the full Facility Amount of Rs. ${c.principalAmount} plus accrued interest and penalty costs.`, 45, y, { width: 510, lineGap: 3 });
  y += 34;

  doc.text(`• Clause 11.4 (Prepayment & Foreclosure): The Borrower may prepay the Facility in full or in part with zero (0%) prepayment penalties after completing 6 prompt consecutive monthly installment payments.`, 45, y, { width: 510, lineGap: 3 });
  y += 34;

  // Section 4: Governing Law & Jurisdiction
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('4. GOVERNING LAW & JURISDICTION', 40, y);
  y += 16;
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
    .text(`This Agreement shall be governed by and construed in accordance with the Laws of the Republic of India. Courts at ${c.jurisdiction} shall exercise exclusive jurisdiction.`, 45, y, { width: 510, lineGap: 3 });
  y += 45;

  // Signatures
  doc.rect(40, y, 240, 85).stroke('#cbd5e1');
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('FOR AND ON BEHALF OF LENDER:', 50, y + 8);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('FinanceFlow Capital NBFC Pvt Ltd', 50, y + 20);
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('Rajiv Nair', 50, y + 42);
  doc.text('Head of Credit & Structured Lending', 50, y + 54);
  doc.text(`Date: ${c.date}`, 50, y + 66);

  doc.rect(315, y, 240, 85).stroke('#cbd5e1');
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('FOR AND ON BEHALF OF BORROWER:', 325, y + 8);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(c.displayBorrower, 325, y + 20);
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(c.director, 325, y + 42);
  doc.text(c.directorTitle, 325, y + 54);
  doc.text(`Date: ${c.date}`, 325, y + 66);

  doc.end();
  console.log(`✅ Generated Pristine PDF: ${c.fileName}`);
}

console.log('🎉 All 5 Company Loan Agreement PDFs regenerated successfully in test_loan_agreements/ !');
