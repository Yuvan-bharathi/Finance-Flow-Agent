import pool from '../config/db.js';
import { runRiskAssessmentAgent } from '../agents/riskAgent.js';

/**
 * Service: Risk Service
 * Handles risk assessment queries across all companies or a single company.
 * 
 * Called by:
 * - risk.controller.js
 */

export const assessCompanyRiskService = async (companyId) => {
  return await runRiskAssessmentAgent(companyId);
};

export const getAllCompaniesRiskOverviewService = async () => {
  const [companies] = await pool.query(`SELECT id, company_name FROM companies WHERE status = 'active'`);
  const results = [];

  for (const comp of companies) {
    const assessment = await runRiskAssessmentAgent(comp.id);
    results.push(assessment);
  }

  return results;
};
