import pool from '../config/db.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import { findRecommendationsByCaseId, findRecommendationById } from '../models/aiRecommendation.model.js';
import { findCaseById } from '../models/reconciliationCase.model.js';
import { AGENT_CONFIG } from '../config/agentConfig.js';
import { createAgentRun } from '../models/agentRun.model.js';

/**
 * Service: Reconciliation Service
 * Purpose: Business logic for single/bulk payment reconciliation triggers, case listings, and KPI analytics.
 */

/**
 * Triggers Payment Reconciliation Agent (Agent 1) to investigate a payment case.
 */
export const analyzeCaseService = async (caseId, userId = null, triggerType = 'manual') => {
  // Duplicate analysis check: If case is already analyzed and in pending_review or resolved, check if recommendation exists
  const caseDetails = await findCaseById(caseId);
  if (!caseDetails) {
    const error = new Error(`Reconciliation case with ID ${caseId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Duplicate run check: If already analyzed and has recommendation
  if (caseDetails.status === 'pending_review' || caseDetails.status === 'approved' || caseDetails.status === 'resolved') {
    const recs = await findRecommendationsByCaseId(caseId);
    if (recs.length > 0) {
      return {
        already_analyzed: true,
        case: caseDetails,
        recommendation: recs[0]
      };
    }
  }

  return await runReconciliationAgent(caseId, userId, triggerType);
};

/**
 * Bulk analyzes a list of selected case IDs.
 * Enforces MAX_SELECTED_CASES limit (20) and processes with max concurrency (5).
 */
export const analyzeBulkService = async (caseIds, userId = null) => {
  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    const error = new Error('caseIds must be a non-empty array.');
    error.statusCode = 400;
    throw error;
  }

  const limit = AGENT_CONFIG.bulk.maxSelectedCases;
  if (caseIds.length > limit) {
    const error = new Error(`Cannot analyze more than ${limit} selected cases in a single batch.`);
    error.statusCode = 400;
    throw error;
  }

  // Fetch target cases that are 'new' or 'ai_failed'
  const [targetCases] = await pool.query(
    `SELECT id, status FROM reconciliation_cases WHERE id IN (?) AND status IN ('new', 'ai_failed');`,
    [caseIds]
  );

  if (targetCases.length === 0) {
    return {
      message: 'No eligible new or failed cases found for analysis.',
      processed_count: 0,
      results: []
    };
  }

  const results = [];
  const concurrencyLimit = AGENT_CONFIG.bulk.maxConcurrentRuns; // 5

  // Execute in concurrent worker batches of 5
  for (let i = 0; i < targetCases.length; i += concurrencyLimit) {
    const batch = targetCases.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(c => 
      runReconciliationAgent(c.id, userId, 'bulk_manual')
        .then(res => ({ case_id: c.id, status: 'success', data: res }))
        .catch(err => ({ case_id: c.id, status: 'failed', error: err.message }))
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return {
    total_requested: caseIds.length,
    processed_count: targetCases.length,
    successful_count: successful,
    failed_count: failed,
    results
  };
};

/**
 * Analyzes all NEW un-analyzed cases.
 * Enforces MAX_BULK_CASES limit (50) and processes with max concurrency (5).
 */
export const analyzeAllPendingService = async (userId = null) => {
  const maxLimit = AGENT_CONFIG.bulk.maxAllPendingCases; // 50

  const [pendingCases] = await pool.query(
    `SELECT id FROM reconciliation_cases WHERE status = 'new' ORDER BY created_at ASC LIMIT ?;`,
    [maxLimit]
  );

  if (pendingCases.length === 0) {
    return {
      message: 'No pending NEW cases found to analyze.',
      processed_count: 0,
      results: []
    };
  }

  const caseIds = pendingCases.map(c => c.id);
  const results = [];
  const concurrencyLimit = AGENT_CONFIG.bulk.maxConcurrentRuns; // 5

  for (let i = 0; i < caseIds.length; i += concurrencyLimit) {
    const batch = caseIds.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(id => 
      runReconciliationAgent(id, userId, 'bulk_manual')
        .then(res => ({ case_id: id, status: 'success', data: res }))
        .catch(err => ({ case_id: id, status: 'failed', error: err.message }))
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return {
    total_found: caseIds.length,
    processed_count: caseIds.length,
    successful_count: successful,
    failed_count: failed,
    results
  };
};

/**
 * Retrieves list of active reconciliation cases along with candidate AI recommendations.
 */
export const getCasesService = async (status = null, priority = null) => {
  let query = `
    SELECT rc.*, 
           p.transaction_id, p.amount, p.payment_date, p.sender_name, p.sender_account, p.reference, p.status AS payment_status,
           u.name AS assigned_accountant_name
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id
    LEFT JOIN users u ON rc.assigned_to = u.id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push(`rc.status = ?`);
    params.push(status);
  }

  if (priority) {
    conditions.push(`rc.priority = ?`);
    params.push(priority);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY rc.created_at DESC;`;

  const [cases] = await pool.execute(query, params);

  // Attach latest AI recommendation for each case
  for (const item of cases) {
    const recs = await findRecommendationsByCaseId(item.id);
    item.latest_recommendation = recs.length > 0 ? recs[0] : null;
  }

  return cases;
};

/**
 * Retrieves single case details and its full recommendation history.
 */
export const getCaseByIdService = async (caseId) => {
  const caseDetails = await findCaseById(caseId);
  if (!caseDetails) {
    const error = new Error(`Reconciliation case with ID ${caseId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const recommendations = await findRecommendationsByCaseId(caseId);
  return {
    ...caseDetails,
    recommendations
  };
};

/**
 * Computes dashboard analytics KPI stats, status distribution, and AI performance metrics.
 */
export const getStatsService = async () => {
  const [kpiRows] = await pool.query(`
    SELECT 
      COUNT(*) AS \`total_cases\`,
      SUM(CASE WHEN rc.status = 'new' THEN 1 ELSE 0 END) AS \`new_cases\`,
      SUM(CASE WHEN rc.status = 'pending_review' THEN 1 ELSE 0 END) AS \`pending_review\`,
      SUM(CASE WHEN rc.status = 'resolved' OR rc.status = 'approved' THEN 1 ELSE 0 END) AS \`resolved\`,
      SUM(CASE WHEN rc.status = 'ai_processing' OR rc.status = 'ai_queued' THEN 1 ELSE 0 END) AS \`ai_processing\`,
      SUM(CASE WHEN rc.priority = 'high' OR rc.priority = 'critical' THEN 1 ELSE 0 END) AS \`high_priority\`,
      COALESCE(SUM(p.amount), 0) AS \`total_amount\`
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id;
  `);
  const kpi = kpiRows[0] || {};

  const [aiRows] = await pool.query(`
    SELECT COUNT(DISTINCT reconciliation_case_id) AS ai_processed
    FROM ai_recommendations;
  `);
  const aiAutoProcessed = aiRows[0]?.ai_processed || 0;

  const [statusRows] = await pool.query(`
    SELECT status, COUNT(*) AS count
    FROM reconciliation_cases
    GROUP BY status;
  `);

  const [confRows] = await pool.query(`
    SELECT COALESCE(AVG(confidence_score), 0) AS avg_confidence,
           COUNT(*) AS total_recommendations
    FROM ai_recommendations;
  `);
  const avgConfidence = parseFloat(confRows[0]?.avg_confidence || 0).toFixed(1);

  return {
    kpis: {
      total_cases: parseInt(kpi.total_cases, 10) || 0,
      new_cases: parseInt(kpi.new_cases, 10) || 0,
      pending_review: parseInt(kpi.pending_review, 10) || 0,
      resolved: parseInt(kpi.resolved, 10) || 0,
      ai_auto_processed: parseInt(aiAutoProcessed, 10) || 0,
      high_priority: parseInt(kpi.high_priority, 10) || 0,
      total_amount: parseFloat(kpi.total_amount) || 0
    },
    status_breakdown: statusRows,
    ai_performance: {
      avg_confidence: parseFloat(avgConfidence) || 0,
      processed: parseInt(aiAutoProcessed, 10) || 0,
      matched: parseInt(kpi.resolved, 10) || 0,
      escalated: parseInt(kpi.pending_review, 10) || 0
    }
  };
};
