import pool from '../config/db.js';

/**
 * Model: Agent Execution Log Repository
 * Purpose: Manages step-by-step activity logs in `agent_execution_logs`.
 */

const VALID_STEP_TYPES = new Set([
  'LLM_CALL', 'TOOL_CALL', 'DECISION', 'FALLBACK', 'ERROR',
  'AUDIT', 'RUN_STARTED', 'TOOL_EXECUTED', 'GROQ_ANALYSIS', 'ALERTS_CREATED'
]);

/**
 * Logs a single step execution for an agent run.
 */
export const logStep = async ({
  agent_run_id,
  agent_id,
  step_type,
  step_name,
  status = 'completed',
  input_data = null,
  output_data = null,
  duration_ms = null,
  latency_ms = null,
  tokens_used = 0,
  error_message = null
}) => {
  try {
    const safeStepType = VALID_STEP_TYPES.has(step_type) ? step_type : 'DECISION';
    const safeLatency = latency_ms !== null ? latency_ms : (duration_ms || 0);

    const query = `
      INSERT INTO agent_execution_logs (
        agent_run_id, agent_id, step_type, step_name,
        status, input_data, output_data, tokens_used, latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const sanitizeJSON = (obj) => {
      if (!obj) return null;
      try {
        const clone = typeof obj === 'string' ? JSON.parse(obj) : JSON.parse(JSON.stringify(obj));
        if (typeof clone === 'object') {
          delete clone.password;
          delete clone.password_hash;
          delete clone.authorization;
          delete clone.token;
        }
        return JSON.stringify(clone);
      } catch {
        return JSON.stringify({ raw: String(obj) });
      }
    };

    const combinedOutput = output_data || (error_message ? { error: error_message } : null);

    await pool.execute(query, [
      agent_run_id,
      agent_id,
      safeStepType,
      step_name,
      status,
      sanitizeJSON(input_data),
      sanitizeJSON(combinedOutput),
      tokens_used || 0,
      safeLatency || 0
    ]);
  } catch (err) {
    console.error(`[AgentExecutionLog Error] Failed to log step '${step_name}':`, err.message);
  }
};

/**
 * Retrieves all log steps for a specific agent run.
 * @param {number} agentRunId
 */
export const getLogsByRunId = async (agentRunId) => {
  const query = `
    SELECT * FROM agent_execution_logs
    WHERE agent_run_id = ?
    ORDER BY id ASC;
  `;
  const [rows] = await pool.execute(query, [agentRunId]);
  return rows;
};
