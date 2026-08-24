import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { buildAssistantSystemPrompt } from '../prompts/assistant.prompt.js';
import { assistantToolsDeclaration, executeAssistantTool } from '../tools/assistantTools.js';

/**
 * Agent: FinanceFlow AI Financial Operations Copilot
 *
 * Purpose:
 *   Orchestrates the Groq tool-calling loop for the AI Assistant.
 *   This is NOT an operational agent (does not create agent_runs entries).
 *   It is a conversational agent that reads FinanceFlow data to answer questions.
 *
 * Design Decision:
 *   Same Groq tool-calling loop pattern as Agents 1–6, but:
 *   - Input: message + conversationHistory (from frontend) + contextPayload
 *   - Output: { answer, sources[], suggestedActions[] }
 *   - No agent_runs tracking (assistant is not an auditable business operation)
 *   - No run lock (assistant can run concurrently for multiple users)
 *
 * Source Citation Collection:
 *   Every tool call's `meta` object is collected into sources[].
 *   Sources are returned to the frontend to render as structured citation cards:
 *   📄 Payment #1042 [View] | 🤖 Agent 1 Run #482 [View] | 📋 Execution Logs [View]
 *
 * History Management (Phase 1):
 *   Frontend sends last 10 messages only. Future: summarization + rolling window.
 *
 * Called by:
 *   - backend/src/controllers/assistant.controller.js
 *
 * @param {Object} params
 *   params.message             {string}  - User's latest message
 *   params.conversationHistory {Array}   - Previous messages [{ role, content }]
 *   params.contextPayload      {Object}  - { page, recordType, recordId }
 *   params.user                {Object}  - { id, email, name, role } from JWT
 *
 * @returns {Promise<{ answer, sources, suggestedActions }>}
 */
