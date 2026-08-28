import pool from '../config/db.js';

/**
 * Module: FinanceFlow AI Assistant — Tool Definitions & Executors
 *
 * Purpose:
 *   Provides 18 controlled READ-ONLY database tools for the AI Assistant.
 *   The LLM (Groq) cannot query MySQL directly — it can only request these tools.
 *   Each tool returns:
 *     { data: <result>, meta: { tool, recordType, recordId, title, snippet } }
 *   The `meta` object is used to build the structured source citation in the UI.
 *
 * Source Citation Schema (returned in meta):
 *   type:     category of record ('payment' | 'reconciliation_case' | 'agent_run' | 'company' | 'loan' | 'portfolio' | 'document' | 'high_risk_list' | ...)
 *   tool:     name of the tool function called
 *   recordId: primary key of the record (null for aggregate tools)
 *   title:    human-readable label shown in the UI source card (e.g., "Payment #1042")
 *   snippet:  1-line data preview shown in the source card
 *
 * Fact Tagging Rule:
 *   All data from these tools = 🗄️ DB Fact
 *   All data from agent_runs / execution_logs / recommendations = 🤖 Agent Finding
 *
 * Called by:
 *   - backend/src/agents/assistantAgent.js
 */

// =============================================================================
// SECTION 1: Tool Schema Declarations (Groq Function Calling Specification)
// =============================================================================

export const assistantToolsDeclaration = [
  // ─── Core Entity Tools ──────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'getPaymentDetails',
      description: 'Retrieves full details of a specific payment: amount, sender bank account, date received, company matched, status. Use when user asks about a specific payment.',
      parameters: {
        type: 'object',
        properties: {
          paymentId: { type: 'integer', description: 'payments.id primary key' }
        },
        required: ['paymentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getReconciliationCase',
      description: 'Retrieves a reconciliation case: confidence score, pre-check score, AI recommendation, matched company/loan, status. Use to explain why AI gave a certain match score.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'integer', description: 'reconciliation_cases.id primary key' }
        },
        required: ['caseId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAgentRun',
      description: 'Retrieves a specific agent execution run: which agent, trigger type, status, model used, token count, confidence score, result summary. Use to explain what an agent did.',
      parameters: {
        type: 'object',
        properties: {
          runId: { type: 'integer', description: 'agent_runs.id primary key' }
        },
        required: ['runId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAgentExecutionLogs',
      description: 'Retrieves step-by-step execution logs for an agent run: each tool the agent called, inputs, outputs, and decisions. Use to explain exactly how Agent 1 arrived at a recommendation.',
      parameters: {
        type: 'object',
        properties: {
          runId: { type: 'integer', description: 'agent_runs.id to retrieve execution steps for' }
        },
        required: ['runId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getLatestAgentRuns',
      description: 'Retrieves the latest execution runs for a specific agent (e.g. "agent_1_reconciliation", "agent_2_risk", "agent_5_portfolio", "agent_6_notification") or across all agents. Use when user asks what an agent did, recent agent activity, or agent performance.',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Filter by agent ID (e.g. "agent_1_reconciliation", "agent_2_risk", "agent_5_portfolio", "agent_6_notification") or leave empty for all agents' },
          limit:   { type: 'integer', description: 'Maximum runs to return (default 5)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCompanyProfile',
      description: 'Retrieves company profile: name, contact details, current loan count, total principal exposure, number of active/defaulted loans, payment behavior summary.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'companies.id primary key' }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getActiveLoan',
      description: 'Retrieves the active loan for a company: loan number, principal amount, interest rate, total payable, start/end dates, current status.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'companies.id to find active loan for' }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getLoanDetails',
      description: 'Retrieves complete details of a specific loan by loanId, including all repayment installments, due dates, scheduled amounts, paid status, and progress.',
      parameters: {
        type: 'object',
        properties: {
          loanId: { type: 'integer', description: 'loans.id primary key' }
        },
        required: ['loanId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getRepaymentHistory',
      description: 'Retrieves all repayment installments for a company: due date, scheduled amount, paid amount, status, days overdue. Use to explain payment behavior.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'companies.id to retrieve repayment history for' }
        },
        required: ['companyId']
      }
    }
  },

  // ─── Multi-Entity & Cross-Agent Search Tools (Phase 2) ──────────────────
  {
    type: 'function',
    function: {
      name: 'searchCompanyByName',
      description: 'Searches companies by name, registration number, or contact name. Use when the user asks about a company by name or asks to compare companies.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Company name or partial name to search for' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAgentRunsByCase',
      description: 'Retrieves all agent runs (Agent 1, Agent 2, Agent 3, etc.) and AI recommendations associated with a specific reconciliation case.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'integer', description: 'reconciliation_cases.id primary key' }
        },
        required: ['caseId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'queryOverdueCompanies',
      description: 'Searches for companies with overdue repayments matching threshold criteria: minimum overdue amount or minimum days overdue.',
      parameters: {
        type: 'object',
        properties: {
          minAmount: { type: 'number', description: 'Minimum overdue amount in Rupees (e.g. 100000)' },
          minDays:   { type: 'integer', description: 'Minimum days overdue (e.g. 30)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getHighRiskBorrowers',
      description: 'Retrieves a ranked list of high-risk borrowers based on delinquency rates, overdue installments, and total outstanding debt.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Maximum borrowers to return (default 5)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMonthlyCollectionSummary',
      description: 'Aggregates scheduled vs collected repayments for a given month and year (e.g. year: 2026, month: 8).',
      parameters: {
        type: 'object',
        properties: {
          year:  { type: 'integer', description: 'Year (e.g. 2026)' },
          month: { type: 'integer', description: 'Month (1 to 12)' }
        },
        required: ['year', 'month']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDocumentSummary',
      description: 'Retrieves details and metadata for an uploaded document (loan agreement, invoice, payment proof, bank statement) by documentId.',
      parameters: {
        type: 'object',
        properties: {
          documentId: { type: 'integer', description: 'documents.id primary key' }
        },
        required: ['documentId']
      }
    }
  },

  // ─── Queue & Management Overview Tools ──────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'getPendingCasesForUser',
      description: 'Retrieves reconciliation cases that require the current user\'s attention, based on their role. Used for "What should I focus on today?" and daily priority briefings.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Maximum number of cases to return (default 10)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPortfolioSummary',
      description: 'Retrieves portfolio-wide health metrics: total principal, active loan count, overdue amount, collection efficiency. Use for executive summaries.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getOverduePayments',
      description: 'Retrieves a list of overdue repayment installments: company name, days overdue, outstanding amount. Use when user asks about overdue payments or SLA breaches.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Maximum records to return (default 10, max 20)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTokenUsageSummary',
      description: 'Retrieves AI agent token usage summary by agent: total runs, total tokens, avg tokens per run, recent trend. For admin/senior roles investigating AI costs.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Look back period in days (default 7)' }
        },
        required: []
      }
    }
  },
  // ─── Phase 3: Controlled Action Proposal Tools (Human Confirmation Required) ───
  {
    type: 'function',
    function: {
      name: 'proposeFlagCase',
      description: 'Generates a formal action proposal to update the priority of a reconciliation case (e.g., to HIGH or CRITICAL). Does NOT mutate immediately; returns a proposal ID for user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'integer', description: 'reconciliation_cases.id' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Proposed priority level' },
          reason: { type: 'string', description: 'Justification for priority escalation' }
        },
        required: ['caseId', 'priority', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proposeAddCaseNote',
      description: 'Generates a formal action proposal to add an auditor note to a reconciliation case. Returns a proposal ID for user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'integer', description: 'reconciliation_cases.id' },
          noteText: { type: 'string', description: 'The audit / follow-up note text to append' }
        },
        required: ['caseId', 'noteText']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proposeTriggerReanalysis',
      description: 'Generates a formal action proposal to re-trigger Agent 1 (Payment Reconciliation) or Agent 2 for automated investigation. Returns a proposal ID for user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'integer', description: 'reconciliation_cases.id' },
          reason: { type: 'string', description: 'Why re-analysis is required' }
        },
        required: ['caseId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proposeEscalateAlert',
      description: 'Generates a formal action proposal to escalate a case alert to Finance Managers or Executives via Agent 6. Returns a proposal ID for user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'integer', description: 'reconciliation_cases.id' },
          escalationLevel: { type: 'string', enum: ['manager', 'executive', 'urgent'], description: 'Escalation tier' },
          message: { type: 'string', description: 'Urgent escalation notice message' }
        },
        required: ['caseId', 'escalationLevel', 'message']
      }
    }
  }
];


