# Agent 2: Credit Risk Assessment & Early Warning Surveillance (EWS) Agent

---

## 1. Executive Summary
The **Credit Risk Assessment & Early Warning Surveillance (EWS) Agent** (`agent_2_risk`) is the autonomous borrower risk monitoring and delinquency forecasting engine of FinanceFlow AI. It evaluates corporate financial health, historical repayment discipline, installment default frequency, and debt servicing capacity to generate real-time **Probability of Default (PD %)** metrics and actionable mitigation strategies.

* **System ID**: `agent_2_risk`
* **Agent Role**: Autonomous Credit Risk Profiler & Early Warning Delinquency Forecaster
* **Execution Model**: Multi-Tool Financial Data Aggregation + Deterministic Metric Modeling + Groq LLM Qualitative Synthesis

```
   ┌──────────────────────┐
   │ Borrower Profile ID  │
   └──────────┬───────────┘
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Tool Ingestion Layer:                                     │
   │  - getCompanyFinancials (Active loans, total exposure)    │
   │  - getRepaymentHistory (Delinquency days, overdue count)  │
   │  - getRecentAuditEvents (Covenant violations, reversals)  │
   └──────────┬────────────────────────────────────────────────┘
              │
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Quantitative Risk Formulation:                           │
   │  - On-Time Payment Ratio                                  │
   │  - Maximum Days Past Due (DPD)                            │
   │  - Debt Service Coverage & Exposure Concentration         │
   └──────────┬────────────────────────────────────────────────┘
              │
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Groq LLM Synthesis (llama-3.3-70b-versatile):             │
   │  - Risk Level: LOW / MEDIUM / HIGH / CRITICAL             │
   │  - Risk Score (0 - 100) & Probability of Default (PD %)   │
   │  - Early Warning Indicators & Actionable Recommendations  │
   └──────────┬────────────────────────────────────────────────┘
              │
              ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Persisted in `risk_assessments` & Displayed in UI Drawer  │
   └───────────────────────────────────────────────────────────┘
```

---

## 2. Problem Solved & Business Use Case
In traditional SME and corporate lending, loan books are reviewed on a quarterly or annual basis. By the time a borrower reaches 90 Days Past Due (Non-Performing Asset / NPA), recovery options are severely limited and collateral values may have eroded.
* **Agent 2 Solution**: Runs continuous surveillance after every payment event or schedule due date. It detects subtle repayment friction (e.g. paying 7 days late for 3 consecutive months, partial payments, increasing utilization) and alerts risk officers weeks before an actual payment default occurs.

---

## 3. Technical Configuration & Parameters
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
* **Temperature**: `0.2` (Analytical, objective risk assessment)
* **Max Tokens**: `2,048`
* **System Prompt**: `RISK_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/risk.prompt.js`
* **Lock Key**: `RISK_ASSESSMENT_{company_id}` (Prevents concurrent duplicate evaluations)

### Registered Tool Specifications
1. **`getCompanyFinancials`**: Retrieves active loan facilities, total principal borrowed, total repayable, and remaining outstanding balance.
2. **`getRepaymentHistory`**: Queries all past due dates, on-time payments, partially paid installments, and overdue milestones.
3. **`getRecentAuditEvents`**: Inspects user overrides, payment reversals, and administrative edits for compliance anomalies.

---

## 4. Database Schema & Data Dependencies

```
  ┌───────────────────────┐          ┌───────────────────────┐
  │       companies       ├─────────►│   risk_assessments    │
  └───────────┬───────────┘          └───────────────────────┘
              │
              ▼
  ┌───────────────────────┐          ┌───────────────────────┐
  │         loans         ├─────────►│  repayment_schedules  │
  └───────────────────────┘          └───────────────────────┘
```

### Table Schema Mappings
* **`companies`**: `id`, `company_name`, `registration_number`, `tax_identifier`, `status`.
* **`loans`**: `id`, `company_id`, `loan_number`, `principal_amount`, `interest_rate`, `total_payable`, `start_date`, `end_date`, `status`.
* **`repayment_schedules`**: `id`, `loan_id`, `installment_number`, `due_date`, `scheduled_amount`, `paid_amount`, `status`.
* **`risk_assessments`**: `id`, `company_id`, `risk_score` (0–100), `risk_level` (`'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'`), `probability_of_default` (Decimal %), `ai_analysis_report` (JSON / Text), `created_at`.

