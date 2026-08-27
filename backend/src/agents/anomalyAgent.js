import pool from '../config/db.js';
import { groq, GROQ_MODEL } from '../config/groq.config.js';
import {
  getPaymentWithContext,
  getPaymentHistory,
  getExpectedEMI,
  getTotalOutstandingBalance,
  checkDuplicateFingerprint,
  getKnownPayerAccounts,
  getCompanyByAccount
} from '../tools/anomalyTools.js';
import { ANOMALY_AGENT_SYSTEM_PROMPT, createAnomalyUserPrompt } from '../prompts/anomaly.prompt.js';
import { createAgentRun, updateAgentRun } from '../models/agentRun.model.js';
import { logStep } from '../models/agentExecutionLog.model.js';
import { acquireAgentLock, releaseAgentLock } from '../utils/agentLock.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Agent 7: Financial Transaction Anomaly Detection Agent
 *
 * Architecture:
 *   Stage A (Pre-Match): Runs immediately after payment ingestion.
 *     Checks: duplicate fingerprint, unknown payer, gross amount vs. dataset
 *   Stage B (Post-Match): Runs after Agent 1 identifies company + loan.
 *     Checks: amount vs. total outstanding, overpayment, partial payment pattern, timing
 *
 * Design Principles:
 *   - Deterministic engine computes the anomaly score (never Groq)
 *   - Groq explains findings in plain English only
 *   - Agent 7 is strictly READ-ONLY (never modifies financial tables)
 *   - safe_to_proceed=true for all but CRITICAL severity (human approves waterfall)
 *
 * Score → Severity mapping:
 *    0–19  CLEAR
 *   20–39  LOW
 *   40–69  MEDIUM
 *   70–89  HIGH
 *   90–100 CRITICAL
 */

const AGENT_ID   = 'agent_7_anomaly';
const AGENT_NAME = 'Financial Transaction Anomaly Detection Agent';

// ─── Deterministic Scoring Weights ──────────────────────────────────────────
const SCORES = {
  DUPLICATE_PAYMENT:        30,
  UNKNOWN_PAYER:            30,
  AMOUNT_ANOMALY:           25,
  OVERPAYMENT:              15,
  PARTIAL_PAYMENT_PATTERN:  17,
  TIMING_DEVIATION:         10,
};

// ─── Severity Boundaries ────────────────────────────────────────────────────
const getSeverity = (score) => {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'CLEAR';
};

