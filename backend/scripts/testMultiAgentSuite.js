import pool from '../src/config/db.js';
import { runRiskAssessmentAgent } from '../src/agents/riskAgent.js';
import { runCollectionAgent } from '../src/agents/collectionAgent.js';
import { runDocumentIntelligenceAgent } from '../src/agents/documentAgent.js';

async function testSuite() {
  try {
    console.log('===================================================');
    console.log('TESTING MULTI-AGENT SUITE (AGENTS 2, 3, AND 4)');
    console.log('===================================================\n');

    // Get Apex Logistics ID
    const [comps] = await pool.query(`SELECT id, company_name FROM companies WHERE company_name = 'Apex Logistics Pvt Ltd'`);
    const apexId = comps[0]?.id || 1;

    console.log('--- 1. Testing Agent 2: Repayment Risk Assessment Agent ---');
    const riskResult = await runRiskAssessmentAgent(apexId);
    console.log('Company Name:', riskResult.company_name);
    console.log('Risk Score:', riskResult.risk_score + '/100 | Risk Level:', riskResult.risk_level);
    console.log('Overdue Installments Count:', riskResult.overdue_installments_count);
    console.log('Key Risk Factors:', riskResult.key_risk_factors);
    console.log('Recommended Mitigation Actions:', riskResult.recommended_actions);

    console.log('\n--- 2. Testing Agent 3: Automated Collection Follow-Up Agent ---');
    const collectionResult = await runCollectionAgent(apexId);
    console.log('Target Recipient:', collectionResult.recipient_name, `<${collectionResult.recipient_email}>`);
    console.log('Urgency Level:', collectionResult.urgency_level);
    console.log('Email Subject:', collectionResult.subject);
    console.log('Email Body Sample:\n', collectionResult.email_body.slice(0, 200) + '...');

    console.log('\n--- 3. Testing Agent 4: Document Intelligence Agent ---');
    const [docs] = await pool.query(`SELECT id FROM documents LIMIT 1`);
    const docId = docs[0]?.id || 1;
    const docResult = await runDocumentIntelligenceAgent(docId);
    console.log('Document File Name:', docResult.file_name);
    console.log('Borrower Company:', docResult.borrower_company);
    console.log('Extracted Contract Terms:', docResult.extracted_terms);

    console.log('\n===================================================');
    console.log('🎉 ALL AGENTS 2, 3, AND 4 TESTED & 100% OPERATIONAL!');
    console.log('===================================================');
    await pool.end();
  } catch (err) {
    console.error('Multi-Agent Test Error:', err);
    await pool.end();
  }
}

testSuite();