// =============================================================================
// SECTION 2: Tool Execution Router
// =============================================================================

/**
 * Routes an assistant tool call to the correct database function.
 * Returns both the data and the meta object for source citation.
 *
 * @param {string} toolName   - Tool name from Groq's tool_calls
 * @param {Object} args       - Arguments from Groq's tool call
 * @param {Object} user       - req.user { id, email, role } for permission context
 * @returns {Promise<{ data, meta }>}
 */
export const executeAssistantTool = async (toolName, args = {}, user = {}) => {
  switch (toolName) {
    case 'getPaymentDetails':
      return await _getPaymentDetails(args.paymentId);

    case 'getReconciliationCase':
      return await _getReconciliationCase(args.caseId);

    case 'getAgentRun':
      return await _getAgentRun(args.runId);

    case 'getAgentExecutionLogs':
      return await _getAgentExecutionLogs(args.runId);

    case 'getCompanyProfile':
      return await _getCompanyProfile(args.companyId);

    case 'getActiveLoan':
      return await _getActiveLoan(args.companyId);

    case 'getLoanDetails':
      return await _getLoanDetails(args.loanId);

    case 'getRepaymentHistory':
      return await _getRepaymentHistory(args.companyId);

    case 'searchCompanyByName':
      return await _searchCompanyByName(args.query);

    case 'getAgentRunsByCase':
      return await _getAgentRunsByCase(args.caseId);

    case 'getLatestAgentRuns':
      return await _getLatestAgentRuns(args.agentId, args.limit);

    case 'queryOverdueCompanies':
      return await _queryOverdueCompanies(args.minAmount, args.minDays);

    case 'getHighRiskBorrowers':
      return await _getHighRiskBorrowers(args.limit || 5);

    case 'getMonthlyCollectionSummary':
      return await _getMonthlyCollectionSummary(args.year, args.month);

    case 'getDocumentSummary':
      return await _getDocumentSummary(args.documentId);

    case 'getPendingCasesForUser':
      return await _getPendingCasesForUser(user.id, user.role, args.limit || 10);

    case 'getPortfolioSummary':
      return await _getPortfolioSummary();

    case 'getOverduePayments':
      return await _getOverduePayments(args.limit || 10);

    case 'getTokenUsageSummary':
      return await _getTokenUsageSummary(args.days || 7);

    // ─── Phase 3 Action Proposal Handlers ────────────────────────────────────
    case 'proposeFlagCase':
      return await _proposeFlagCase(args.caseId, args.priority, args.reason, user);

    case 'proposeAddCaseNote':
      return await _proposeAddCaseNote(args.caseId, args.noteText, user);

    case 'proposeTriggerReanalysis':
      return await _proposeTriggerReanalysis(args.caseId, args.reason, user);

    case 'proposeEscalateAlert':
      return await _proposeEscalateAlert(args.caseId, args.escalationLevel, args.message, user);

    default:
      return {
        data: { error: `Unknown tool: ${toolName}` },
        meta: null
      };
  }
};


