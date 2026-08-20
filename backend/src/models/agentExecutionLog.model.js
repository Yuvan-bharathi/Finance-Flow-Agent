import pool from '../config/db.js';

/**
 * Model: Agent Execution Log Repository
 * Purpose: Manages step-by-step activity logs in `agent_execution_logs`.
 */

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
  error_message = null
}) => {
  try {
    const query = `
      INSERT INTO agent_execution_logs (
        agent_run_id, agent_id, step_type, step_name,
        status, input_data, output_data, duration_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const sanitizeJSON = (obj) => {
      if (!obj) return null;
      // Strip any sensitive fields before logging
      const clone = JSON.parse(JSON.stringify(obj));
      if (typeof clone === 'object') {
        delete clone.password;
        delete clone.password_hash;
        delete clone.authorization;
        delete clone.token;
      }
      return JSON.stringify(clone);
    };

    await pool.execute(query, [
      agent_run_id,
      agent_id,
      step_type,
      step_name,
      status,
      sanitizeJSON(input_data),
      sanitizeJSON(output_data),
      duration_ms,
      error_message
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
