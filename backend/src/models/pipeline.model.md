# Model: `pipeline.model.js` Documentation

---

## 1. Overview & Architectural Role

The `pipeline.model.js` repository provides a clean data access layer for multi-agent workflow state persistence across `pipeline_executions` and `pipeline_steps` tables.

It encapsulates all SQL operations for:
1. Creating parent workflow runs (`insertPipelineExecution`).
2. Registering planned step milestones (`insertPipelineStep`).
3. Updating real-time step progress (`startPipelineStep`, `completePipelineStep`).
4. Finalizing macro workflows with latency and token metrics (`finalizePipelineExecution`).
5. Querying full step trees (`findPipelineWithSteps`) and paginated histories (`findHistoricalPipelines`).

---

## 2. Exported Functions Reference

### `insertPipelineExecution(executionData, [connection])`
- **Purpose**: Creates a new master workflow execution in `pipeline_executions`.
- **Receives**: `{ pipeline_name, trigger_source, triggered_by, context_data, correlation_id }`.
- **Returns**: Inserted primary key `id`.

### `insertPipelineStep(stepData, [connection])`
- **Purpose**: Creates an individual agent step row in `pipeline_steps`.
- **Receives**: `{ pipeline_id, step_index, agent_id, agent_name, input_payload, status }`.
- **Returns**: Inserted step `id`.

### `completePipelineStep(stepId, completionData)`
- **Purpose**: Marks a step complete, saving structured output JSON, duration in ms, and tokens.
- **Receives**: `{ status, output_payload, tokens_used, duration_ms, error_message }`.

### `finalizePipelineExecution(pipelineId, finalData)`
- **Purpose**: Closes the workflow with final status (`completed`/`failed`), total duration, and token sums.

---

## 3. Mentor Interview Questions & Answers

### Q1: Why do functions accept an optional `connection` parameter?
**Answer**: To support transactional atomicity if multiple step records need to be initialized inside a single MySQL transaction block (`START TRANSACTION ... COMMIT`).

### Q2: How does `findPipelineWithSteps` avoid N+1 query overhead?
**Answer**: It performs exactly 2 optimized indexed queries (1 query for the parent execution by ID, and 1 query for all steps matching `pipeline_id` ordered by `step_index`), merging them in-memory into a single nested payload.