// =============================================================================
// SECTION 3: Individual Tool Functions
// =============================================================================

/**
 * Tool: getPaymentDetails
 * Fact type: 🗄️ DB Fact
 */
const _getPaymentDetails = async (paymentId) => {
  const [rows] = await pool.query(`
    SELECT p.*
    FROM payments p
    WHERE p.id = ?
  `, [paymentId]);

  const data = rows[0] || null;
  return {
    data,
    meta: {
      type:     'payment',
      tool:     'getPaymentDetails',
      recordId: paymentId,
      title:    `Payment #${paymentId}`,
      snippet:  data
        ? `₹${parseFloat(data.amount || 0).toLocaleString('en-IN')} from ${data.sender_name || data.sender_account || 'Unknown'} on ${data.payment_date || data.created_at}`
        : 'Payment not found'
    }
  };
};

/**
 * Tool: getReconciliationCase
 * Fact type: 🗄️ DB Fact + 🤖 Agent Finding
 */
const _getReconciliationCase = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT
      rc.*,
      p.amount                AS payment_amount,
      p.payment_date          AS payment_date,
      p.sender_name           AS sender_name,
      p.sender_account        AS sender_account,
      p.reference             AS payment_reference,
      p.transaction_id        AS transaction_id,
      c.company_name          AS matched_company,
      l.loan_number           AS matched_loan,
      rec.confidence_score    AS ai_confidence,
      rec.reasoning           AS ai_reasoning,
      rec.status              AS recommendation_status
    FROM reconciliation_cases rc
    LEFT JOIN payments p   ON rc.payment_id = p.id
    LEFT JOIN ai_recommendations rec ON rc.id = rec.reconciliation_case_id
    LEFT JOIN companies c  ON rec.recommended_company_id = c.id
    LEFT JOIN loans l      ON rec.recommended_loan_id = l.id
    WHERE rc.id = ?
  `, [caseId]);

  const data = rows[0] || null;
  return {
    data,
    meta: {
      type:     'reconciliation_case',
      tool:     'getReconciliationCase',
      recordId: caseId,
      title:    `Reconciliation Case #${caseId}`,
      snippet:  data
        ? `Status: ${data.status} • Priority: ${data.priority} • Amount: ₹${parseFloat(data.payment_amount || 0).toLocaleString('en-IN')}`
        : 'Case not found'
    }
  };
};

/**
 * Tool: getAgentRun
 * Fact type: 🤖 Agent Finding
 */
const _getAgentRun = async (runId) => {
  const [rows] = await pool.query(`
    SELECT
      ar.*,
      u.name AS triggered_by_name
    FROM agent_runs ar
    LEFT JOIN users u ON ar.triggered_by = u.id
    WHERE ar.id = ?
  `, [runId]);

  const data = rows[0] || null;
  return {
    data,
    meta: {
      type:     'agent_run',
      tool:     'getAgentRun',
      recordId: runId,
      title:    `${data?.agent_name || 'Agent'} Run #${runId}`,
      snippet:  data
        ? `${data.status} • ${parseInt(data.total_tokens || 0).toLocaleString()} tokens • ${parseFloat(data.confidence_score || 0).toFixed(1)}% confidence`
        : 'Run not found'
    }
  };
};

/**
 * Tool: getAgentExecutionLogs
 * Fact type: 🤖 Agent Finding
 */
const _getAgentExecutionLogs = async (runId) => {
  const [rows] = await pool.query(`
    SELECT
      id,
      step_type,
      step_name,
      status,
      SUBSTRING(input_data, 1, 300) AS input_preview,
      SUBSTRING(output_data, 1, 400) AS output_preview,
      error_message,
      duration_ms,
      created_at
    FROM agent_execution_logs
    WHERE agent_run_id = ?
    ORDER BY created_at ASC
    LIMIT 10
  `, [runId]);

  return {
    data: rows,
    meta: {
      type:     'execution_log',
      tool:     'getAgentExecutionLogs',
      recordId: runId,
      title:    `Execution Logs — Run #${runId}`,
      snippet:  `${rows.length} key execution steps retrieved`
    }
  };
};

/**
 * Tool: getLatestAgentRuns
 * Fact type: 🤖 Agent Finding
 */