// ─── Helper: Save/upsert anomaly record to DB ────────────────────────────────
const saveAnomalyRecord = async ({
  paymentId, caseId = null, companyId = null, loanId = null,
  detectionStage, anomalyDetected, anomalyTypes, anomalyScore,
  deterministic_score, scoreBreakdown, severity, explanation,
  recommendation, safeToProced, runId, triggeredBy
}) => {
  // Upsert: update existing record for same payment_id, or insert new
  const [existing] = await pool.query(
    `SELECT id FROM payment_anomalies WHERE payment_id = ? AND detection_stage = ? LIMIT 1`,
    [paymentId, detectionStage]
  );

  const payload = [
    companyId, loanId, caseId,
    anomalyDetected ? 1 : 0,
    JSON.stringify(anomalyTypes),
    anomalyScore.toFixed(2),
    deterministic_score.toFixed(2),
    JSON.stringify(scoreBreakdown),
    severity,
    explanation || null,
    recommendation || null,
    safeToProced ? 1 : 0,
    anomalyDetected ? 'pending' : 'cleared',
    runId || null,
    triggeredBy || null
  ];

  if (existing.length > 0) {
    await pool.query(
      `UPDATE payment_anomalies SET
         company_id=?, loan_id=?, case_id=?,
         anomaly_detected=?, anomaly_types=?, anomaly_score=?,
         deterministic_score=?, score_breakdown=?,
         severity=?, explanation=?, recommendation=?,
         safe_to_proceed=?, status=?,
         agent_run_id=?, triggered_by=?,
         detection_stage=?,
         updated_at=NOW()
       WHERE payment_id=? AND detection_stage=?`,
      [...payload, detectionStage, paymentId, detectionStage]
    );
    return existing[0].id;
  } else {
    const [result] = await pool.query(
      `INSERT INTO payment_anomalies
         (payment_id, company_id, loan_id, case_id,
          anomaly_detected, anomaly_types, anomaly_score,
          deterministic_score, score_breakdown,
          severity, explanation, recommendation,
          safe_to_proceed, status,
          agent_run_id, triggered_by, detection_stage)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [paymentId, ...payload, detectionStage]
    );
    return result.insertId;
  }
};

// ─── Groq Explanation (read-only, non-scoring) ───────────────────────────────
const callGroqForExplanation = async (payment, checks, scoreBreakdown, anomalyScore, severity, company, loan) => {
  try {
    const userPrompt = createAnomalyUserPrompt(payment, checks, scoreBreakdown, anomalyScore, severity, company, loan);

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.15,
      max_tokens: 512,
      messages: [
        { role: 'system', content: ANOMALY_AGENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Extract JSON block
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    const parsed = JSON.parse(cleaned);
    return {
      explanation: parsed.explanation || null,
      recommendation: parsed.recommendation || null,
      tokens: completion.usage?.total_tokens || 0
    };
  } catch (err) {
    console.warn(`[Anomaly Agent] Groq explanation failed (non-critical): ${err.message}`);
    return {
      explanation: 'Automated anomaly analysis completed. Manual review recommended based on the flagged checks.',
      recommendation: 'Review payment details with operations team before proceeding with waterfall allocation.',
      tokens: 0
    };
  }
};


// ════════════════════════════════════════════════════════════════════════════
// STAGE A — Pre-Match Anomaly Detection
// Runs immediately after payment ingestion (payment_id known, company/loan may not be)
// ════════════════════════════════════════════════════════════════════════════
export const runAnomalyAgentStageA = async (paymentId, triggeredBy = null) => {
  if (!acquireAgentLock(AGENT_ID, `stageA_${paymentId}`)) {
    console.warn(`[Anomaly Agent] Stage A lock active for payment #${paymentId}. Skipping.`);
    return null;
  }

  const startTime = Date.now();
  let runId = null;

  try {
    // 1. Load payment record
    const payment = await getPaymentWithContext(paymentId);
    if (!payment) {
      console.warn(`[Anomaly Agent] Payment #${paymentId} not found. Aborting Stage A.`);
      return null;
    }

    runId = await createAgentRun({
      agent_id: AGENT_ID,
      agent_name: AGENT_NAME,
      triggered_by: triggeredBy,
      trigger_type: triggeredBy ? 'manual' : 'auto',
      case_id: null,
      company_id: payment.company_id || null
    });

    await logStep({ agent_run_id: runId, agent_id: AGENT_ID, step_type: 'TOOL_EXECUTED', step_name: 'PAYMENT_LOADED', status: 'completed', input_data: { payment_id: paymentId } });

    const checks = {};
    const scoreBreakdown = {};
    let totalScore = 0;

    // ── Check 1: Duplicate Payment Fingerprint ─────────────────────────────
    const duplicates = await checkDuplicateFingerprint(
      payment.amount,
      payment.company_id,
      payment.loan_id,
      payment.payment_date,
      paymentId
    );
    if (duplicates.length > 0) {
      const pts = SCORES.DUPLICATE_PAYMENT;
      checks.DUPLICATE_PAYMENT = {
        triggered: true,
        detail: `Found ${duplicates.length} near-identical payment(s) — same company, amount ₹${parseFloat(payment.amount).toLocaleString('en-IN')}, within ±1 day. IDs: ${duplicates.map(d => d.id).join(', ')}.`,
        matching_payment_ids: duplicates.map(d => d.id)
      };
      scoreBreakdown.DUPLICATE_PAYMENT = pts;
      totalScore += pts;
    } else {
      checks.DUPLICATE_PAYMENT = { triggered: false, detail: 'No duplicate fingerprint found.' };
    }

    // ── Check 2: Unknown Payer Account ─────────────────────────────────────
    const senderAccount = String(payment.sender_account || '').trim();
    let unknownPayer = false;
    if (senderAccount && payment.company_id) {
      const knownAccounts = await getKnownPayerAccounts(payment.company_id);
      unknownPayer = knownAccounts.length > 0 && !knownAccounts.includes(senderAccount);
      if (unknownPayer) {
        const pts = SCORES.UNKNOWN_PAYER;
        checks.UNKNOWN_PAYER = {
          triggered: true,
          detail: `Payment from account ${senderAccount} not found in company's registered accounts: [${knownAccounts.join(', ')}].`,
          registered_accounts: knownAccounts,
          sender_account: senderAccount
        };
        scoreBreakdown.UNKNOWN_PAYER = pts;
        totalScore += pts;
      } else {
        checks.UNKNOWN_PAYER = { triggered: false, detail: 'Payer account matches registered company account.' };
      }
    } else {
      checks.UNKNOWN_PAYER = { triggered: false, detail: 'Payer account check skipped (no account number or company context).' };
    }

    await logStep({ agent_run_id: runId, agent_id: AGENT_ID, step_type: 'DECISION', step_name: 'CHECKS_COMPLETED', status: 'completed', input_data: { checks, scoreBreakdown, totalScore } });

    const severity = getSeverity(totalScore);
    const anomalyDetected = totalScore >= 20;

    // Groq explanation only if anomaly detected
    let explanation = null, recommendation = null, tokens = 0;
    if (anomalyDetected) {
      ({ explanation, recommendation, tokens } = await callGroqForExplanation(
        payment, checks, scoreBreakdown, totalScore, severity,
        payment.company_id ? { id: payment.company_id, company_name: payment.company_name, bank_account_number: payment.registered_account } : null,
        null
      ));
    }

    const anomalyId = await saveAnomalyRecord({
      paymentId, caseId: null,
      companyId: payment.company_id, loanId: payment.loan_id,
      detectionStage: 'stage_a',
      anomalyDetected,
      anomalyTypes: Object.keys(checks).filter(k => checks[k].triggered),
      anomalyScore: Math.min(100, totalScore),
      deterministic_score: Math.min(100, totalScore),
      scoreBreakdown,
      severity,
      explanation,
      recommendation,
      safeToProced: totalScore < 90,
      runId,
      triggeredBy
    });

    const durationMs = Date.now() - startTime;
    await updateAgentRun(runId, {
      status: 'completed',
      duration_ms: durationMs,
      groq_called: anomalyDetected ? 1 : 0,
      total_tokens: tokens,
      confidence_score: totalScore,
      result_summary: `Stage A: ${anomalyDetected ? `${severity} anomaly detected` : 'CLEAR'} (score: ${totalScore.toFixed(0)})`
    });

    if (anomalyDetected) {
      emitSocketEvent('ANOMALY_DETECTED', {
        payment_id: paymentId,
        anomaly_id: anomalyId,
        severity,
        anomaly_score: totalScore,
        anomaly_types: Object.keys(checks).filter(k => checks[k].triggered),
        stage: 'A'
      });
    }

    console.log(`[Anomaly Agent] Stage A complete for payment #${paymentId} — Score: ${totalScore} (${severity})`);
    return { anomaly_id: anomalyId, anomaly_score: totalScore, severity, anomaly_detected: anomalyDetected, stage: 'A' };

  } catch (err) {
    console.error(`[Anomaly Agent] Stage A error for payment #${paymentId}:`, err.message);
    if (runId) {
      await updateAgentRun(runId, { status: 'failed', error_message: err.message }).catch(() => {});
    }
    return null;
  } finally {
    releaseAgentLock(AGENT_ID, `stageA_${paymentId}`);
  }
};


// ════════════════════════════════════════════════════════════════════════════
// STAGE B — Post-Match Anomaly Detection
// Runs after Agent 1 identifies company + loan for this payment
// ════════════════════════════════════════════════════════════════════════════
export const runAnomalyAgentStageB = async (paymentId, caseId = null, triggeredBy = null) => {
  if (!acquireAgentLock(AGENT_ID, `stageB_${paymentId}`)) {
    console.warn(`[Anomaly Agent] Stage B lock active for payment #${paymentId}. Skipping.`);
    return null;
  }

  const startTime = Date.now();
  let runId = null;

  try {
    // 1. Load enriched payment record
    const payment = await getPaymentWithContext(paymentId);
    if (!payment) {
      console.warn(`[Anomaly Agent] Payment #${paymentId} not found. Aborting Stage B.`);
      return null;
    }
    if (!payment.company_id || !payment.loan_id) {
      console.info(`[Anomaly Agent] Stage B skipped for payment #${paymentId} — company/loan not yet matched.`);
      return null;
    }

    runId = await createAgentRun({
      agent_id: AGENT_ID,
      agent_name: AGENT_NAME,
      triggered_by: triggeredBy,
      trigger_type: triggeredBy ? 'manual' : 'auto',
      case_id: caseId,
      company_id: payment.company_id
    });

    await logStep({ agent_run_id: runId, agent_id: AGENT_ID, step_type: 'TOOL_EXECUTED', step_name: 'PAYMENT_LOADED', status: 'completed', input_data: { payment_id: paymentId, company_id: payment.company_id, loan_id: payment.loan_id } });

    const checks = {};
    const scoreBreakdown = {};
    let totalScore = 0;
    const paymentAmount = parseFloat(payment.amount);

    // ── Load Context ────────────────────────────────────────────────────────
    const [expectedEMI, outstandingData, paymentHistory, knownAccounts] = await Promise.all([
      getExpectedEMI(payment.loan_id),
      getTotalOutstandingBalance(payment.loan_id),
      getPaymentHistory(payment.company_id, payment.loan_id, 8),
      getKnownPayerAccounts(payment.company_id)
    ]);

    const emiAmount   = expectedEMI ? parseFloat(expectedEMI.scheduled_amount) : 0;
    const totalOutstanding = outstandingData.total_outstanding;
    const overdueCount = outstandingData.overdue_count;

    await logStep({ agent_run_id: runId, agent_id: AGENT_ID, step_type: 'TOOL_EXECUTED', step_name: 'CONTEXT_LOADED', status: 'completed', input_data: { emi_amount: emiAmount, total_outstanding: totalOutstanding, overdue_count: overdueCount, history_count: paymentHistory.length } });

    // ── Check 1: Duplicate Payment Fingerprint ─────────────────────────────
    const duplicates = await checkDuplicateFingerprint(paymentAmount, payment.company_id, payment.loan_id, payment.payment_date, paymentId);
    if (duplicates.length > 0) {
      const pts = SCORES.DUPLICATE_PAYMENT;
      checks.DUPLICATE_PAYMENT = {
        triggered: true,
        detail: `${duplicates.length} near-identical payment(s) found within ±1 day (same company, loan, amount ₹${paymentAmount.toLocaleString('en-IN')}).`,
        matching_ids: duplicates.map(d => d.id)
      };
      scoreBreakdown.DUPLICATE_PAYMENT = pts;
      totalScore += pts;
    } else {
      checks.DUPLICATE_PAYMENT = { triggered: false, detail: 'No duplicate fingerprint detected.' };
    }

    // ── Check 2: Unknown Payer Account ─────────────────────────────────────
    const senderAccount = String(payment.sender_account || '').trim();
    if (senderAccount && knownAccounts.length > 0) {
      const isUnknown = !knownAccounts.includes(senderAccount);
      if (isUnknown) {
        const pts = SCORES.UNKNOWN_PAYER;
        checks.UNKNOWN_PAYER = {
          triggered: true,
          detail: `Sender account ${senderAccount} is not among registered accounts: [${knownAccounts.join(', ')}].`,
          registered_accounts: knownAccounts,
          sender_account: senderAccount
        };
        scoreBreakdown.UNKNOWN_PAYER = pts;
        totalScore += pts;
      } else {
        checks.UNKNOWN_PAYER = { triggered: false, detail: 'Payer account verified against company master.' };
      }
    } else {
      checks.UNKNOWN_PAYER = { triggered: false, detail: 'Payer account check not applicable (no registered accounts on file).' };
    }

    // ── Check 3: Smart Amount Anomaly ──────────────────────────────────────
    // Only flag if payment > 3× single EMI AND payment > total outstanding + 20%
    // A ₹4L payment against ₹6.6L outstanding (6 overdue installments) is NOT anomalous
    if (emiAmount > 0 && totalOutstanding > 0) {
      const deviationMultiple = paymentAmount / emiAmount;
      const outstandingRatio  = paymentAmount / totalOutstanding;

      if (deviationMultiple > 3 && outstandingRatio > 1.2) {
        const pts = SCORES.AMOUNT_ANOMALY;
        checks.AMOUNT_ANOMALY = {
          triggered: true,
          detail: `Payment ₹${paymentAmount.toLocaleString('en-IN')} is ${deviationMultiple.toFixed(1)}× the expected EMI (₹${emiAmount.toLocaleString('en-IN')}) and ${(outstandingRatio * 100).toFixed(0)}% of total outstanding ₹${totalOutstanding.toLocaleString('en-IN')} across ${overdueCount} installments.`,
          deviation_multiple: parseFloat(deviationMultiple.toFixed(2)),
          outstanding_ratio: parseFloat(outstandingRatio.toFixed(2))
        };
        scoreBreakdown.AMOUNT_ANOMALY = pts;
        totalScore += pts;
      } else {
        checks.AMOUNT_ANOMALY = {
          triggered: false,
          detail: `Payment ₹${paymentAmount.toLocaleString('en-IN')} is ${deviationMultiple.toFixed(1)}× EMI and covers ${Math.min(100, (outstandingRatio * 100)).toFixed(0)}% of ₹${totalOutstanding.toLocaleString('en-IN')} outstanding — within explainable range.`
        };
      }
    } else {
      checks.AMOUNT_ANOMALY = { triggered: false, detail: 'Amount anomaly check skipped (no active installment or outstanding balance data).' };
    }

    // ── Check 4: Overpayment vs Total Outstanding ──────────────────────────
    // Safe to proceed = true, but waterfall must route surplus to unallocated_credit
    if (totalOutstanding > 0 && paymentAmount > totalOutstanding * 1.05) {
      const surplus = paymentAmount - totalOutstanding;
      const pts = SCORES.OVERPAYMENT;
      checks.OVERPAYMENT = {
        triggered: true,
        detail: `Payment ₹${paymentAmount.toLocaleString('en-IN')} exceeds total outstanding ₹${totalOutstanding.toLocaleString('en-IN')} by ₹${surplus.toLocaleString('en-IN')} (${((surplus / totalOutstanding) * 100).toFixed(1)}% surplus). Excess should be held as unallocated credit.`,
        surplus_amount: parseFloat(surplus.toFixed(2)),
        safe_to_proceed: true
      };
      scoreBreakdown.OVERPAYMENT = pts;
      totalScore += pts;
    } else {
      checks.OVERPAYMENT = { triggered: false, detail: 'Payment does not exceed total outstanding balance.' };
    }

    // ── Check 5: Repeated Partial Payment Pattern ──────────────────────────
    // Only flag if last 4+ payments average < 60% of EMI (declining trend)
    if (emiAmount > 0 && paymentHistory.length >= 4) {
      const recentPayments = paymentHistory.slice(0, 6);
      const ratios = recentPayments.map(p => parseFloat(p.amount) / emiAmount);
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const partialCount = ratios.filter(r => r < 0.8).length;

      if (partialCount >= 4 && avgRatio < 0.6) {
        const pts = SCORES.PARTIAL_PAYMENT_PATTERN;
        checks.PARTIAL_PAYMENT_PATTERN = {
          triggered: true,
          detail: `${partialCount} of last ${recentPayments.length} payments were below 80% of EMI. Average payment ratio: ${(avgRatio * 100).toFixed(0)}% of ₹${emiAmount.toLocaleString('en-IN')} EMI. Borrower shows a sustained partial-payment pattern.`,
          partial_count: partialCount,
          avg_ratio: parseFloat(avgRatio.toFixed(3))
        };
        scoreBreakdown.PARTIAL_PAYMENT_PATTERN = pts;
        totalScore += pts;
      } else {
        checks.PARTIAL_PAYMENT_PATTERN = { triggered: false, detail: `Payment pattern normal (avg ${(avgRatio * 100).toFixed(0)}% of EMI across last ${recentPayments.length} payments).` };
      }
    } else {
      checks.PARTIAL_PAYMENT_PATTERN = { triggered: false, detail: 'Partial payment pattern check skipped (insufficient payment history — fewer than 4 records).' };
    }

    // ── Check 6: Timing Deviation (Historical Baseline) ───────────────────
    // Compare day-of-month vs historical median, NOT weekend/weekday
    if (paymentHistory.length >= 3) {
      const historicalDays = paymentHistory.map(p => p.day_of_month).filter(Boolean);
      const sortedDays = [...historicalDays].sort((a, b) => a - b);
      const medianDay = sortedDays[Math.floor(sortedDays.length / 2)];
      const currentDay = new Date(payment.payment_date).getDate();
      const deviation = Math.abs(currentDay - medianDay);

      if (deviation > 10) {
        const pts = SCORES.TIMING_DEVIATION;
        checks.TIMING_DEVIATION = {
          triggered: true,
          detail: `Payment received on the ${currentDay}${['st','nd','rd'][currentDay-1]||'th'} of the month. Historical payments typically arrive around day ${medianDay} (deviation: ${deviation} days).`,
          historical_median_day: medianDay,
          current_day: currentDay,
          deviation_days: deviation
        };
        scoreBreakdown.TIMING_DEVIATION = pts;
        totalScore += pts;
      } else {
        checks.TIMING_DEVIATION = { triggered: false, detail: `Payment timing normal (day ${currentDay} vs historical median day ${medianDay}, deviation ${deviation} days).` };
      }
    } else {
      checks.TIMING_DEVIATION = { triggered: false, detail: 'Timing check skipped (insufficient payment history — fewer than 3 records).' };
    }

    await logStep({ agent_run_id: runId, agent_id: AGENT_ID, step_type: 'DECISION', step_name: 'SCORING_COMPLETED', status: 'completed', input_data: { checks: Object.fromEntries(Object.entries(checks).map(([k,v]) => [k, v.triggered])), score_breakdown: scoreBreakdown, total_score: totalScore } });

    const finalScore  = Math.min(100, totalScore);
    const severity    = getSeverity(finalScore);
    const anomalyDetected = finalScore >= 20;

    // Groq explanation
    let explanation = null, recommendation = null, tokens = 0;
    if (anomalyDetected) {
      ({ explanation, recommendation, tokens } = await callGroqForExplanation(
        payment, checks, scoreBreakdown, finalScore, severity,
        { id: payment.company_id, company_name: payment.company_name, bank_account_number: payment.registered_account },
        { id: payment.loan_id, loan_number: payment.loan_number, principal_amount: payment.principal_amount }
      ));
    }

    const anomalyId = await saveAnomalyRecord({
      paymentId, caseId,
      companyId: payment.company_id, loanId: payment.loan_id,
      detectionStage: 'stage_b',
      anomalyDetected,
      anomalyTypes: Object.keys(checks).filter(k => checks[k].triggered),
      anomalyScore: finalScore,
      deterministic_score: finalScore,
      scoreBreakdown,
      severity,
      explanation,
      recommendation,
      safeToProced: finalScore < 90,
      runId,
      triggeredBy
    });

    const durationMs = Date.now() - startTime;
    await updateAgentRun(runId, {
      status: 'completed',
      duration_ms: durationMs,
      groq_called: anomalyDetected ? 1 : 0,
      total_tokens: tokens,
      confidence_score: finalScore,
      result_summary: `Stage B: ${anomalyDetected ? `${severity} anomaly (${Object.keys(scoreBreakdown).join(', ')})` : 'CLEAR'} — Score: ${finalScore}`
    });

    if (anomalyDetected) {
      emitSocketEvent('ANOMALY_DETECTED', {
        payment_id: paymentId,
        case_id: caseId,
        company_id: payment.company_id,
        company_name: payment.company_name,
        anomaly_id: anomalyId,
        severity,
        anomaly_score: finalScore,
        anomaly_types: Object.keys(checks).filter(k => checks[k].triggered),
        explanation,
        stage: 'B'
      });
    }

    console.log(`[Anomaly Agent] Stage B complete for payment #${paymentId} — Score: ${finalScore} (${severity})`);
    return {
      anomaly_id: anomalyId,
      anomaly_score: finalScore,
      severity,
      anomaly_detected: anomalyDetected,
      anomaly_types: Object.keys(checks).filter(k => checks[k].triggered),
      safe_to_proceed: finalScore < 90,
      stage: 'B'
    };

  } catch (err) {
    console.error(`[Anomaly Agent] Stage B error for payment #${paymentId}:`, err.message);
    if (runId) {
      await updateAgentRun(runId, { status: 'failed', error_message: err.message }).catch(() => {});
    }
    return null;
  } finally {
    releaseAgentLock(AGENT_ID, `stageB_${paymentId}`);
  }
};
