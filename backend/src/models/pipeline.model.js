import pool from '../config/db.js';

/**
 * Model: Pipeline Execution Repository / Model (Phase 5 Orchestrator)
 * Purpose: MySQL query execution for multi-agent workflow runs (`pipeline_executions`)
 *          and individual step milestones (`pipeline_steps`).
 * 
 * Data flow:
 * Orchestrator Service ➔ Pipeline Model ➔ MySQL Pool ➔ `pipeline_executions` / `pipeline_steps`
 */

/**
 * Creates a new pipeline execution record.
 * 
 * Called by:
 * - orchestrator.service.js (createPipelineExecution)
 * 
 * @param {Object} executionData - `{ pipeline_name, trigger_source, triggered_by, context_data, correlation_id }`
 * @param {Object} [connection] - Optional MySQL transaction connection
 * @returns {Promise<number>} Inserted pipeline execution primary key ID
 */
export const insertPipelineExecution = async (executionData, connection = null) => {
  const executor = connection || pool;
  const {
    pipeline_name,
    trigger_source = 'manual_ui',
    triggered_by = null,
    context_data = null,
    correlation_id = null
  } = executionData;

  const query = `
    INSERT INTO pipeline_executions (
      pipeline_name, trigger_source, triggered_by, status, context_data, correlation_id, started_at
    ) VALUES (?, ?, ?, 'running', ?, ?, NOW());
  `;

  const [result] = await executor.execute(query, [
    pipeline_name,
    trigger_source,
    triggered_by,
    context_data ? JSON.stringify(context_data) : null,
    correlation_id
  ]);

  return result.insertId;
};

/**
 * Inserts a single planned step for a pipeline execution.
 * 
 * Called by:
 * - orchestrator.service.js (initPipelineSteps)
 * 
 * @param {Object} stepData - `{ pipeline_id, step_index, agent_id, agent_name, input_payload, status }`
 * @param {Object} [connection] - Optional MySQL transaction connection
 * @returns {Promise<number>} Inserted step primary key ID
 */
export const insertPipelineStep = async (stepData, connection = null) => {
  const executor = connection || pool;
  const {
    pipeline_id,
    step_index,
    agent_id = null,
    agent_name,
    input_payload = null,
    status = 'pending'
  } = stepData;

  const query = `
    INSERT INTO pipeline_steps (
      pipeline_id, step_index, agent_id, agent_name, status, input_payload
    ) VALUES (?, ?, ?, ?, ?, ?);
  `;

  const [result] = await executor.execute(query, [
    pipeline_id,
    step_index,
    agent_id,
    agent_name,
    status,
    input_payload ? JSON.stringify(input_payload) : null
  ]);

  return result.insertId;
};

/**
 * Updates a pipeline step to 'running' state with started_at timestamp.
 * 
 * @param {number} stepId - Primary key of pipeline_steps
 * @param {Object} [inputPayload] - Optional runtime input payload
 */
export const startPipelineStep = async (stepId, inputPayload = null) => {
  const query = `
    UPDATE pipeline_steps
    SET status = 'running',
        started_at = NOW(),
        input_payload = COALESCE(?, input_payload)
    WHERE id = ?;
  `;
  await pool.execute(query, [
    inputPayload ? JSON.stringify(inputPayload) : null,
    stepId
  ]);
};

/**
 * Completes a pipeline step with output payload, duration, and token consumption.
 * 
 * @param {number} stepId - Primary key of pipeline_steps
 * @param {Object} completionData - `{ status, output_payload, tokens_used, duration_ms, error_message }`
 */
export const completePipelineStep = async (stepId, completionData) => {
  const {
    status = 'completed',
    output_payload = null,
    tokens_used = 0,
    duration_ms = 0,
    error_message = null
  } = completionData;

  const query = `
    UPDATE pipeline_steps
    SET status = ?,
        output_payload = ?,
        tokens_used = ?,
        duration_ms = ?,
        error_message = ?,
        completed_at = NOW()
    WHERE id = ?;
  `;

  await pool.execute(query, [
    status,
    output_payload ? JSON.stringify(output_payload) : null,
    tokens_used,
    duration_ms,
    error_message,
    stepId
  ]);
};

/**
 * Finalizes the entire pipeline execution with overall status, duration, and token sums.
 * 
 * @param {number} pipelineId - Primary key of pipeline_executions
 * @param {Object} finalData - `{ status, total_tokens, duration_ms, error_message }`
 */