const _getLatestAgentRuns = async (agentId = '', limit = 5) => {
  let query = `
    SELECT
      ar.id,
      ar.agent_id,
      ar.agent_name,
      ar.case_id,
      ar.status,
      ar.trigger_type,
      ar.confidence_score,
      ar.total_tokens,
      ar.result_summary,
      ar.created_at,
      u.name AS triggered_by_name
    FROM agent_runs ar
    LEFT JOIN users u ON ar.triggered_by = u.id
  `;
  const params = [];
  if (agentId && agentId.trim() !== '') {
    query += ` WHERE ar.agent_id LIKE ? OR ar.agent_name LIKE ? `;
    params.push(`%${agentId.trim()}%`, `%${agentId.trim()}%`);
  }
  query += ` ORDER BY ar.id DESC LIMIT ? `;
  params.push(Number(limit) || 5);

  const [rows] = await pool.query(query, params);

  return {
    data: rows,
    meta: {
      type:     'agent_run_list',
      tool:     'getLatestAgentRuns',
      recordId: null,
      title:    agentId ? `Latest Runs — ${agentId}` : 'Latest Agent Runs',
      snippet:  `${rows.length} runs found • Latest: ${rows[0]?.status || 'No runs'}`
    }
  };
};

/**
 * Tool: getCompanyProfile
 * Fact type: 🗄️ DB Fact
 */
const _getCompanyProfile = async (companyId) => {
  const [compRows] = await pool.query(`
    SELECT id, company_name, registration_number, tax_identifier, bank_account_number, contact_name, contact_email, contact_phone, status
    FROM companies WHERE id = ?
  `, [companyId]);

  if (compRows.length === 0) {
    return {
      data: null,
      meta: { type: 'company', tool: 'getCompanyProfile', recordId: companyId, title: `Company #${companyId}`, snippet: 'Not found' }
    };
  }

  // Loan exposure summary
  const [loanRows] = await pool.query(`
    SELECT
      COUNT(*)                   AS total_loans,
      COALESCE(SUM(principal_amount), 0)  AS total_principal,
      SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active_loans,
      SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) AS defaulted_loans
    FROM loans WHERE company_id = ?
  `, [companyId]);

  // Repayment summary
  const [schedRows] = await pool.query(`
    SELECT
      COUNT(*) AS total_installments,
      SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
      SUM(CASE WHEN rs.status = 'overdue' OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled')) THEN 1 ELSE 0 END) AS overdue_count,
      COALESCE(SUM(CASE WHEN rs.status = 'overdue' OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled')) THEN (rs.scheduled_amount - rs.paid_amount) ELSE 0 END), 0) AS overdue_amount
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    WHERE l.company_id = ?
  `, [companyId]);

  const data = {
    ...compRows[0],
    loan_summary:      loanRows[0] || {},
    repayment_summary: schedRows[0] || {}
  };

  return {
    data,
    meta: {
      type:     'company',
      tool:     'getCompanyProfile',
      recordId: companyId,
      title:    data.company_name,
      snippet:  `${loanRows[0]?.active_loans || 0} active loans • ₹${parseFloat(loanRows[0]?.total_principal || 0).toLocaleString('en-IN')} total principal • ${schedRows[0]?.overdue_count || 0} overdue`
    }
  };
};

/**
 * Tool: getActiveLoan
 * Fact type: 🗄️ DB Fact
 */
const _getActiveLoan = async (companyId) => {
  const [rows] = await pool.query(`
    SELECT l.*, c.company_name
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    WHERE l.company_id = ? AND l.status = 'active'
    ORDER BY l.created_at DESC
    LIMIT 1
  `, [companyId]);

  const data = rows[0] || null;
  return {
    data,
    meta: {
      type:     'loan',
      tool:     'getActiveLoan',
      recordId: data?.id || companyId,
      title:    data ? `Loan ${data.loan_number}` : `Active Loan — Company #${companyId}`,
      snippet:  data
        ? `₹${parseFloat(data.principal_amount || 0).toLocaleString('en-IN')} principal • Status: ${data.status}`
        : 'No active loan found'
    }
  };
};

/**
 * Tool: getLoanDetails (Phase 2)
 * Fact type: 🗄️ DB Fact
 */
const _getLoanDetails = async (loanId) => {
  const [loanRows] = await pool.query(`
    SELECT l.*, c.company_name, c.contact_name, c.contact_email, c.bank_account_number
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    WHERE l.id = ?
  `, [loanId]);

  if (loanRows.length === 0) {
    return {
      data: null,
      meta: { type: 'loan', tool: 'getLoanDetails', recordId: loanId, title: `Loan #${loanId}`, snippet: 'Loan not found' }
    };
  }

  const [schedules] = await pool.query(`
    SELECT id, installment_number, due_date, scheduled_amount, paid_amount, status,
      CASE
        WHEN status = 'overdue' OR (due_date < CURDATE() AND status NOT IN ('paid','cancelled'))
        THEN DATEDIFF(CURDATE(), due_date)
        ELSE 0
      END AS days_overdue
    FROM repayment_schedules
    WHERE loan_id = ?
    ORDER BY installment_number ASC
  `, [loanId]);

  const totalScheduled = schedules.reduce((s, r) => s + parseFloat(r.scheduled_amount || 0), 0);
  const totalPaid      = schedules.reduce((s, r) => s + parseFloat(r.paid_amount || 0), 0);
  const overdueCount   = schedules.filter(r => r.status === 'overdue' || r.days_overdue > 0).length;

  const data = {
    ...loanRows[0],
    total_scheduled: totalScheduled,
    total_paid:      totalPaid,
    overdue_count:   overdueCount,
    schedule:        schedules
  };

  return {
    data,
    meta: {
      type:     'loan',
      tool:     'getLoanDetails',
      recordId: loanId,
      title:    `Loan ${data.loan_number} (${data.company_name})`,
      snippet:  `₹${parseFloat(data.principal_amount || 0).toLocaleString('en-IN')} • ${schedules.length} installments • ${overdueCount} overdue`
    }
  };
};

