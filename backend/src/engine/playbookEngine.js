import pool from '../config/db.js';

/**
 * Standardized Operational Playbooks (SOP) Master Registry
 * Single Source of Truth for Agent 7 and Human Review Workflows.
 */
export const PLAYBOOKS = {
  PLAYBOOK_DUPLICATE_PAYMENT: {
    id: 'PLAYBOOK_DUPLICATE_PAYMENT',
    title: 'Duplicate Payment Verification & Hold',
    trigger: 'Duplicate Payment / Hash Collision',
    severity: 'HIGH',
    estimatedDuration: '3-5 min',
    safeToAllocate: false,
    requiresManualReview: true,
    requiresAgent6Escalation: true,
    description: 'Payment matches another ledger deposit based on exact UTR/reference, amount, or hash collision.',
    steps: [
      { id: 1, label: 'Cross-verify matching payment UTR / TXN', desc: 'Identify and compare the duplicate candidate in payment ledger records.' },
      { id: 2, label: 'Compare Case #, Payment #, and TXN ID', desc: 'Confirm multi-level traceability identifiers against original transaction.' },
      { id: 3, label: 'Verify timestamps and payer accounts', desc: 'Check sender bank account number and bank gateway timestamp.' },
      { id: 4, label: 'Recommend allocation hold', desc: 'Ensure fund allocation remains paused until verification is confirmed.' },
      { id: 5, label: 'Prepare formal notice for Agent 6 escalation', desc: 'If confirmed duplicate, route to Agent 6 notification dispatcher for refund/notice.' }
    ]
  },

  PLAYBOOK_UNKNOWN_PAYER: {
    id: 'PLAYBOOK_UNKNOWN_PAYER',
    title: 'Payer Identity & Customer Account Mapping',
    trigger: 'Unknown Payer / Account Mismatch',
    severity: 'HIGH',
    estimatedDuration: '4-6 min',
    safeToAllocate: false,
    requiresManualReview: true,
    requiresAgent6Escalation: true,
    description: 'Sender account or company name is not registered in the borrower facility directory.',
    steps: [
      { id: 1, label: 'Compare sender bank account with borrower master', desc: 'Search for virtual accounts or secondary business entities.' },
      { id: 2, label: 'Check nearest registered borrower candidate', desc: 'Review fuzzy company candidate suggestions from Pre-Check Engine.' },
      { id: 3, label: 'Verify payment narration syntax & UTR', desc: 'Inspect bank remarks for loan account number or invoice ID.' },
      { id: 4, label: 'Hold ledger allocation pending account re-assignment', desc: 'Prevent automated unallocated crediting.' },
      { id: 5, label: 'Dispatch request-for-info notice via Agent 6', desc: 'Request updated KYC / authorized account details from borrower if unresolved.' }
    ]
  },

  PLAYBOOK_AMOUNT_VARIANCE: {
    id: 'PLAYBOOK_AMOUNT_VARIANCE',
    title: 'Amount Discrepancy & Overpayment Investigation',
    trigger: 'Amount Anomaly / Overpayment / Underpayment',
    severity: 'MEDIUM',
    estimatedDuration: '3-4 min',
    safeToAllocate: false,
    requiresManualReview: true,
    requiresAgent6Escalation: false,
    description: 'Deposit amount differs significantly from the expected schedule installment EMI.',
    steps: [
      { id: 1, label: 'Compare received deposit vs expected schedule EMI', desc: 'Calculate variance (+/- surplus or shortfall amount).' },
      { id: 2, label: 'Check outstanding loan balance & prepayment terms', desc: 'Determine if borrower is pre-closing future milestones.' },
      { id: 3, label: 'Verify borrower intent & installment breakdown', desc: 'Ensure interest and principal caps match contract terms.' },
      { id: 4, label: 'Determine pre-closure vs refund policy', desc: 'Confirm whether surplus should reduce principal or be held.' },
      { id: 5, label: 'Authorize allocation override with credit approval', desc: 'Approve customized allocation only if policy permits.' }
    ]
  },

  PLAYBOOK_SLA_DEFAULT: {
    id: 'PLAYBOOK_SLA_DEFAULT',
    title: 'Urgent SLA Default & Formal Escalation',
    trigger: 'SLA Escalation Breach / High Risk Default',
    severity: 'CRITICAL',
    estimatedDuration: '5-8 min',
    safeToAllocate: false,
    requiresManualReview: true,
    requiresAgent6Escalation: true,
    description: 'Borrower facility exhibits critical risk score with overdue installments or SLA breaches.',
    steps: [
      { id: 1, label: 'Review overdue installment timeline & delinquency', desc: 'Inspect missed payment dates and accumulated overdue charges.' },
      { id: 2, label: 'Verify Agent 2 continuous credit score', desc: 'Check risk score degradation and default probability.' },
      { id: 3, label: 'Review previous collection notices history', desc: 'Verify if Agent 3 soft reminders were dispatched and acknowledged.' },
      { id: 4, label: 'Recommend facility hold for authorized review', desc: 'Flag credit facility for Senior Risk Officer review.' },
      { id: 5, label: 'Prepare formal default notification for Agent 6', desc: 'Dispatch formal cure notice / legal escalation via Agent 6 dispatcher.' }
    ]
  },

  PLAYBOOK_WATERFALL_ALLOCATION: {
    id: 'PLAYBOOK_WATERFALL_ALLOCATION',
    title: 'Continuous Waterfall Allocation Audit',
    trigger: 'Unallocated Deposit / Multi-Schedule Milestone',
    severity: 'LOW',
    estimatedDuration: '2-3 min',
    safeToAllocate: true,
    requiresManualReview: false,
    requiresAgent6Escalation: false,
    description: 'Multi-milestone settlement requiring strict interest-first waterfall sequence validation.',
    steps: [
      { id: 1, label: 'Review borrower active loans & schedules', desc: 'Confirm priority order of outstanding installments.' },
      { id: 2, label: 'Validate interest vs principal allocation sequence', desc: 'Ensure statutory interest is satisfied before principal reduction.' },
      { id: 3, label: 'Check for overdue penalty fees or late charges', desc: 'Verify any penalty deductions prior to principal credit.' },
      { id: 4, label: 'Authorize continuous waterfall settlement', desc: 'Execute autonomous allocation across schedule milestones.' }
    ]
  },

  PLAYBOOK_STANDARD_RECONCILIATION: {
    id: 'PLAYBOOK_STANDARD_RECONCILIATION',
    title: 'Standard Payment Reconciliation Review',
    trigger: 'Standard Review',
    severity: 'LOW',
    estimatedDuration: '2 min',
    safeToAllocate: true,
    requiresManualReview: false,
    requiresAgent6Escalation: false,
    description: 'Standard single-schedule settlement review.',
    steps: [
      { id: 1, label: 'Verify bank deposit evidence against candidate borrower', desc: 'Confirm payer account and transaction reference.' },
      { id: 2, label: 'Check installment schedule allocation match', desc: 'Ensure exact EMI amount alignment.' },
      { id: 3, label: 'Approve ledger match', desc: 'Commit ledger reconciliation and update status.' }
    ]
  }
};

