# Service: `orchestrator.service.js` Documentation

---

## 1. Overview & Architectural Role

The `orchestrator.service.js` is the **core workflow state machine** of FinanceFlow AI.

It defines, validates, sequences, and coordinates execution across all 6 specialized AI agents. It handles:
1. **Pipeline Blueprint Creation**: Pre-creates planned steps in MySQL (`pipeline_steps`) with input contexts.
2. **Priority Queue Integration**: Submits execution jobs to `agentQueue.service.js` with priority levels.
3. **Context Chaining**: Passes structured output from Step 1 (e.g. `recommended_company_id`) forward into Step 2 (Risk Assessment) and Step 3 (Collection Notice).
4. **Failure Isolation**: Catches localized agent errors, marks step failures without crashing the Express server, and safely terminates downstream dependencies.
5. **Real-Time Telemetry**: Broadcasts step-by-step WebSocket events (`PIPELINE_STARTED`, `PIPELINE_STEP_STARTED`, `PIPELINE_STEP_COMPLETED`, `PIPELINE_COMPLETED`).

---

## 2. Predefined Multi-Agent Workflows

### 1. `RECONCILIATION_AND_RISK`
- **Step 1**: `Agent 1: PaymentReconciliationAgent` (Performs zero-token pre-checks and Groq LLM tool calling to match bank deposit to loan installment).
- **Step 2**: `Agent 2: RepaymentRiskAssessmentAgent` (Calculates borrower exposure, updated debt ratios, and risk level).
- **Step 3**: `Agent 3: AutomatedCollectionFollowUpAgent` (Drafts polite/demand collection communications).

### 2. `PORTFOLIO_AND_ESCALATION`
- **Step 1**: `Agent 5: PortfolioAnalyticsAgent` (Computes portfolio collection efficiency, PAR30/PAR90 delinquency, and executive health grade).
- **Step 2**: `Agent 6: NotificationEscalationAgent` (Scans SLA breach triggers and pre-populates manager escalation notice packages).

### 3. `END_TO_END_COMPLIANCE`
- Full 6-Agent sequential execution pipeline for regulatory compliance and periodic portfolio audit.

---

## 3. Mentor Interview Questions & Answers

### Q1: What is the difference between Orchestration and Choreography?
**Answer**:
* **Orchestration (FinanceFlow AI)**: A centralized controller (`orchestrator.service.js`) explicitly directs the workflow, decides step execution sequence, handles retries, and records step-level telemetry in a central database.
* **Choreography**: Individual services or agents communicate implicitly via event brokers (e.g. Kafka/RabbitMQ) without a central orchestrator. Orchestration was chosen here because financial reconciliation workflows require strict deterministic audit trails and human-in-the-loop governance.

### Q2: What is context chaining in multi-agent systems?
**Answer**: Context chaining is the mechanism where the structured JSON output of Agent $N$ is dynamically injected into the input payload of Agent $N+1$. For instance, Agent 1 matches an unallocated payment to Company #20. The orchestrator extracts `recommended_company_id = 20` and passes it directly into Agent 2's risk evaluation engine.