/**
 * Tool: getRepaymentHistory
 * Fact type: 🗄️ DB Fact
 */
const _getRepaymentHistory = async (companyId) => {
  const [rows] = await pool.query(`
    SELECT
      rs.id,
      rs.installment_number,
      rs.due_date,
      rs.scheduled_amount,
      rs.paid_amount,
      rs.status,
      l.loan_number,
      CASE
        WHEN rs.status = 'overdue' OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled'))
        THEN DATEDIFF(CURDATE(), rs.due_date)
        ELSE 0
      END AS days_overdue
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    WHERE l.company_id = ?
    ORDER BY rs.due_date DESC
    LIMIT 12
  `, [companyId]);

  const paid    = rows.filter(r => r.status === 'paid').length;
  const overdue = rows.filter(r => r.status === 'overdue' || r.days_overdue > 0).length;

  return {
    data: rows,
    meta: {
      type:     'repayment_history',
      tool:     'getRepaymentHistory',
      recordId: companyId,
      title:    `Repayment History — Company #${companyId}`,
      snippet:  `${paid} paid • ${overdue} overdue (last ${rows.length} installments)`
    }
  };
};

/**
 * Tool: searchCompanyByName (Phase 2)
 * Fact type: 🗄️ DB Fact
 */
const _searchCompanyByName = async (query = '') => {
  const term = `%${query.trim()}%`;
  const [rows] = await pool.query(`
    SELECT id, company_name, registration_number, contact_name, contact_email, bank_account_number, status
    FROM companies
    WHERE company_name LIKE ? OR registration_number LIKE ? OR contact_name LIKE ?
    LIMIT 5
  `, [term, term, term]);

  return {
    data: rows,
    meta: {
      type:     'company_search',
      tool:     'searchCompanyByName',
      recordId: null,
      title:    `Company Search: "${query}"`,
      snippet:  `${rows.length} matching companies found`
    }
  };
};

/**
 * Tool: getAgentRunsByCase (Phase 2)
 * Fact type: 🤖 Agent Finding
 */
const _getAgentRunsByCase = async (caseId) => {
  const [runs] = await pool.query(`
    SELECT
      ar.id AS run_id,
      ar.agent_id,
      ar.agent_name,
      ar.status,
      ar.confidence_score,
      ar.result_summary,
      ar.total_tokens,
      ar.duration_ms,
      ar.created_at
    FROM agent_runs ar
    WHERE ar.case_id = ?
    ORDER BY ar.created_at DESC
  `, [caseId]);

  const [recommendations] = await pool.query(`
    SELECT
      rec.*,
      c.company_name AS recommended_company_name,
      l.loan_number  AS recommended_loan_number
    FROM ai_recommendations rec
    LEFT JOIN companies c ON rec.recommended_company_id = c.id
    LEFT JOIN loans l ON rec.recommended_loan_id = l.id
    WHERE rec.reconciliation_case_id = ?
  `, [caseId]);

  return {
    data: {
      runs,
      recommendations
    },
    meta: {
      type:     'agent_run_list',
      tool:     'getAgentRunsByCase',
      recordId: caseId,
      title:    `Agent Runs for Case #${caseId}`,
      snippet:  `${runs.length} agent runs • ${recommendations.length} AI recommendations`
    }
  };
};

/**
 * Tool: queryOverdueCompanies (Phase 2)
 * Fact type: 🗄️ DB Fact
 */
const _queryOverdueCompanies = async (minAmount = 0, minDays = 0) => {
  const [rows] = await pool.query(`
    SELECT
      c.id AS company_id,
      c.company_name,
      c.contact_name,
      c.contact_email,
      COUNT(rs.id) AS overdue_installments,
      MAX(DATEDIFF(CURDATE(), rs.due_date)) AS max_overdue_days,
      SUM(rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) AS total_overdue_amount
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.due_date < CURDATE()
      AND rs.status NOT IN ('paid', 'cancelled')
      AND (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) > 0
    GROUP BY c.id, c.company_name, c.contact_name, c.contact_email
    HAVING total_overdue_amount >= ? AND max_overdue_days >= ?
    ORDER BY total_overdue_amount DESC
    LIMIT 10
  `, [parseFloat(minAmount || 0), parseInt(minDays || 0, 10)]);

  return {
    data: rows,
    meta: {
      type:     'overdue_query',
      tool:     'queryOverdueCompanies',
      recordId: null,
      title:    'Overdue Companies Filter',
      snippet:  `${rows.length} companies matched threshold criteria`
    }
  };
};

