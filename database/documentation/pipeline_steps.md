# Database Table: `pipeline_steps` Documentation

---

## 1. Table Overview & Purpose

The `pipeline_steps` table records the **granular, step-level lifecycle** of individual AI agents executing within a parent multi-agent pipeline.

While `pipeline_executions` tracks the overall macro workflow, `pipeline_steps` stores the exact input passed to each agent, the output payload returned, the execution duration in milliseconds, LLM token consumption, and any localized step errors.

```
                    pipeline_executions (Parent Workflow #42)
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
   pipeline_steps #1             pipeline_steps #2             pipeline_steps #3
   Step 1: Agent 1               Step 2: Agent 2               Step 3: Agent 3
   Status: completed             Status: completed             Status: skipped
   Tokens: 420, Time: 620ms      Tokens: 580, Time: 1240ms     Tokens: 0, Time: 0ms
```

---

## 2. Table Schema Definition

```sql
CREATE TABLE IF NOT EXISTS pipeline_steps (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pipeline_id BIGINT UNSIGNED NOT NULL,
    step_index INT UNSIGNED NOT NULL,
    agent_id INT UNSIGNED NULL,
    agent_name VARCHAR(100) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
    input_payload JSON NULL,
    output_payload JSON NULL,
    tokens_used INT UNSIGNED NOT NULL DEFAULT 0,
    duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_step_pipeline_id (pipeline_id, step_index),
    INDEX idx_step_status (status),
    CONSTRAINT fk_pipeline_steps_parent
        FOREIGN KEY (pipeline_id) REFERENCES pipeline_executions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Data Flow & Integration Lifecycle

1. **Step Initialization**: When a pipeline starts, all planned steps are pre-created with `status = 'pending'` and sequential `step_index` (1, 2, 3...).
2. **Step Execution**:
   - Status updates to `'running'`, `started_at` is stamped, and `input_payload` is recorded.
   - WebSocket event `PIPELINE_STEP_STARTED` is emitted to the frontend visualizer.
3. **Step Completion**:
   - Upon agent return, `output_payload` (e.g. AI confidence score, risk tier, or collection notice text) is saved.
   - Status transitions to `'completed'`, `duration_ms` is computed, and `tokens_used` is recorded.
   - WebSocket event `PIPELINE_STEP_COMPLETED` is broadcast.
4. **Conditional Skipping**: If upstream logic determines a step is unnecessary (e.g. Agent 1 found an exact 100% full match, so Agent 3 Collection Notice is skipped), the step is marked `status = 'skipped'`.

---

## 4. Mentor Interview Questions & Answers

### Q1: Why do we pre-create all steps with `status = 'pending'` instead of creating them on-the-fly?
**Answer**: Pre-creating steps allows the frontend UI (e.g., `PipelineVisualizer.jsx`) to immediately render the full workflow blueprint graph with all planned milestones. As the execution progresses, the UI nodes transition live from gray (`pending`) $\rightarrow$ blue pulsing (`running`) $\rightarrow$ green (`completed`) or amber (`skipped`).

### Q2: What happens if Step 2 fails? Does it crash the whole database?
**Answer**: Step failures are isolated. The orchestrator catches the error, marks `pipeline_steps.status = 'failed'` with the specific `error_message`, and decides whether the pipeline can continue to subsequent non-dependent steps or terminate gracefully. The `ON DELETE CASCADE` constraint ensures referential integrity with parent `pipeline_executions`.

### Q3: Why is `output_payload` stored in JSON instead of individual table foreign keys?
**Answer**: Each of the 6 agents returns completely different output schemas (Agent 1 returns match scores and schedule IDs; Agent 2 returns credit risk scores and debt-service ratios; Agent 3 returns drafted reminder email text). Storing output payloads as JSON provides an immutable snapshot of what the AI produced at that exact millisecond without schema coupling.