let initPromise = null;

/**
 * Initialize DB table for auditable playbook progress tracking
 */
export const initPlaybookDatabase = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS case_playbook_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            case_id INT NOT NULL,
            playbook_id VARCHAR(64) NOT NULL,
            step_id INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'completed',
            completed_by VARCHAR(100) DEFAULT 'Accountant',
            completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            UNIQUE KEY uq_case_step (case_id, playbook_id, step_id),
            INDEX idx_case (case_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS case_playbook_status (
            case_id INT PRIMARY KEY,
            playbook_id VARCHAR(64) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
            started_at DATETIME DEFAULT NULL,
            completed_at DATETIME DEFAULT NULL,
            completed_by VARCHAR(100) DEFAULT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err) {
        console.warn('[Playbook Engine] Table initialization check:', err.message);
      }
    })();
  }
  return initPromise;
};

// Start initialization
initPlaybookDatabase();

/**
 * Deterministically selects the appropriate Playbook based on detected anomaly types and priority.
 * 
 * Priority Hierarchy:
 * 1. DUPLICATE_PAYMENT / HASH_COLLISION
 * 2. UNKNOWN_PAYER / ACCOUNT_MISMATCH
 * 3. AMOUNT_ANOMALY / OVERPAYMENT / UNDERPAYMENT
 * 4. SLA_ESCALATION_BREACH / HIGH_RISK_DEFAULT
 * 5. UNALLOCATED_DEPOSIT / MULTI_SCHEDULE
 * 
 * @param {Object} params - { anomalyTypes, severity, recommendation, priority, caseId }
 * @returns {Object} Selected Playbook with evidence and metadata
 */