/**
 * Tool: getHighRiskBorrowers (Phase 2)
 * Fact type: 🗄️ DB Fact + 🤖 Agent Finding
 */
const _getHighRiskBorrowers = async (limit = 5) => {
  const safeLimit = Math.min(parseInt(limit, 10) || 5, 10);
  const [rows] = await pool.query(`
    SELECT
      c.id AS company_id,
      c.company_name,
      c.contact_name,
      COUNT(DISTINCT l.id) AS active_loans,
      COALESCE(SUM(DISTINCT l.principal_amount), 0) AS total_exposure,
      COUNT(CASE WHEN rs.status = 'overdue' OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled')) THEN 1 END) AS overdue_installments,
      MAX(CASE WHEN rs.status = 'overdue' OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled')) THEN DATEDIFF(CURDATE(), rs.due_date) ELSE 0 END) AS max_overdue_days,
      COALESCE(SUM(CASE WHEN rs.status = 'overdue' OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled')) THEN (rs.scheduled_amount - rs.paid_amount) ELSE 0 END), 0) AS overdue_amount
    FROM companies c
    LEFT JOIN loans l ON c.id = l.company_id AND l.status = 'active'
    LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
    GROUP BY c.id, c.company_name, c.contact_name
    HAVING overdue_installments > 0 OR overdue_amount > 0
    ORDER BY overdue_amount DESC, max_overdue_days DESC
    LIMIT ?
  `, [safeLimit]);

  return {
    data: rows,
    meta: {
      type:     'high_risk_list',
      tool:     'getHighRiskBorrowers',
      recordId: null,
      title:    'High-Risk Borrowers Ranking',
      snippet:  `Top ${rows.length} high-exposure delinquent borrowers`
    }
  };
};

/**
 * Tool: getMonthlyCollectionSummary (Phase 2)
 * Fact type: 🗄️ DB Fact
 */
const _getMonthlyCollectionSummary = async (year, month) => {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || (new Date().getMonth() + 1);

  const [rows] = await pool.query(`
    SELECT
      COUNT(*) AS total_due_installments,
      COALESCE(SUM(scheduled_amount), 0) AS total_scheduled_amount,
      COALESCE(SUM(paid_amount), 0) AS total_collected_amount,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
      SUM(CASE WHEN status IN ('overdue', 'pending') AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_count,
      ROUND(100.0 * COALESCE(SUM(paid_amount), 0) / NULLIF(SUM(scheduled_amount), 0), 2) AS collection_rate_pct
    FROM repayment_schedules
    WHERE YEAR(due_date) = ? AND MONTH(due_date) = ?
  `, [y, m]);

  const data = rows[0] || {};
  return {
    data: { ...data, year: y, month: m },
    meta: {
      type:     'collection_monthly',
      tool:     'getMonthlyCollectionSummary',
      recordId: null,
      title:    `Collection Summary (${m}/${y})`,
      snippet:  `Scheduled: ₹${parseFloat(data.total_scheduled_amount || 0).toLocaleString('en-IN')} • Rate: ${data.collection_rate_pct || 0}%`
    }
  };
};

/**
 * Tool: getDocumentSummary (Phase 2)
 * Fact type: 🗄️ DB Fact
 */
const _getDocumentSummary = async (documentId) => {
  const [rows] = await pool.query(`
    SELECT
      d.*,
      c.company_name,
      u.name AS uploader_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = ?
  `, [documentId]);

  const data = rows[0] || null;
  return {
    data,
    meta: {
      type:     'document',
      tool:     'getDocumentSummary',
      recordId: documentId,
      title:    data ? `Document: ${data.file_name}` : `Document #${documentId}`,
      snippet:  data
        ? `Type: ${data.document_type} • Company: ${data.company_name || 'General'} • Uploaded by: ${data.uploader_name || 'System'}`
        : 'Document not found'
    }
  };
};

/**
 * Tool: getPendingCasesForUser
 * Fact type: 🗄️ DB Fact
 */
const _getPendingCasesForUser = async (userId, role, limit = 10) => {
  const pendingStatuses = ['pending_review', 'new', 'ai_failed'];
  const statusList = pendingStatuses.map(() => '?').join(',');

  const [rows] = await pool.query(`
    SELECT
      rc.id,
      rc.status,
      rc.priority,
      rc.created_at,
      p.amount          AS payment_amount,
      p.payment_date,
      p.sender_name,
      rec.confidence_score
    FROM reconciliation_cases rc
    LEFT JOIN payments p  ON rc.payment_id = p.id
    LEFT JOIN ai_recommendations rec ON rc.id = rec.reconciliation_case_id
    WHERE rc.status IN (${statusList})
    ORDER BY rc.created_at DESC
    LIMIT ?
  `, [...pendingStatuses, limit]);

  const highRisk = rows.filter(r => r.priority === 'critical' || r.priority === 'high').length;

  return {
    data: rows,
    meta: {
      type:     'pending_queue',
      tool:     'getPendingCasesForUser',
      recordId: null,
      title:    'Pending Action Queue',
      snippet:  `${rows.length} cases pending • ${highRisk} high/critical priority`
    }
  };
};

/**
 * Tool: getPortfolioSummary
 * Fact type: 🗄️ DB Fact
 */