---

## 5. Decision Engine & Risk Classification Formulas

### Quantitative Delinquency Index (QDI)
The quantitative risk score $R_{\text{quant}} \in [0, 100]$ is calculated as:
$$R_{\text{quant}} = w_1 \cdot \text{DPD\_Score} + w_2 \cdot (1 - \text{OnTime\_Ratio}) \cdot 100 + w_3 \cdot \text{Overdue\_Exposure\_Ratio} \cdot 100$$
Where:
* $w_1 = 0.45$, $w_2 = 0.35$, $w_3 = 0.20$
* $\text{DPD\_Score} = \min\left(100, \frac{\text{Max Overdue Days}}{90} \times 100\right)$
* $\text{OnTime\_Ratio} = \frac{\text{Count of Paid On-Time Installments}}{\text{Total Installments Elapsed}}$
* $\text{Overdue\_Exposure\_Ratio} = \frac{\text{Total Overdue Amount}}{\text{Total Loan Amount}}$

### Risk Rating Band Matrix
| Risk Grade | Score Range | Probability of Default (PD) | Recommended Credit Action |
| :--- | :--- | :--- | :--- |
| **LOW** | $0 \le \text{Score} < 30$ | $< 5.0\%$ | Eligible for credit limit enhancement and interest rate rebate. |
| **MEDIUM** | $30 \le \text{Score} < 60$ | $5.0\% - 25.0\%$ | Standard monitoring; automated reminder 3 days before due date. |
| **HIGH** | $60 \le \text{Score} < 80$ | $25.0\% - 65.0\%$ | Restrict credit extensions; issue formal cure notice (Agent 3). |
| **CRITICAL** | $80 \le \text{Score} \le 100$ | $> 65.0\%$ | Freeze loan facility; enforce collateral lien; initiate legal recovery. |

---

## 6. Execution Lifecycle & Logging
1. `RUN_STARTED`: Logs trigger from User UI (`/companies` -> *Risk Health*) or automated background scan.
2. `FETCH_FINANCIAL_PROFILE`: Invokes `getCompanyFinancials`.
3. `ANALYZE_REPAYMENT_CADENCE`: Computes overdue installment timeline.
4. `GROQ_RISK_SYNTHESIS`: Generates qualitative narrative, PD %, and mitigation plan.
5. `RISK_RECORD_PERSISTED`: Inserts record into `risk_assessments`.
6. `RUN_COMPLETED`: Broadcasts WebSocket update to dashboard KPI monitors.

---

## 7. Comprehensive Test Cases & Scenarios

| Test ID | Scenario | Input Borrower | Expected Risk Output | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **TC-2.1** | Pristine Repayment History | `ABC Technologies Pvt Ltd` (#1) | Risk: `LOW`, Score: `12/100`, PD: `2.4%`. Action: `"Low risk profile; maintain standard credit surveillance."` | Inspect Risk Assessment Drawer in UI. |
| **TC-2.2** | Moderate Delay Trend | `CyberNet Systems Inc` (#5) | Risk: `HIGH`, Score: `68/100`, PD: `38.2%`. Action: `"Issue formal cure notice; require cash flow statements."` | Verify `risk_assessments` table record. |
| **TC-2.3** | Severe Delinquency & Default Imminent | `Apex Logistics Pvt Ltd` (#4) | Risk: `CRITICAL`, Score: `88/100`, PD: `78.4%`. Action: `"Initiate legal recovery under Sec 138; freeze facility."` | Check EWS alert badge and AI report. |
| **TC-2.4** | Multi-Loan Exposure Aggregation | Borrower with 2 active facilities | Correctly sums principal and overdue amounts across both contracts before calculating exposure ratio. | Verify multi-contract aggregation query. |
| **TC-2.5** | Concurrency Lock Integrity | Trigger 2 assessments simultaneously for Company #1 | Second execution receives cache/wait response without duplicate database inserts. | Check `agentLock.js` logs. |