export const selectPlaybookForAnomaly = (params = {}) => {
  const types = Array.isArray(params.anomalyTypes)
    ? params.anomalyTypes.map(t => String(t).toUpperCase().trim())
    : (params.anomalyTypes ? [String(params.anomalyTypes).toUpperCase().trim()] : []);

  const severity = String(params.severity || 'MEDIUM').toUpperCase();
  const priority = String(params.priority || 'medium').toLowerCase();

  let selectedKey = 'PLAYBOOK_STANDARD_RECONCILIATION';
  let primaryTrigger = 'Standard Reconciliation';
  let evidenceList = [];

  // 1. Priority 1: Duplicate Payment
  if (types.some(t => t.includes('DUPLICATE') || t.includes('HASH_COLLISION'))) {
    selectedKey = 'PLAYBOOK_DUPLICATE_PAYMENT';
    primaryTrigger = 'Duplicate Payment Detected';
    evidenceList.push('Payment matches an existing bank transaction reference or identical amount footprint.');
  }
  // 2. Priority 2: Unknown Payer / Account Mismatch
  else if (types.some(t => t.includes('UNKNOWN') || t.includes('PAYER') || t.includes('ACCOUNT_MISMATCH'))) {
    selectedKey = 'PLAYBOOK_UNKNOWN_PAYER';
    primaryTrigger = 'Unknown Payer / Unregistered Account';
    evidenceList.push('Sender bank account is not registered in the borrower facility master directory.');
  }
  // 3. Priority 3: Amount Variance / Overpayment
  else if (types.some(t => t.includes('AMOUNT') || t.includes('OVERPAYMENT') || t.includes('UNDERPAYMENT') || t.includes('SURPLUS') || t.includes('VARIANCE'))) {
    selectedKey = 'PLAYBOOK_AMOUNT_VARIANCE';
    primaryTrigger = 'Amount Discrepancy / Overpayment';
    evidenceList.push('Deposit amount does not match expected schedule installment EMI.');
  }
  // 4. Priority 4: SLA Default / Critical Priority
  else if (types.some(t => t.includes('SLA') || t.includes('DEFAULT') || t.includes('CRITICAL')) || priority === 'critical' || severity === 'CRITICAL') {
    selectedKey = 'PLAYBOOK_SLA_DEFAULT';
    primaryTrigger = 'Urgent SLA Default / High Delinquency Risk';
    evidenceList.push('Overdue installments exceed SLA grace thresholds with elevated credit risk.');
  }
  // 5. Priority 5: Waterfall Allocation
  else if (types.some(t => t.includes('UNALLOCATED') || t.includes('WATERFALL') || t.includes('MULTI'))) {
    selectedKey = 'PLAYBOOK_WATERFALL_ALLOCATION';
    primaryTrigger = 'Multi-Schedule Waterfall Allocation';
    evidenceList.push('Deposit requires distribution across multiple schedule milestones.');
  }

  // Include secondary anomaly types as additional evidence
  types.forEach(t => {
    const formatted = t.replace(/_/g, ' ');
    if (!evidenceList.some(e => e.includes(formatted))) {
      evidenceList.push(`Additional anomaly flag: ${formatted}`);
    }
  });

  const playbook = PLAYBOOKS[selectedKey] || PLAYBOOKS.PLAYBOOK_STANDARD_RECONCILIATION;

  return {
    ...playbook,
    primaryTrigger,
    evidenceList,
    anomalyTypes: types,
    severity: severity || playbook.severity
  };
};

/**
 * Fetches the active playbook and step completion progress for a given case ID.
 */