const _getPortfolioSummary = async () => {
  const [loanRows] = await pool.query(`
    SELECT
      COUNT(*)               AS active_loan_count,
      SUM(principal_amount)  AS total_principal,
      SUM(total_payable)     AS total_payable
    FROM loans WHERE status = 'active'
  `);

  const [overdueRows] = await pool.query(`
    SELECT
      COALESCE(SUM(scheduled_amount - paid_amount), 0) AS total_overdue
    FROM repayment_schedules
    WHERE status = 'overdue'
       OR (due_date < CURDATE() AND status NOT IN ('paid','cancelled'))
  `);

  const [efficiencyRows] = await pool.query(`
    SELECT
      ROUND(100.0 * SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS collection_efficiency
    FROM repayment_schedules
    WHERE due_date <= CURDATE()
  `);

  const data = {
    ...loanRows[0],
    total_overdue:         parseFloat(overdueRows[0]?.total_overdue || 0),
    collection_efficiency: parseFloat(efficiencyRows[0]?.collection_efficiency || 0)
  };

  return {
    data,
    meta: {
      type:     'portfolio',
      tool:     'getPortfolioSummary',
      recordId: null,
      title:    'Portfolio Summary',
      snippet:  `${data.active_loan_count} loans • ₹${parseFloat(data.total_principal || 0).toLocaleString('en-IN')} principal • ${data.collection_efficiency}% efficiency`
    }
  };
};

/**
 * Tool: getOverduePayments
 * Fact type: 🗄️ DB Fact
 */
const _getOverduePayments = async (limit = 10) => {
  const safeLimit = Math.min(parseInt(limit, 10) || 10, 20);
  const [rows] = await pool.query(`
    SELECT
      c.company_name,
      rs.due_date,
      DATEDIFF(CURDATE(), rs.due_date)                    AS days_overdue,
      (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) AS outstanding_amount,
      rs.installment_number
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.due_date < CURDATE()
      AND rs.status NOT IN ('paid','cancelled')
      AND (rs.scheduled_amount - COALESCE(rs.paid_amount,0)) > 0
    ORDER BY outstanding_amount DESC
    LIMIT ?
  `, [safeLimit]);

  const totalOverdue = rows.reduce((s, r) => s + parseFloat(r.outstanding_amount || 0), 0);
  return {
    data: rows,
    meta: {
      type:     'overdue_list',
      tool:     'getOverduePayments',
      recordId: null,
      title:    'Overdue Payments',
      snippet:  `${rows.length} overdue records • ₹${totalOverdue.toLocaleString('en-IN')} total outstanding`
    }
  };
};

/**
 * Tool: getTokenUsageSummary
 * Fact type: 🤖 Agent Finding
 */
const _getTokenUsageSummary = async (days = 7) => {
  const [rows] = await pool.query(`
    SELECT
      agent_name,
      COUNT(*)                                                   AS total_runs,
      SUM(total_tokens)                                          AS total_tokens,
      ROUND(AVG(total_tokens), 0)                                AS avg_tokens_per_run,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)     AS successful_runs,
      SUM(CASE WHEN groq_called = 1 THEN 1 ELSE 0 END)          AS groq_calls
    FROM agent_runs
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY agent_id, agent_name
    ORDER BY total_tokens DESC
  `, [days]);

  const grandTotal = rows.reduce((s, r) => s + parseInt(r.total_tokens || 0), 0);
  return {
    data: { period_days: days, agents: rows, grand_total_tokens: grandTotal },
    meta: {
      type:     'token_usage',
      tool:     'getTokenUsageSummary',
      recordId: null,
      title:    `Token Usage — Last ${days} Days`,
      snippet:  `${grandTotal.toLocaleString()} total tokens across ${rows.length} agents`
    }
  };
};

// =============================================================================
// SECTION 4: Phase 3 Action Proposal Executors (Stores to assistant_action_proposals)
// =============================================================================

import { generateActionProposal } from '../services/assistantAction.service.js';

/**
 * Helper to generate unique proposal and insert via Phase 7 Safety Gate service.
 */
const _createActionProposal = async (actionType, targetEntity, targetId, requestedParams, reason, user) => {
  const userId = user?.id || 1;
  const proposal = await generateActionProposal({
    userId,
    actionType,
    targetEntityType: targetEntity,
    targetId: parseInt(targetId, 10),
    parametersPayload: requestedParams,
    evidenceSummary: reason || 'Proposed via FinanceFlow AI Copilot conversation',
    confidenceScore: 92
  });

  return {
    proposalId: proposal.id,
    expiresAt: new Date(proposal.expires_at),
    actionType,
    targetEntity,
    targetId,
    requestedParams
  };
};

/**
 * Tool: proposeFlagCase (Phase 3)
 */
