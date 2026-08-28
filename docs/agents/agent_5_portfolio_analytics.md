# Agent 5: Portfolio Health & Concentration Risk Analytics Agent

---

## 1. Executive Summary
The **Portfolio Health & Concentration Risk Analytics Agent** (`agent_5_portfolio`) is the executive macro-surveillance, portfolio quality rating, and concentration risk monitoring engine of FinanceFlow AI. It executes portfolio-wide financial aggregations across all active credit facilities and repayment schedules, evaluates portfolio delinquency benchmarks, detects single-borrower risk concentrations, and generates actionable executive briefing reports for Chief Risk Officers (CROs) and Investment Committees.

* **System ID**: `agent_5_portfolio`
* **Agent Role**: Macro Portfolio Risk Analyst & Concentration Surveillance Engine
* **Execution Model**: Deterministic SQL Financial Aggregation + Groq LLM Macro Synthesis

```
   ┌───────────────────────────────────────────────────────────┐
   │ Trigger: Manual Run (/agents) OR Background Cron Schedule │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Deterministic Portfolio Aggregation (Pure SQL):           │
   │  - Total Portfolio Principal Exposure                     │
   │  - Total Overdue / Delinquent Amount                      │
   │  - Collection Efficiency %                                │
   │  - Single-Borrower & Top-3 Concentration %                │
   │  - Industry Sector Distribution                           │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Quantitative Health Scoring Engine:                       │
   │  - Health Score: 0 - 100                                  │
   │  - Grade: EXCELLENT / GOOD / FAIR / POOR / CRITICAL       │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Groq LLM Interpretation (llama-3.3-70b-versatile):        │
   │  - Macro Risk Narrative for Board & Risk Committee        │
   │  - Underperforming Sector Identification                  │
   │  - Recommended Capital Allocation & Provisioning Guidance │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Stored in `portfolio_snapshots` & Displayed in Dashboard  │
   └───────────────────────────────────────────────────────────┘
```

---

## 2. Problem Solved & Business Use Case
Executive leadership, risk committees, and NBFC board members require real-time visibility into portfolio asset quality. In traditional lending operations:
1. **Reporting Latency**: Month-end portfolio reports take 7–10 days to compile across multiple spreadsheets.
2. **Hidden Concentration Risk**: A lender may have 100 borrowers, but if 3 borrowers represent 45% of total capital, a single default can destabilize the firm.
3. **Delayed Provisioning**: Inability to forecast collection shortfalls leads to unexpected regulatory capital reserve write-downs.
* **Agent 5 Solution**: Computes real-time portfolio analytics on demand in seconds, evaluates concentration thresholds against regulatory limits, and delivers concise AI summaries highlighting emerging stress points.

---

## 3. Technical Configuration & Parameters
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
* **Temperature**: `0.2` (Analytical, macro-financial reasoning)
* **Max Tokens**: `2,048`
* **Concurrency Lock**: `PORTFOLIO_ANALYSIS_GLOBAL` (Prevents concurrent duplicate snapshot computation)
* **System Prompt**: `PORTFOLIO_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/portfolio.prompt.js`

### Key Tools & Functions
* **`calculatePortfolioMetrics`**: Executes SQL aggregations across `loans` and `repayment_schedules` to compute principal, overdue volume, and efficiency.
* **`getConcentrationMetrics`**: Identifies top borrower exposures as a percentage of total active portfolio principal.

---

## 4. Database Schema & Data Dependencies

```
  ┌───────────────────────┐          ┌───────────────────────────┐
  │         loans         ├─────────►│    portfolio_snapshots    │
  └───────────┬───────────┘          └───────────────────────────┘
              │                                    ▲
              ▼                                    │
  ┌───────────────────────┐                        │
  │  repayment_schedules  ├────────────────────────┘
  └───────────────────────┘
```

### Stored Snapshot Schema (`portfolio_snapshots`)
* `id`: Primary key ID.
* `agent_run_id`: Linked run ID in `agent_runs`.
* `total_portfolio_principal`: Total active loan principal outstanding.
* `total_overdue_amount`: Sum of all unpaid overdue installments.
* `delinquency_rate`: Percentage of portfolio that is currently past due.
* `collection_efficiency`: Percentage of scheduled collections successfully realized.
* `top_borrower_concentration`: Percentage of loan book concentrated in top 3 borrowers.
* `health_score`: Numerical rating ($0 - 100$).
* `health_grade`: Categorical band (`'EXCELLENT'`, `'GOOD'`, `'FAIR'`, `'POOR'`, `'CRITICAL'`).
* `ai_interpretation`: Executive summary generated by Groq LLM.
* `created_at`: Snapshot generation timestamp.

---

## 5. Mathematical Formulations & Health Scoring

### 1. Collection Efficiency Formula
$$\text{Collection Efficiency} = \left( \frac{\sum \text{Paid Amount on Matured Schedules}}{\sum \text{Scheduled Amount on Matured Schedules}} \right) \times 100$$

### 2. Portfolio Delinquency Rate
$$\text{Delinquency Rate} = \left( \frac{\sum \text{Unpaid Amount where } \text{status} = \text{'overdue'}}{\text{Total Active Portfolio Principal}} \right) \times 100$$

### 3. Top-3 Borrower Concentration Ratio
$$\text{Concentration Ratio} = \left( \frac{\sum_{i=1}^{3} \text{Principal Exposure of Borrower}_i}{\text{Total Active Portfolio Principal}} \right) \times 100$$

### 4. Overall Health Score Calculation
$$\text{Health Score} = 0.40 \cdot \text{Collection Efficiency} + 0.35 \cdot (100 - \text{Delinquency Rate}) + 0.25 \cdot (100 - \text{Concentration Penalty})$$

---

## 6. Comprehensive Test Cases & Scenarios

| Test ID | Scenario | Input Loan Book State | Expected Output | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **TC-5.1** | High Performing Loan Book | Collection Efficiency $> 95\%$, Delinquency $< 3\%$ | Health Score: `92/100`, Grade: `EXCELLENT`. Narrative: `"Portfolio performing exceptionally well."` | Inspect Snapshot Card in `/agents`. |
| **TC-5.2** | High Concentration Warning | Top 3 borrowers hold $> 40\%$ of total principal | Flags concentration risk alert in AI narrative; applies penalty to Health Score. | Verify concentration metric in UI. |
| **TC-5.3** | Deteriorating Delinquency | Overdue amount spikes to $> 15\%$ of portfolio | Health Grade drops to `POOR` / `CRITICAL`; recommends increasing ECL (Expected Credit Loss) reserves. | Check snapshot record in DB. |
| **TC-5.4** | Global Execution Lock | Trigger portfolio analysis twice within 2 seconds | Second execution receives cached lock response, preventing double computation. | Check `agentLock.js` logs. |
| **TC-5.5** | Real-Time Dashboard KPI Sync | Agent 5 completes analysis | Automatically broadcasts WebSocket event updating live KPI counter widgets across all logged-in client screens. | Check browser network WS frames. |