export const finalizePipelineExecution = async (pipelineId, finalData) => {
  const {
    status = 'completed',
    total_tokens = 0,
    duration_ms = 0,
    error_message = null
  } = finalData;

  const query = `
    UPDATE pipeline_executions
    SET status = ?,
        total_tokens = ?,
        duration_ms = ?,
        error_message = ?,
        completed_at = NOW()
    WHERE id = ?;
  `;

  await pool.execute(query, [
    status,
    total_tokens,
    duration_ms,
    error_message,
    pipelineId
  ]);
};

/**
 * Retrieves a full pipeline execution details along with all ordered child steps.
 * 
 * @param {number} pipelineId - Pipeline execution ID
 * @returns {Promise<Object|null>} Detailed pipeline execution object with `steps: []`
 */
/**
 * Enriches pipeline executions with linked payment, transaction, and company context.
 */
const _enrichPipelineRecords = async (pipelines) => {
  if (!Array.isArray(pipelines) || pipelines.length === 0) return pipelines;

  for (const p of pipelines) {
    let ctx = p.context_data;
    if (typeof ctx === 'string') {
      try { ctx = JSON.parse(ctx); } catch (e) { ctx = {}; }
    }
    if (!ctx) ctx = {};

    const caseId = ctx.caseId || ctx.case_id;
    const companyId = ctx.companyId || ctx.company_id;

    if (caseId) {
      const [caseRows] = await pool.query(`
        SELECT rc.id, rc.status as case_status,
               p.transaction_id, p.amount as payment_amount, p.sender_name,
               c.id as company_id, c.company_name
        FROM reconciliation_cases rc
        LEFT JOIN payments p ON rc.payment_id = p.id
        LEFT JOIN companies c ON (p.sender_name = c.company_name OR p.sender_name LIKE CONCAT('%', c.company_name, '%'))
        WHERE rc.id = ?
        LIMIT 1
      `, [caseId]);

      if (caseRows && caseRows.length > 0) {
        const row = caseRows[0];
        p.linked_case_id = row.id;
        p.linked_transaction_id = row.transaction_id || null;
        p.linked_payment_amount = row.payment_amount || null;
        p.linked_sender_name = row.sender_name || null;
        p.linked_company_name = row.company_name || null;
      }
    }

    if (!p.linked_company_name && companyId) {
      const [compRows] = await pool.query(`SELECT id, company_name FROM companies WHERE id = ? LIMIT 1`, [companyId]);
      if (compRows && compRows.length > 0) {
        p.linked_company_name = compRows[0].company_name;
        p.linked_company_id = compRows[0].id;
      }
    }
  }

  return pipelines;
};

/**
 * Retrieves a full pipeline execution details along with all ordered child steps.
 * 
 * @param {number} pipelineId - Pipeline execution ID
 * @returns {Promise<Object|null>} Detailed pipeline execution object with `steps: []`
 */
export const findPipelineWithSteps = async (pipelineId) => {
  const [pipelineRows] = await pool.execute(
    `SELECT * FROM pipeline_executions WHERE id = ? LIMIT 1;`,
    [pipelineId]
  );

  if (pipelineRows.length === 0) return null;
  const enriched = await _enrichPipelineRecords(pipelineRows);
  const pipeline = enriched[0];

  const [stepRows] = await pool.execute(
    `SELECT * FROM pipeline_steps WHERE pipeline_id = ? ORDER BY step_index ASC;`,
    [pipelineId]
  );

  pipeline.steps = stepRows;
  return pipeline;
};

/**
 * Lists historical pipeline executions with pagination and optional status filter.
 * 
 * @param {Object} options - `{ page, limit, status }`
 * @returns {Promise<Object>} Object `{ data: Array, total: number }`
 */
export const findHistoricalPipelines = async ({ page = 1, limit = 20, status = null }) => {
  const offset = (page - 1) * limit;
  let countQuery = `SELECT COUNT(*) as total FROM pipeline_executions`;
  let dataQuery = `
    SELECT pe.*, u.name as user_name, u.email as user_email
    FROM pipeline_executions pe
    LEFT JOIN users u ON pe.triggered_by = u.id
  `;
  const params = [];

  if (status) {
    countQuery += ` WHERE pe.status = ?`;
    dataQuery += ` WHERE pe.status = ?`;
    params.push(status);
  }

  dataQuery += ` ORDER BY pe.created_at DESC LIMIT ? OFFSET ?;`;

  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0]?.total || 0;

  const [dataRows] = await pool.query(dataQuery, [...params, Number(limit), Number(offset)]);
  const enrichedRows = await _enrichPipelineRecords(dataRows);

  return { data: enrichedRows, total };
};