export const getCasePlaybookService = async (caseId, user = null) => {
  if (!caseId) return null;
  await initPlaybookDatabase();

  // 1. Fetch case details, matched company, loan, and latest anomaly
  const [caseRows] = await pool.query(`
    SELECT rc.id AS case_id, rc.status, rc.priority, rc.company_id AS case_company_id,
           p.id AS payment_id, p.transaction_id, p.amount, p.sender_name, p.sender_account, p.reference,
           pa.severity AS anomaly_severity, pa.anomaly_types, pa.anomaly_score, pa.recommendation AS anomaly_recommendation, pa.explanation AS anomaly_explanation,
           rec.recommended_company_id, rec.recommended_loan_id, rec.recommended_schedule_id, rec.confidence_score, rec.reasoning,
           co.name AS matched_company_name, la.loan_number AS matched_loan_number
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id
    LEFT JOIN (
      SELECT r1.*
      FROM ai_recommendations r1
      INNER JOIN (
        SELECT reconciliation_case_id, MAX(id) AS max_id
        FROM ai_recommendations
        GROUP BY reconciliation_case_id
      ) r2 ON r1.id = r2.max_id
    ) rec ON rc.id = rec.reconciliation_case_id
    LEFT JOIN companies co ON (rec.recommended_company_id = co.id OR rc.company_id = co.id)
    LEFT JOIN loan_accounts la ON (rec.recommended_loan_id = la.id)
    LEFT JOIN (
      SELECT pa1.*
      FROM payment_anomalies pa1
      INNER JOIN (
        SELECT payment_id, MAX(id) AS max_id
        FROM payment_anomalies
        GROUP BY payment_id
      ) pa2 ON pa1.id = pa2.max_id
    ) pa ON p.id = pa.payment_id
    WHERE rc.id = ?
    LIMIT 1;
  `, [caseId]);

  if (caseRows.length === 0) return null;
  const c = caseRows[0];

  let rawTypes = c.anomaly_types;
  if (typeof rawTypes === 'string') {
    try { rawTypes = JSON.parse(rawTypes); } catch (_) { rawTypes = [rawTypes]; }
  }

  // 2. Select Playbook deterministically
  const playbook = selectPlaybookForAnomaly({
    anomalyTypes: rawTypes || [],
    severity: c.anomaly_severity,
    recommendation: c.anomaly_recommendation,
    priority: c.priority,
    caseId
  });

  // 3. Fetch completed steps from DB
  const [stepRows] = await pool.query(`
    SELECT step_id, status, completed_by, completed_at, notes
    FROM case_playbook_progress
    WHERE case_id = ? AND playbook_id = ?;
  `, [caseId, playbook.id]);

  const completedMap = {};
  stepRows.forEach(r => {
    completedMap[r.step_id] = {
      status: r.status,
      completedBy: r.completed_by,
      completedAt: r.completed_at,
      notes: r.notes
    };
  });

  // 4. Fetch overall playbook status
  const [statusRows] = await pool.query(`
    SELECT status, started_at, completed_at, completed_by
    FROM case_playbook_status
    WHERE case_id = ? AND playbook_id = ?
    LIMIT 1;
  `, [caseId, playbook.id]);

  const overallStatus = statusRows[0]?.status || (stepRows.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');

  // Exact entity formatting
  const companyName = c.matched_company_name || c.sender_name || 'Borrower Entity';
  const loanRef = c.matched_loan_number || (c.recommended_loan_id ? `Facility #${c.recommended_loan_id}` : 'Active Loan');
  const amountNum = parseFloat(String(c.amount || 0));
  const amountStr = '₹' + amountNum.toLocaleString('en-IN', { maximumFractionDigits: amountNum % 1 === 0 ? 0 : 2 });
  const refStr = c.reference ? `'${c.reference}'` : 'N/A';

  // Dynamic precise description customized to the exact company and transaction
  let tailoredDescription = playbook.description;
  if (playbook.id === 'PLAYBOOK_STANDARD_RECONCILIATION') {
    tailoredDescription = `Single-schedule continuous waterfall settlement for ${companyName} on loan facility ${loanRef} (${amountStr}).`;
  } else if (playbook.id === 'PLAYBOOK_DUPLICATE_PAYMENT') {
    tailoredDescription = `Deposit of ${amountStr} matches another ledger record for ${companyName} (Ref: ${refStr}). Hold allocation pending UTR confirmation.`;
  } else if (playbook.id === 'PLAYBOOK_UNKNOWN_PAYER') {
    tailoredDescription = `Deposit of ${amountStr} from account ${c.sender_account || 'unknown'} could not be mapped to registered master facilities for ${companyName}.`;
  } else if (playbook.id === 'PLAYBOOK_AMOUNT_VARIANCE') {
    tailoredDescription = `Deposit of ${amountStr} diverges from expected installment schedule EMI for ${companyName} on ${loanRef}.`;
  } else if (playbook.id === 'PLAYBOOK_WATERFALL_ALLOCATION') {
    tailoredDescription = `Deposit of ${amountStr} requires multi-schedule continuous waterfall allocation across facilities for ${companyName}.`;
  }

  // Personalize each step with company and transaction details
  const stepsWithProgress = playbook.steps.map(step => {
    let customLabel = step.label;
    let customDesc = step.desc;

    const sId = String(step.id);
    if (sId === '1') {
      customLabel = `Verify ${amountStr} deposit evidence against '${companyName}'`;
      customDesc = `Confirm payer account (${c.sender_account || 'N/A'}) and reference (${refStr}) against facility ${loanRef}.`;
    } else if (sId === '2') {
      customLabel = `Check installment schedule allocation match for ${loanRef}`;
      customDesc = `Ensure ${amountStr} correctly applies to outstanding fees, interest, and principal for ${companyName}.`;
    } else if (sId === '3') {
      customLabel = `Approve continuous waterfall allocation for ${companyName}`;
      customDesc = `Commit ${amountStr} allocation to ${companyName} ledger and update loan balance.`;
    }

    return {
      ...step,
      label: customLabel,
      desc: customDesc,
      isCompleted: !!completedMap[step.id],
      completedBy: completedMap[step.id]?.completedBy || null,
      completedAt: completedMap[step.id]?.completedAt || null,
      notes: completedMap[step.id]?.notes || null
    };
  });

  const completedCount = stepsWithProgress.filter(s => s.isCompleted).length;
  const totalCount = stepsWithProgress.length;

  return {
    caseId: parseInt(caseId, 10),
    playbookId: playbook.id,
    title: playbook.title,
    trigger: playbook.primaryTrigger,
    severity: playbook.severity,
    estimatedDuration: playbook.estimatedDuration,
    safeToAllocate: playbook.safeToAllocate,
    requiresManualReview: playbook.requiresManualReview,
    requiresAgent6Escalation: playbook.requiresAgent6Escalation,
    description: tailoredDescription,
    evidence: playbook.evidenceList,
    anomalyScore: c.anomaly_score || 0,
    overallStatus,
    completedStepsCount: completedCount,
    totalStepsCount: totalCount,
    progressPercentage: Math.round((completedCount / totalCount) * 100),
    steps: stepsWithProgress
  };
};

/**
 * Toggles or updates a single step completion in the DB.
 */
export const updatePlaybookStepService = async (caseId, stepId, completed, completedBy = 'Accountant', notes = null) => {
  const playbookData = await getCasePlaybookService(caseId);
  if (!playbookData) throw new Error('Case not found');

  const playbookId = playbookData.playbookId;

  if (completed) {
    await pool.query(`
      INSERT INTO case_playbook_progress (case_id, playbook_id, step_id, status, completed_by, notes)
      VALUES (?, ?, ?, 'completed', ?, ?)
      ON DUPLICATE KEY UPDATE status = 'completed', completed_by = VALUES(completed_by), completed_at = CURRENT_TIMESTAMP, notes = VALUES(notes);
    `, [caseId, playbookId, stepId, completedBy, notes]);

    // Update status to IN_PROGRESS if not already
    await pool.query(`
      INSERT INTO case_playbook_status (case_id, playbook_id, status, started_at)
      VALUES (?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE status = IF(status = 'NOT_STARTED', 'IN_PROGRESS', status);
    `, [caseId, playbookId]);
  } else {
    await pool.query(`
      DELETE FROM case_playbook_progress
      WHERE case_id = ? AND playbook_id = ? AND step_id = ?;
    `, [caseId, playbookId, stepId]);
  }

  return await getCasePlaybookService(caseId);
};

/**
 * Updates the overall playbook review status (e.g. COMPLETED, ESCALATED, IN_PROGRESS).
 */
export const updatePlaybookStatusService = async (caseId, status, completedBy = 'Accountant') => {
  const playbookData = await getCasePlaybookService(caseId);
  if (!playbookData) throw new Error('Case not found');

  const playbookId = playbookData.playbookId;
  const isCompleted = status === 'COMPLETED';

  await pool.query(`
    INSERT INTO case_playbook_status (case_id, playbook_id, status, started_at, completed_at, completed_by)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, IF(? = 1, CURRENT_TIMESTAMP, NULL), ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), completed_at = IF(? = 1, CURRENT_TIMESTAMP, completed_at), completed_by = VALUES(completed_by);
  `, [caseId, playbookId, status, isCompleted ? 1 : 0, completedBy, isCompleted ? 1 : 0]);

  return await getCasePlaybookService(caseId);
};
