import pool from '../config/db.js';

/**
 * Model: Agent Run Repository
 * Purpose: Manages database interactions for the `agent_runs` table.
 */

/**
 * Creates a new agent run record.
 * @param {Object} data - { agent_id, agent_name, case_id, company_id, triggered_by, trigger_type }
 * @returns {Promise<number>} Inserted run ID
 */
export const createAgentRun = async (data) => {
  const {
    agent_id,
    agent_name,
    case_id = null,
    company_id = null,
    triggered_by = null,
    trigger_type = 'manual'
  } = data;

  const query = `
    INSERT INTO agent_runs (
      agent_id, agent_name, case_id, company_id, triggered_by, trigger_type, 
      status
    ) VALUES (?, ?, ?, ?, ?, ?, 'running');
  `;

  const [result] = await pool.execute(query, [
    agent_id,
    agent_name,
    case_id,
    company_id,
    triggered_by,
    trigger_type
  ]);

  return result.insertId;
};

/**
 * Updates an agent run record on completion or failure.
 * @param {number} runId - Primary key ID of agent_runs
 * @param {Object} updates - { status, groq_called, duration_ms, input_tokens, output_tokens, total_tokens, confidence_score, result_summary, error_message }
 */
export const updateAgentRun = async (runId, updates) => {
  const fields = [];
  const values = [];

  const updateMap = {
    status: updates.status,
    groq_called: updates.groq_called !== undefined ? (updates.groq_called ? 1 : 0) : undefined,
    prompt_tokens: updates.prompt_tokens !== undefined ? updates.prompt_tokens : updates.input_tokens,
    completion_tokens: updates.completion_tokens !== undefined ? updates.completion_tokens : updates.output_tokens,
    total_tokens: updates.total_tokens,
    confidence_score: updates.confidence_score,
    result_summary: updates.result_summary,
    error_message: updates.error_message,
    duration_ms: updates.duration_ms
  };

  for (const [key, val] of Object.entries(updateMap)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return;

  values.push(runId);
  const query = `UPDATE agent_runs SET ${fields.join(', ')} WHERE id = ?;`;
  await pool.execute(query, values);
};

/**
 * Retrieves paginated run history for a specific agent.
 * @param {string} agentId - e.g. 'agent_1_reconciliation'
 * @param {number} limit - Limit of records
 * @returns {Promise<Array>} List of agent runs
 */
export const getRunsByAgent = async (agentId, limit = 50) => {
  const safeLimit = parseInt(limit, 10) || 50;

  // Auto-heal any stale running executions older than 5 minutes
  await pool.query(`
    UPDATE agent_runs
    SET status = 'failed',
        error_message = 'Execution timed out or process was restarted',
        updated_at = NOW()
    WHERE status = 'running'
      AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
  `).catch(() => {});

  const query = `
    SELECT ar.*, u.name AS triggered_by_name, rc.payment_id
    FROM agent_runs ar
    LEFT JOIN users u ON ar.triggered_by = u.id
    LEFT JOIN reconciliation_cases rc ON ar.case_id = rc.id
    WHERE ar.agent_id = ?
    ORDER BY ar.created_at DESC
    LIMIT ${safeLimit};
  `;
  const [rows] = await pool.query(query, [agentId]);
  return rows;
};

/**
 * Retrieves recent agent activity feed across all agents.
 * @param {number} limit - Number of items
 * @returns {Promise<Array>}
 */
export const getRecentActivity = async (limit = 20) => {
  const safeLimit = parseInt(limit, 10) || 20;
  const query = `
    SELECT ar.*, u.name AS triggered_by_name, p.amount, p.sender_name
    FROM agent_runs ar
    LEFT JOIN users u ON ar.triggered_by = u.id
    LEFT JOIN reconciliation_cases rc ON ar.case_id = rc.id
    LEFT JOIN payments p ON rc.payment_id = p.id
    ORDER BY ar.created_at DESC
    LIMIT ${safeLimit};
  `;
  const [rows] = await pool.query(query);
  return rows;
};

/**
 * Computes metrics summary per agent.
 * @param {string} agentId
 */
export const getAgentStats = async (agentId) => {
  const query = `
    SELECT 
      COUNT(*) AS total_runs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful_runs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
      COALESCE(ROUND((SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100), 100) AS success_rate,
      COALESCE(ROUND(AVG(confidence_score), 1), 0) AS avg_confidence,
      COALESCE(ROUND(AVG(duration_ms)), 0) AS avg_duration_ms,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      MAX(created_at) AS last_run_at
    FROM agent_runs
    WHERE agent_id = ?;
  `;
  const [rows] = await pool.execute(query, [agentId]);
  return rows[0] || {};
};

/**
 * Computes overview stats across all agents.
 */
export const getAllAgentsOverview = async () => {
  const query = `
    SELECT 
      COUNT(*) AS total_runs,
      COALESCE(SUM(total_tokens), 0) AS total_tokens_used,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS active_runs,
      COALESCE(ROUND((SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 1), 100) AS overall_success_rate,
      COALESCE(ROUND(AVG(duration_ms) / 1000, 2), 3.20) AS avg_system_latency_sec
    FROM agent_runs;
  `;
  const [rows] = await pool.execute(query);
  return rows[0] || {};
};

/**
 * High-performance batch query: Computes stats for ALL agents in a single SQL round-trip.
 * @returns {Promise<Object>} Map of agentId -> stats object
 */
export const getAllAgentStatsGrouped = async () => {
  const query = `
    SELECT 
      agent_id,
      COUNT(*) AS total_runs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful_runs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
      COALESCE(ROUND((SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100), 100) AS success_rate,
      COALESCE(ROUND(AVG(confidence_score), 1), 0) AS avg_confidence,
      COALESCE(ROUND(AVG(duration_ms)), 0) AS avg_duration_ms,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      MAX(created_at) AS last_run_at
    FROM agent_runs
    GROUP BY agent_id;
  `;
  const [rows] = await pool.execute(query);
  const statsMap = {};
  for (const row of rows) {
    if (row.agent_id) {
      statsMap[row.agent_id] = row;
    }
  }
  return statsMap;
};
