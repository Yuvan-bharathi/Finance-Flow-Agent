# Agent 5 — Portfolio Analytics Agent

## Purpose
Computes full portfolio health metrics (collection efficiency, delinquency rate, concentration risk) using deterministic SQL, then uses Groq LLM to interpret the numbers and produce a health grade, recommendations, and reasoning summary.

## Design Decision: Hybrid Architecture
**SQL for arithmetic. Groq for reasoning.**

Agents 1–4 pass raw data to Groq and ask it to reason. Agent 5 takes it further:
- MySQL calculates Collection Efficiency = 91.4% (arithmetic — reliable)
- Groq interprets it: "Portfolio health is moderate. The 8.2% delinquency rate suggests early-stage stress in the borrower book..." (reasoning — valuable)

This is a more defensible AI design to present to a mentor.

## Data Flow

```
Frontend AgentControlCenter
  ↓  User clicks "Test Run" on Agent 5 card
  ↓
POST /api/portfolio/analyze (with JWT cookie)
  ↓
auth.middleware → validates JWT → sets req.user
  ↓
portfolio.controller.js → analyzePortfolio()
  ↓
portfolioAgent.js → runPortfolioAnalyticsAgent(triggeredBy)
  ↓
  ┌─ acquireAgentLock('agent_5_portfolio', 'GLOBAL')
  ├─ createAgentRun() → agent_runs table
  ├─ STEP: getPortfolioSummary() → SQL (loans table)
  ├─ STEP: getDelinquencyTrends() → SQL (repayment_schedules)
  ├─ STEP: getCollectionEfficiency() → SQL (repayment_schedules)
  ├─ STEP: getConcentrationRisk() → SQL (loans JOIN companies)
  ├─ Compute delinquency_rate (Node.js arithmetic)
  ├─ Build userPrompt with computed metrics
  ├─ Groq LLM → health_score + health_grade + ai_interpretation + recommendations
  ├─ INSERT into portfolio_snapshots
  ├─ updateAgentRun() → completed, token usage, duration
  ├─ logStep() → SNAPSHOT_SAVED
  ├─ emitSocketEvent('PORTFOLIO_SNAPSHOT_READY', ...)
  └─ releaseAgentLock()
  ↓
JSON response → React AgentControlCenter
  ↓
portfolioSnapshot state updated → Portfolio Health panel renders
```

## Database Tables Used

| Table | Operation | Purpose |
|-------|-----------|---------|
| `loans` | SELECT | Portfolio summary, concentration risk |
| `repayment_schedules` | SELECT | Delinquency trends, collection efficiency |
| `companies` | SELECT JOIN | Concentration risk by borrower name |
| `portfolio_snapshots` | INSERT | Persist each analysis result |
| `agent_runs` | INSERT + UPDATE | Audit trail and token tracking |
| `agent_execution_logs` | INSERT | Step-level granular execution log |

## Key Files

| File | Role |
|------|------|
| `backend/src/agents/portfolioAgent.js` | Main agent logic — hybrid SQL + Groq |
| `backend/src/tools/portfolioTools.js` | 4 controlled DB tool functions |
| `backend/src/prompts/portfolio.prompt.js` | Groq system prompt |
| `backend/src/controllers/portfolio.controller.js` | HTTP handler |
| `backend/src/routes/portfolio.routes.js` | Express routes |
| `frontend/src/services/portfolioService.js` | API client |

## Execution Logs

Every run produces these step records in `agent_execution_logs`:
1. `RUN_STARTED` → PORTFOLIO_ANALYSIS_INITIATED
2. `TOOL_EXECUTED` → FETCH_PORTFOLIO_SUMMARY
3. `TOOL_EXECUTED` → FETCH_DELINQUENCY
4. `TOOL_EXECUTED` → FETCH_COLLECTION_EFFICIENCY
5. `TOOL_EXECUTED` → FETCH_CONCENTRATION_RISK
6. `GROQ_ANALYSIS` → PORTFOLIO_INTERPRETATION
7. `SNAPSHOT_SAVED` → PORTFOLIO_SNAPSHOT_CREATED
8. `RUN_COMPLETED` → PORTFOLIO_ANALYSIS_COMPLETE

## Run Lock
Lock key: `agent_5_portfolio_GLOBAL`
Portfolio analysis is a global operation — no per-entity lock needed.
Duplicate requests are blocked until the current run completes.

## Token Usage
- Only tokens consumed at Step 6 (Groq interpretation)
- Fallback: If Groq fails, deterministic metrics are still saved with `groq_model = 'sql-deterministic'`
- All tokens tracked in `agent_runs.total_tokens`

## WebSocket Event
`PORTFOLIO_SNAPSHOT_READY` → emitted to all connected frontend clients after snapshot is saved.
Frontend `AgentControlCenter` can listen and refresh the Portfolio Health panel in real-time.