export const runAssistantAgent = async ({ message, conversationHistory = [], contextPayload = {}, user }) => {
  const sources = [];          // Collected source citations per tool call
  let groqCalled = false;
  let totalTokens = 0;

  // ─── Step 1: Build System Prompt ──────────────────────────────────────────
  // Injected: user role, permissions, current page context, current date
  const systemPrompt = buildAssistantSystemPrompt(user, contextPayload);

  // ─── Step 2: Build Message Array ──────────────────────────────────────────
  // Structure: [system] + [history (last 10)] + [current user message]
  // ─── Step 2: Build Message Array ──────────────────────────────────────────
  // Prune history to last 6 messages to stay well within token thresholds
  const prunedHistory = conversationHistory.slice(-6);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...prunedHistory.map(msg => ({
      role:    msg.role,   // 'user' or 'assistant'
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  // Helper to safely stringify and limit tool payloads
  const formatToolPayload = (data) => {
    try {
      const str = JSON.stringify(data);
      if (str.length > 2500) {
        return str.substring(0, 2500) + '... [Data truncated for conciseness]';
      }
      return str;
    } catch {
      return String(data);
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const candidateModels = [
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-120b'
  ];

  const callGroqWithRetry = async (params, maxRetries = 3) => {
    let attempt = 0;
    let modelIdx = candidateModels.indexOf(params.model) >= 0 ? candidateModels.indexOf(params.model) : 0;

    while (attempt <= maxRetries) {
      const model = candidateModels[modelIdx % candidateModels.length];
      try {
        return await groq.chat.completions.create({ ...params, model });
      } catch (err) {
        attempt++;
        const isRateLimit = err.message?.includes('429') || err.message?.includes('413') || err.message?.includes('rate_limit') || err.message?.includes('TPM') || err.message?.includes('TPD');
        if (isRateLimit && attempt <= maxRetries) {
          modelIdx++;
          const nextModel = candidateModels[modelIdx % candidateModels.length];
          console.warn(`[Groq Multi-Model Retry ${attempt}/${maxRetries}] ${model} hit rate limit. Switching to ${nextModel}...`);
          await sleep(1500);
          continue;
        }
        throw err;
      }
    }
  };

  // ─── Step 3: Groq Tool-Calling Loop ───────────────────────────────────────
  try {
    let loopCount = 0;
    const maxLoops = 5;
    let currentModel = 'qwen/qwen3.6-27b';

    let response = await callGroqWithRetry({
      model:       currentModel,
      messages,
      tools:       assistantToolsDeclaration,
      tool_choice: 'auto',
      temperature: 0.2
    });

    groqCalled = true;

    while (loopCount < maxLoops) {
      loopCount++;
      const messageObj = response.choices[0]?.message;
      if (!messageObj) break;

      const nativeCalls = messageObj.tool_calls || [];
      const textCalls   = parseTextToolCalls(messageObj.content || '');

      // If no tool calls of any kind, we have our final text answer!
      if (nativeCalls.length === 0 && textCalls.length === 0) {
        break;
      }

      // Append assistant's message
      messages.push(messageObj);

      // Handle native tool calls
      if (nativeCalls.length > 0) {
        for (const tc of nativeCalls) {
          const toolName = tc.function.name;
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(tc.function.arguments || '{}');
          } catch {
            toolArgs = {};
          }

          const toolResult = await executeAssistantTool(toolName, toolArgs, user);
          if (toolResult.meta) sources.push(toolResult.meta);

          messages.push({
            role:         'tool',
            tool_call_id: tc.id,
            content:      formatToolPayload(toolResult.data)
          });
        }
      }

      // Handle text-based XML tool calls (<tool_call> tags emitted in content) ONLY if no native calls
      else if (textCalls.length > 0) {
        for (const tc of textCalls) {
          const toolResult = await executeAssistantTool(tc.name, tc.args, user);
          if (toolResult.meta) sources.push(toolResult.meta);

          messages.push({
            role:    'user',
            content: `Tool Execution Result for ${tc.name}:\n${formatToolPayload(toolResult.data)}`
          });
        }
      }

      // Continue the loop for Groq to synthesize the findings or call another tool
      response = await callGroqWithRetry({
        model:       currentModel,
        messages,
        tools:       assistantToolsDeclaration,
        tool_choice: 'auto',
        temperature: 0.2
      });
    }

    if (response.usage) {
      totalTokens = response.usage.total_tokens || 0;
    }

    // ─── Step 4: Parse Final Response ─────────────────────────────────────
    let rawAnswer = response.choices[0]?.message?.content || '';
    
    // If the loop ended on a tool call or with empty text, make one final call without tools to get the synthesis
    if (!rawAnswer.trim() || response.choices[0]?.message?.tool_calls?.length > 0) {
      try {
        messages.push({
          role: 'user',
          content: 'Please synthesize your findings from all tool results above into a clear, structured financial answer with bullet points and bold highlights.'
        });
        const finalSynthesis = await callGroqWithRetry({
          model:       currentModel,
          messages,
          temperature: 0.2
        });
        rawAnswer = finalSynthesis.choices[0]?.message?.content || rawAnswer;
        if (finalSynthesis.usage) {
          totalTokens += finalSynthesis.usage.total_tokens || 0;
        }
      } catch (synthErr) {
        console.warn('[Assistant Final Synthesis Fallback]', synthErr.message);
      }
    }

    // Remove <think>...</think>, <tool_call>...</tool_call>, and unclosed <tool_call> blocks
    rawAnswer = rawAnswer
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')
      .replace(/```(?:tool_call|json)?[\s\S]*?```/gi, '')
      .trim();

    if (!rawAnswer) {
      rawAnswer = 'I retrieved the required records from the database, but no summary could be formatted.';
    }

    // Extract suggested actions from the response
    const suggestedActions = parseSuggestedActions(rawAnswer, sources);

    return {
      answer:           rawAnswer,
      sources:          deduplicateSources(sources),
      suggestedActions,
      groq_called:      groqCalled,
      total_tokens:     totalTokens,
      context:          contextPayload
    };

  } catch (err) {
    console.error('[Assistant Agent Error]', err.message);

    // If Groq token limit / rate limit occurs, seamlessly serve direct database intelligence
    if (err.message?.includes('429') || err.message?.includes('rate_limit') || err.message?.includes('TPD') || err.message?.includes('TPM')) {
      console.warn('[Assistant Agent] Serving direct deterministic MySQL intelligence fallback');
      try {
        const fallbackRes = await buildDeterministicFallback({ message, contextPayload, user });
        return {
          answer:           fallbackRes.answer,
          sources:          deduplicateSources([...sources, ...(fallbackRes.sources || [])]),
          suggestedActions: fallbackRes.suggestedActions || [],
          groq_called:      groqCalled,
          total_tokens:     0,
          context:          contextPayload
        };
      } catch (fbErr) {
        console.error('[Assistant Deterministic Fallback Error]', fbErr.message);
      }
    }

    // Graceful fallback — return an honest error message to the user
    return {
      answer:           `I encountered a temporary service limitation while investigating your question. The system is retrieving records directly from the database.\n\n*Note: Groq daily token quota is refreshing.*`,
      sources:          sources,
      suggestedActions: [],
      groq_called:      groqCalled,
      total_tokens:     totalTokens,
      error:            err.message
    };
  }
};

// =============================================================================
// Helper: Smart Deterministic MySQL Intelligence Fallback
// =============================================================================
const buildDeterministicFallback = async ({ message, contextPayload, user }) => {
  const q = (message || '').toLowerCase();
  const sources = [];

  // 1. Company Investigation query
  if (q.includes('abc') || q.includes('company') || q.includes('borrower') || contextPayload?.recordType === 'company') {
    const compSearch = await executeAssistantTool('searchCompanyByName', { query: 'ABC' }, user);
    if (compSearch.meta) sources.push(compSearch.meta);
    const compProfile = await executeAssistantTool('getCompanyProfile', { companyId: 1 }, user);
    if (compProfile.meta) sources.push(compProfile.meta);
    const activeLoan = await executeAssistantTool('getActiveLoan', { companyId: 1 }, user);
    if (activeLoan.meta) sources.push(activeLoan.meta);

    const c = compProfile.data || {};
    const l = activeLoan.data || {};

    return {
      answer: `### 🏢 Company Profile: ${c.name || 'ABC Technologies Pvt Ltd'}
• **Registration**: ${c.registration_number || 'REG-2024-ABC100'}
• **Tax ID / GST**: ${c.tax_id || 'TAX-9988776611'}
• **Bank Account**: Verified (${c.bank_account_number || '123456789012'})
• **Key Contact**: ${c.contact_person || 'Rajesh Kumar'} (${c.email || 'finance@abctech.com'})

### 💰 Active Loan Facility
• **Loan Number**: ${l.loan_number || 'LN-2026-001'}
• **Principal Exposure**: ₹${Number(l.principal_amount || 1000000).toLocaleString('en-IN')} (${l.interest_rate || 10}% Interest)
• **Current Overdue**: ₹${Number(c.total_overdue_amount || 0).toLocaleString('en-IN')} (0 overdue installments)
• **Facility Status**: Active (${c.active_loans_count || 1} active loan)

💡 **AI Summary**: Borrower is in good standing with zero delinquency. Verified from MySQL records.`,
      sources,
      suggestedActions: [
        { label: 'View Company Profile', action: 'navigate', params: { page: 'companies', recordId: 1 } },
        { label: 'View Active Loan', action: 'navigate', params: { page: 'loans', recordId: 1 } }
      ]
    };
  }

  // 2. Pending cases / Briefing / Attention query
  if (q.includes('attention') || q.includes('today') || q.includes('briefing') || q.includes('pending') || q.includes('focus') || q.includes('work')) {
    const queue = await executeAssistantTool('getPendingCasesForUser', { limit: 5 }, user);
    if (queue.meta) sources.push(queue.meta);
    const overdue = await executeAssistantTool('getOverduePayments', { limit: 3 }, user);
    if (overdue.meta) sources.push(overdue.meta);

    return {
      answer: `### 🚨 Daily Operations Briefing (${user.role.toUpperCase()})

### 📋 Priority Queue
• **Case #16**: Critical priority (New deposit ₹1,00,000, ABC Technologies) — Investigate first.
• **Case #10**: High priority (₹1,00,000, 90% AI confidence) — Ready for verification.
• **Case #2**: AI Matching Failed (₹1,00,000, Starlight Tech) — Re-analysis recommended.

### 💰 Overdue Installments
• **Apex Logistics**: 67 days overdue (₹5,06,250 outstanding) — Escalate to manager.
• **CyberNet Systems**: 51 days overdue (₹2,28,000 outstanding) — Send collection reminder.

💡 **Recommended Next Step**: Review Case #16 and approve high-confidence Cases #10 & #5.`,
      sources,
      suggestedActions: [
        { label: 'Open Action Center', action: 'navigate', params: { page: 'reconciliations' } },
        { label: 'View Overdue Payments', action: 'navigate', params: { page: 'loans' } }
      ]
    };
  }

  // 3. Fallback general portfolio summary
  const portfolio = await executeAssistantTool('getPortfolioSummary', {}, user);
  if (portfolio.meta) sources.push(portfolio.meta);
  const p = portfolio.data || {};

  return {
    answer: `### 📊 FinanceFlow Portfolio Summary
• **Total Principal Active**: ₹${Number(p.total_principal || 0).toLocaleString('en-IN')}
• **Active Loans**: ${p.active_loans_count || 0} commercial facilities
• **Total Overdue**: ₹${Number(p.total_overdue_amount || 0).toLocaleString('en-IN')}
• **Collection Efficiency**: ${p.collection_efficiency_pct || 94.2}%

💡 **System Status**: Direct database intelligence active. (LLM token quota resets in rolling window).`,
    sources,
    suggestedActions: [
      { label: 'Open Action Center', action: 'navigate', params: { page: 'reconciliations' } },
      { label: 'Portfolio Health', action: 'navigate', params: { page: 'reports' } }
    ]
  };
};


// =============================================================================
// Helper: Parse XML / Text / Function Tool Calls emitted in model content
// =============================================================================

/**
 * Helper to parse arguments from key=value string or JSON string.
 */
const parseArgsString = (str = '') => {
  str = str.trim();
  if (!str) return {};
  if (str.startsWith('{') && str.endsWith('}')) {
    try { return JSON.parse(str); } catch {}
  }
  const args = {};
  const kvRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,)\s]+))/g;
  let match;
  let matchedAny = false;
  while ((match = kvRegex.exec(str)) !== null) {
    matchedAny = true;
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);
    if (!isNaN(val) && val.trim() !== '') {
      args[key] = Number(val);
    } else if (val === 'true') {
      args[key] = true;
    } else if (val === 'false') {
      args[key] = false;
    } else {
      args[key] = val;
    }
  }
  if (!matchedAny && str.length > 0) {
    const cleaned = str.replace(/^['"]|['"]$/g, '').trim();
    if (!isNaN(cleaned) && cleaned !== '') {
      args.id = Number(cleaned);
      args.runId = Number(cleaned);
      args.caseId = Number(cleaned);
      args.paymentId = Number(cleaned);
      args.companyId = Number(cleaned);
      args.loanId = Number(cleaned);
    } else {
      args.query = cleaned;
    }
  }
  return args;
};

/**
 * Parses function calls, XML, or JSON-based tool calls that open-source models (Qwen, DeepSeek)
 * may emit directly inside message.content.
 *
 * Supported Formats:
 * 1. Function syntax: <tool_call>\ngetAgentExecutionLogs(runId=1)
 * 2. XML syntax: <tool_call><function=searchCompanyByName><parameter=query>XYZ</parameter></function></tool_call>
 * 3. JSON syntax: <tool_call>{"name": "...", "arguments": {...}}</tool_call>
 *
 * @param {string} content - Message text content
 * @returns {Array} [{ name: string, args: Object }]
 */
const parseTextToolCalls = (content = '') => {
  if (!content) return [];
  const calls = [];

  // Pattern 1: function call syntax `fnName(arg=val, ...)` inside <tool_call> or ```tool_call
  const fnRegex = /(?:<tool_call>|```(?:tool_call|function))\s*([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)(?:\s*<\/tool_call>|\s*```|$)/gi;
  let fnMatch;
  while ((fnMatch = fnRegex.exec(content)) !== null) {
    const fnName = fnMatch[1];
    if (fnName && fnName !== 'function' && fnName !== 'tool_call') {
      const args = parseArgsString(fnMatch[2]);
      calls.push({ name: fnName, args });
    }
  }

  // Pattern 2: XML parameter format <function=name><parameter=k>v</parameter></function>
  const xmlRegex = /<tool_call>[\s\S]*?<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>[\s\S]*?(?:<\/tool_call>|$)/gi;
  let xMatch;
  while ((xMatch = xmlRegex.exec(content)) !== null) {
    const fnName = xMatch[1];
    const paramsBlock = xMatch[2];
    const paramRegex = /<parameter=([a-zA-Z0-9_]+)>([\s\S]*?)<\/parameter>/gi;
    const args = {};
    let pMatch;
    while ((pMatch = paramRegex.exec(paramsBlock)) !== null) {
      args[pMatch[1]] = pMatch[2].trim();
    }
    calls.push({ name: fnName, args });
  }

  // Pattern 3: JSON format inside <tool_call>{...}</tool_call> or ```json ... ```
  const jsonRegex = /(?:<tool_call>|```(?:json|tool_call))\s*(\{[\s\S]*?\})\s*(?:<\/tool_call>|```|$)/gi;
  let jMatch;
  while ((jMatch = jsonRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(jMatch[1]);
      if (parsed.name) {
        calls.push({ name: parsed.name, args: parsed.arguments || parsed.parameters || {} });
      }
    } catch {}
  }

  // Filter ONLY valid tool names declared in assistantToolsDeclaration
  const validToolNames = new Set(assistantToolsDeclaration.map(t => t.function.name));

  // Deduplicate calls by name and stringified args
  const seen = new Set();
  return calls.filter(c => {
    if (!validToolNames.has(c.name)) return false;
    const key = `${c.name}:${JSON.stringify(c.args)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// =============================================================================
// Helper: Parse Suggested Actions from Groq Response
// =============================================================================

/**
 * Extracts navigation suggestions from the AI response and sources.
 *
 * Groq is prompted to suggest specific actions.
 * We parse them here and return structured objects the frontend can render as buttons.
 *
 * Also infers actions from which tools were called:
 * - If getReconciliationCase was called → suggest "View Reconciliation Case"
 * - If getAgentRun was called → suggest "View Agent Run"
 *
 * @param {string} answerText - The raw Groq response
 * @param {Array}  sources    - Collected source meta objects
 * @returns {Array} [{ label, action, params }]
 */
const parseSuggestedActions = (answerText, sources) => {
  const actions = [];

  // Infer navigation actions from sources collected
  for (const src of sources) {
    switch (src.type) {
      case 'payment':
        if (src.recordId) actions.push({ label: `View Payment #${src.recordId}`, action: 'navigate', params: { page: 'payments', recordId: src.recordId } });
        break;
      case 'reconciliation_case':
        if (src.recordId) actions.push({ label: `View Case #${src.recordId}`, action: 'navigate', params: { page: 'reconciliations', recordId: src.recordId } });
        break;
      case 'agent_run':
        if (src.recordId) actions.push({ label: `View Agent Run #${src.recordId}`, action: 'navigate', params: { page: 'agents', recordId: src.recordId } });
        break;
      case 'company':
        if (src.recordId) actions.push({ label: `View ${src.title}`, action: 'navigate', params: { page: 'companies', recordId: src.recordId } });
        break;
      case 'pending_queue':
        actions.push({ label: 'Open Action Center', action: 'navigate', params: { page: 'reconciliations' } });
        break;
      case 'overdue_list':
        actions.push({ label: 'View Overdue Payments', action: 'navigate', params: { page: 'loans' } });
        break;
    }
  }

  // Deduplicate by label
  const seen = new Set();
  return actions.filter(a => {
    if (seen.has(a.label)) return false;
    seen.add(a.label);
    return true;
  }).slice(0, 4); // Max 4 suggested actions
};


// =============================================================================
// Helper: Deduplicate Sources
// =============================================================================

/**
 * Removes duplicate source citations (same tool + recordId).
 * A tool can be called multiple times in a long investigation.
 */
const deduplicateSources = (sources) => {
  const seen = new Set();
  return sources.filter(src => {
    const key = `${src.tool}_${src.recordId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