const _proposeFlagCase = async (caseId, priority = 'high', reason = '', user = {}) => {
  const safePriority = ['low', 'medium', 'high', 'critical'].includes((priority || '').toLowerCase())
    ? priority.toLowerCase()
    : 'high';

  const proposal = await _createActionProposal(
    'FLAG_CASE',
    'reconciliation_case',
    caseId,
    { priority: safePriority, reason },
    reason || `Escalate case priority to ${safePriority.toUpperCase()}`,
    user
  );

  return {
    data: {
      proposal_id:      proposal.proposalId,
      action_type:      'FLAG_CASE',
      target_entity:    'reconciliation_case',
      target_id:        caseId,
      requested_params: { priority: safePriority, reason },
      reason:           reason || `Escalate case priority to ${safePriority.toUpperCase()}`,
      status:           'pending_confirmation',
      expires_at:       proposal.expiresAt.toISOString(),
      instructions:     'Action proposal created. Awaiting explicit user confirmation.'
    },
    meta: {
      type:         'action_proposal',
      tool:         'proposeFlagCase',
      proposalId:   proposal.proposalId,
      actionType:   'FLAG_CASE',
      targetEntity: 'reconciliation_case',
      targetId:     caseId,
      params:       { priority: safePriority, reason },
      title:        `Action Proposal: Flag Case #${caseId} as ${safePriority.toUpperCase()}`,
      snippet:      `Proposal ${proposal.proposalId} • Priority: ${safePriority.toUpperCase()} • Awaiting Confirmation`
    }
  };
};

/**
 * Tool: proposeAddCaseNote (Phase 3)
 */
const _proposeAddCaseNote = async (caseId, noteText = '', user = {}) => {
  const proposal = await _createActionProposal(
    'ADD_CASE_NOTE',
    'reconciliation_case',
    caseId,
    { noteText },
    `Record auditor note on Case #${caseId}`,
    user
  );

  return {
    data: {
      proposal_id:      proposal.proposalId,
      action_type:      'ADD_CASE_NOTE',
      target_entity:    'reconciliation_case',
      target_id:        caseId,
      requested_params: { noteText },
      reason:           `Record auditor note: "${noteText}"`,
      status:           'pending_confirmation',
      expires_at:       proposal.expiresAt.toISOString(),
      instructions:     'Action proposal created. Awaiting explicit user confirmation.'
    },
    meta: {
      type:         'action_proposal',
      tool:         'proposeAddCaseNote',
      proposalId:   proposal.proposalId,
      actionType:   'ADD_CASE_NOTE',
      targetEntity: 'reconciliation_case',
      targetId:     caseId,
      params:       { noteText },
      title:        `Action Proposal: Add Audit Note to Case #${caseId}`,
      snippet:      `Proposal ${proposal.proposalId} • Note: "${noteText.slice(0, 40)}..." • Awaiting Confirmation`
    }
  };
};

/**
 * Tool: proposeTriggerReanalysis (Phase 3)
 */
const _proposeTriggerReanalysis = async (caseId, reason = '', user = {}) => {
  const proposal = await _createActionProposal(
    'TRIGGER_REANALYSIS',
    'reconciliation_case',
    caseId,
    { agentName: 'PaymentReconciliationAgent', reason },
    reason || `Re-trigger AI reconciliation investigation for Case #${caseId}`,
    user
  );

  return {
    data: {
      proposal_id:      proposal.proposalId,
      action_type:      'TRIGGER_REANALYSIS',
      target_entity:    'reconciliation_case',
      target_id:        caseId,
      requested_params: { agentName: 'PaymentReconciliationAgent', reason },
      reason:           reason || `Re-trigger AI reconciliation investigation for Case #${caseId}`,
      status:           'pending_confirmation',
      expires_at:       proposal.expiresAt.toISOString(),
      instructions:     'Action proposal created. Awaiting explicit user confirmation.'
    },
    meta: {
      type:         'action_proposal',
      tool:         'proposeTriggerReanalysis',
      proposalId:   proposal.proposalId,
      actionType:   'TRIGGER_REANALYSIS',
      targetEntity: 'reconciliation_case',
      targetId:     caseId,
      params:       { agentName: 'PaymentReconciliationAgent', reason },
      title:        `Action Proposal: Re-run AI Analysis for Case #${caseId}`,
      snippet:      `Proposal ${proposal.proposalId} • Agent 1 Re-Analysis • Awaiting Confirmation`
    }
  };
};

/**
 * Tool: proposeEscalateAlert (Phase 3)
 */
const _proposeEscalateAlert = async (caseId, escalationLevel = 'manager', message = '', user = {}) => {
  const proposal = await _createActionProposal(
    'ESCALATE_ALERT',
    'reconciliation_case',
    caseId,
    { escalationLevel, message },
    message || `Escalate Case #${caseId} alert to ${escalationLevel}`,
    user
  );

  return {
    data: {
      proposal_id:      proposal.proposalId,
      action_type:      'ESCALATE_ALERT',
      target_entity:    'reconciliation_case',
      target_id:        caseId,
      requested_params: { escalationLevel, message },
      reason:           message || `Escalate Case #${caseId} alert to ${escalationLevel}`,
      status:           'pending_confirmation',
      expires_at:       proposal.expiresAt.toISOString(),
      instructions:     'Action proposal created. Awaiting explicit user confirmation.'
    },
    meta: {
      type:         'action_proposal',
      tool:         'proposeEscalateAlert',
      proposalId:   proposal.proposalId,
      actionType:   'ESCALATE_ALERT',
      targetEntity: 'reconciliation_case',
      targetId:     caseId,
      params:       { escalationLevel, message },
      title:        `Action Proposal: Escalate Case #${caseId} Alert (${escalationLevel.toUpperCase()})`,
      snippet:      `Proposal ${proposal.proposalId} • Level: ${escalationLevel.toUpperCase()} • Awaiting Confirmation`
    }
  };
};
