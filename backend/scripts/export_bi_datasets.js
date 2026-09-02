import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Resolve directory paths regardless of where node command is executed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendRoot, '..');
const datasetsDir = path.resolve(projectRoot, 'datasets');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(backendRoot, '.env') });

import pool from '../src/config/db.js';

/**
 * Helper to escape and format values for RFC-4180 compliant CSV
 */
function formatCsvValue(val) {
  if (val === null || val === undefined) {
    return '';
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val);
  // If string contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of database row objects to CSV string
 */
function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => 
    headers.map(header => formatCsvValue(row[header])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

async function exportTable(tableName, customQuery = null, customFilename = null) {
  const filename = customFilename || `${tableName}.csv`;
  const filePath = path.join(datasetsDir, filename);
  const query = customQuery || `SELECT * FROM \`${tableName}\``;

  try {
    const [rows] = await pool.query(query);
    const csvContent = rowsToCsv(rows);
    fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log(`✅ [${filename}] Exported ${rows.length} rows -> ${filePath}`);
    return { name: filename, count: rows.length, success: true };
  } catch (err) {
    console.warn(`⚠️ [${filename}] Skipped or failed: ${err.message}`);
    return { name: filename, count: 0, success: false, error: err.message };
  }
}

async function main() {
  console.log('===========================================================');
  console.log('🚀 FinanceFlow AI — Business Intelligence Dataset Exporter');
  console.log('===========================================================');
  console.log(`Target Directory: ${datasetsDir}\n`);

  if (!fs.existsSync(datasetsDir)) {
    fs.mkdirSync(datasetsDir, { recursive: true });
  }

  // 1. Export All Existing Database Tables Dynamically
  console.log('--- Phase 1: Querying & Exporting All Relational Tables ---');
  const [tableRows] = await pool.query('SHOW TABLES');
  const dbNameCol = Object.keys(tableRows[0])[0];
  const allTables = tableRows.map(r => r[dbNameCol]);

  const results = [];
  for (const table of allTables) {
    const res = await exportTable(table);
    results.push(res);
  }

  // 2. Export Denormalized BI Fact Datasets (Pre-joined, Star-Schema ready!)
  console.log('\n--- Phase 2: Generating Denormalized BI Analytical Fact Datasets ---');
  
  // Master Dashboard Dataset: Exactly 1 row per Case/Payment with ALL Dashboard KPIs & Charts
  const dashboardUnifiedQuery = `
    SELECT 
      rc.id AS case_id,
      rc.status AS case_status,
      rc.priority AS case_priority,
      DATE(rc.created_at) AS case_date,
      rc.created_at AS case_timestamp,
      rc.resolved_at AS case_resolved_timestamp,
      rc.resolution_reason,
      p.id AS payment_id,
      p.transaction_id,
      p.amount AS payment_amount,
      CASE 
        WHEN rc.status IN ('resolved', 'approved') THEN p.amount 
        ELSE 0.00 
      END AS reconciled_amount,
      p.payment_date,
      p.sender_name,
      p.sender_account,
      p.reference AS payment_reference,
      p.source AS payment_source,
      p.status AS payment_status,
      COALESCE(c.company_name, 'Unassigned Borrower') AS company_name,
      COALESCE(l.loan_number, 'N/A') AS loan_number,
      CASE 
        WHEN ar.id IS NOT NULL THEN 1 
        ELSE 0 
      END AS is_ai_auto_processed,
      COALESCE(ar.confidence_score, 0.00) AS ai_confidence_score,
      COALESCE(ar.status, 'none') AS ai_recommendation_status,
      ar.reasoning AS ai_reasoning,
      CASE 
        WHEN pa.id IS NOT NULL AND pa.severity IN ('HIGH', 'CRITICAL', 'MEDIUM') THEN 1 
        ELSE 0 
      END AS is_anomaly_detected,
      COALESCE(pa.severity, 'CLEAR') AS anomaly_severity,
      COALESCE(pa.anomaly_score, 0.00) AS anomaly_score,
      COALESCE(pa.anomaly_types, '[]') AS anomaly_types,
      COALESCE(alloc.allocated_total, 0.00) AS waterfall_allocated_amount,
      COALESCE(alloc.allocation_types, 'none') AS waterfall_allocation_types
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id
    LEFT JOIN (
      SELECT ar1.* 
      FROM ai_recommendations ar1
      INNER JOIN (
        SELECT reconciliation_case_id, MAX(id) AS max_id
        FROM ai_recommendations
        GROUP BY reconciliation_case_id
      ) ar2 ON ar1.id = ar2.max_id
    ) ar ON ar.reconciliation_case_id = rc.id
    LEFT JOIN companies c ON ar.recommended_company_id = c.id
    LEFT JOIN loans l ON ar.recommended_loan_id = l.id
    LEFT JOIN (
      SELECT pa1.*
      FROM payment_anomalies pa1
      INNER JOIN (
        SELECT payment_id, MAX(id) AS max_id
        FROM payment_anomalies
        GROUP BY payment_id
      ) pa2 ON pa1.id = pa2.max_id
    ) pa ON pa.payment_id = p.id
    LEFT JOIN (
      SELECT payment_id, SUM(allocated_amount) AS allocated_total, GROUP_CONCAT(DISTINCT allocation_type) AS allocation_types
      FROM payment_allocations
      GROUP BY payment_id
    ) alloc ON alloc.payment_id = p.id
    ORDER BY rc.id ASC
  `;
  await exportTable(null, dashboardUnifiedQuery, 'dashboard_single_unified_dataset.csv');

  // Master Fact Table: Reconciliations & Settlements
  const masterReconciliationQuery = `
    SELECT 
      rc.id AS case_id,
      rc.status AS case_status,
      rc.priority AS case_priority,
      rc.created_at AS case_created_at,
      rc.resolved_at AS case_resolved_at,
      rc.resolution_reason,
      p.id AS payment_id,
      p.transaction_id,
      p.amount AS payment_amount,
      p.payment_date,
      p.sender_name,
      p.sender_account,
      p.reference AS payment_reference,
      p.source AS payment_source,
      p.status AS payment_status,
      c.id AS company_id,
      c.company_name,
      c.tax_identifier,
      l.id AS loan_id,
      l.loan_number,
      l.principal_amount AS loan_principal,
      l.interest_rate AS loan_interest_rate,
      ar.confidence_score AS ai_confidence_score,
      ar.status AS ai_recommendation_status,
      ar.reasoning AS ai_reasoning,
      pa.allocated_amount AS waterfall_allocated_amount,
      pa.allocation_type AS waterfall_allocation_type,
      pa.created_at AS allocation_timestamp
    FROM reconciliation_cases rc
    LEFT JOIN payments p ON rc.payment_id = p.id
    LEFT JOIN ai_recommendations ar ON ar.reconciliation_case_id = rc.id
    LEFT JOIN companies c ON ar.recommended_company_id = c.id
    LEFT JOIN loans l ON ar.recommended_loan_id = l.id
    LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
    ORDER BY rc.id DESC
  `;
  await exportTable(null, masterReconciliationQuery, 'bi_fact_reconciliations_master.csv');

  // Delinquency Aging & Schedule Analysis
  const scheduleAgingQuery = `
    SELECT 
      rs.id AS schedule_id,
      c.company_name,
      l.loan_number,
      rs.installment_number,
      rs.due_date,
      rs.scheduled_amount,
      rs.paid_amount,
      (rs.scheduled_amount - rs.paid_amount) AS outstanding_balance,
      rs.status AS installment_status,
      DATEDIFF(CURRENT_DATE(), rs.due_date) AS days_overdue,
      CASE 
        WHEN rs.status = 'paid' THEN '0 Days (Settled)'
        WHEN DATEDIFF(CURRENT_DATE(), rs.due_date) <= 0 THEN 'Current (Not Due)'
        WHEN DATEDIFF(CURRENT_DATE(), rs.due_date) BETWEEN 1 AND 30 THEN '1-30 Days (Early)'
        WHEN DATEDIFF(CURRENT_DATE(), rs.due_date) BETWEEN 31 AND 60 THEN '31-60 Days (Moderate)'
        WHEN DATEDIFF(CURRENT_DATE(), rs.due_date) BETWEEN 61 AND 90 THEN '61-90 Days (High)'
        ELSE '90+ Days (Severe/Default)'
      END AS aging_delinquency_bucket
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    ORDER BY rs.due_date ASC
  `;
  await exportTable(null, scheduleAgingQuery, 'bi_fact_loan_schedules_and_aging.csv');

  // 3. Write BI Documentation & Data Dictionary
  const readmeContent = `# FinanceFlow AI — Business Intelligence Datasets

Exported on: ${new Date().toISOString()}
Target Environment: MySQL (\`financeflow_db\`)

This directory contains clean, UTF-8 CSV datasets formatted specifically for ingestion into **Power BI**, **Tableau**, **Metabase**, **Excel**, or **Python Pandas**.

---

## 🌟 Recommended Star Schema Files for Instant BI Reporting

### 1. \`bi_fact_reconciliations_master.csv\`
- **Type**: Denormalized Fact Table
- **Purpose**: Ready-to-use master dataset linking Payments, Cases, Corporate Borrowers, Loans, AI Confidence Scores, and Waterfall Ledger Allocations.
- **Key Metrics**:
  - \`payment_amount\`: Incoming cashflow amount
  - \`ai_confidence_score\`: Groq LLM match confidence percentage (0–100%)
  - \`waterfall_allocated_amount\`: Settled repayment allocation
  - \`case_status\`: Open, Pending Review, Resolved

### 2. \`bi_fact_loan_schedules_and_aging.csv\`
- **Type**: Delinquency & Aging Fact Table
- **Purpose**: Portfolio health tracking, delinquency roll rates, and collection forecasting.
- **Key Dimensions**:
  - \`aging_delinquency_bucket\`: 0 Days (Settled), Current, 1-30 Days, 31-60 Days, 61-90 Days, 90+ Days
  - \`days_overdue\`: Numeric integer for aging timeline analysis
  - \`outstanding_balance\`: Remaining unpaid installment amount

---

## 📁 Relational Core Tables

| CSV File | Records | Description |
|---|---|---|
| \`payments.csv\` | Raw bank ledger deposits & ingestion channels |
| \`reconciliation_cases.csv\` | Investigation cases, priority SLA, resolution status |
| \`ai_recommendations.csv\` | Agent 1 matching candidate decisions, reasoning & scores |
| \`payment_allocations.csv\` | 6-tier statutory priority ledger allocations |
| \`companies.csv\` | Corporate borrowers master entity records |
| \`loans.csv\` | Loan facility contracts, principal, and interest terms |
| \`repayment_schedules.csv\` | Installment calendar and due dates |
| \`audit_logs.csv\` | Complete immutable compliance and regulatory trails |
| \`documents.csv\` | Invoices, statements, and contract metadata |
| \`anomalies.csv\` | Agent 7 fraud detection and risk pre-check flags |

---

## 📊 How to Load into Power BI / Tableau
1. Open **Power BI Desktop** or **Tableau Desktop**.
2. Select **Get Data** ➔ **Text/CSV**.
3. Select \`bi_fact_reconciliations_master.csv\` or multiple CSVs from this directory.
4. Set encoding to **65001: Unicode (UTF-8)**.
5. Click **Load** to begin building charts and dashboards!
`;

  fs.writeFileSync(path.join(datasetsDir, 'README_DATA_DICTIONARY.md'), readmeContent, 'utf8');
  console.log(`\n📘 Generated Data Dictionary: ${path.join(datasetsDir, 'README_DATA_DICTIONARY.md')}`);

  console.log('\n===========================================================');
  console.log('✨ All BI Datasets exported successfully to /datasets folder!');
  console.log('===========================================================');
  
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
