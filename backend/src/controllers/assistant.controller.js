import { runAssistantAgent } from '../agents/assistantAgent.js';

/**
 * Controller: FinanceFlow AI Assistant
 *
 * Purpose:
 *   HTTP handlers for the AI Copilot endpoints.
 *   Validates the request, delegates to assistantAgent.js, returns structured response.
 *
 * Routes handled:
 *   POST /api/assistant/chat         → chat()         (main conversation endpoint)
 *   GET  /api/assistant/wake/:type/:id → wakeContext() (pre-load context for Investigate button)
 *
 * Request shape for POST /api/assistant/chat:
 *   {
 *     message:             string,      // User's current message
 *     conversationHistory: Array,       // Last N messages [{ role, content }] from React state
 *     contextPayload: {                 // Current page + record user is looking at
 *       page:       string,             // e.g., 'payments', 'companies', 'reconciliations'
 *       recordType: string | null,      // e.g., 'payment', 'company', 'reconciliation_case'
 *       recordId:   number | null       // Primary key of the selected record
 *     }
 *   }
 *
 * Response shape:
 *   {
 *     success:          boolean,
 *     data: {
 *       answer:           string,        // Markdown-formatted AI response
 *       sources: [                       // Structured source citations for UI cards
 *         { type, tool, recordId, title, snippet }
 *       ],
 *       suggestedActions: [              // Navigation/action buttons for frontend
 *         { label, action, params }
 *       ],
 *       total_tokens:     number,
 *       context:          Object
 *     }
 *   }
 */

/**
 * chat — Main AI Copilot Conversation Endpoint
 *
 * Data flow:
 *   Frontend AiCopilotPanel.jsx
 *     → POST /api/assistant/chat (with JWT cookie)
 *     → authenticate middleware (sets req.user)
 *     → chat() controller
 *     → runAssistantAgent({ message, conversationHistory, contextPayload, user })
 *     → Groq tool-calling loop → MySQL tools
 *     → { answer, sources, suggestedActions }
 *     → JSON response → React renders message + source cards + action buttons
 */
export const chat = async (req, res) => {
  try {
    const { message, conversationHistory = [], contextPayload = {} } = req.body;

    // Validate required field
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty message is required.'
      });
    }

    // Attach user from JWT middleware to agent context
    const user = {
      id:   req.user.id,
      name: req.user.name || req.user.email,
      email: req.user.email,
      role: req.user.role || 'accountant'
    };

    // Run the assistant agent
    // conversationHistory: frontend sends last 10 messages (Phase 1 — no DB persistence)
    const result = await runAssistantAgent({
      message:             message.trim(),
      conversationHistory: conversationHistory.slice(-10),  // Enforce 10-message limit server-side too
      contextPayload,
      user
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('[Assistant Controller Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'AI Assistant encountered an error. Please try again.',
      error:   err.message
    });
  }
};

/**
 * wakeContext — Pre-load Context for Investigate Button
 *
 * Purpose:
 *   When a user clicks the [Ask AI] button on a record (e.g., Payment #1042),
 *   this endpoint returns a brief summary of that record to pre-populate
 *   the copilot panel context badge and opening message.
 *
 * Data flow:
 *   Frontend: user clicks [Ask AI] on Payment #1042
 *     → GET /api/assistant/wake/payment/1042
 *     → wakeContext()
 *     → Returns { title, snippet, recordType, recordId }
 *     → Frontend sets contextPayload + shows context badge "📄 Payment #1042"
 *     → Panel opens ready for user to ask about that payment
 */
export const wakeContext = async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    const parsedId = parseInt(recordId, 10);

    if (!recordType || !parsedId) {
      return res.status(400).json({ success: false, message: 'recordType and recordId are required.' });
    }

    // Build a minimal context summary using the tool's meta
    const { executeAssistantTool } = await import('../tools/assistantTools.js');

    let toolName = null;
    let toolArgs = {};

    switch (recordType) {
      case 'payment':
        toolName = 'getPaymentDetails';
        toolArgs = { paymentId: parsedId };
        break;
      case 'reconciliation_case':
        toolName = 'getReconciliationCase';
        toolArgs = { caseId: parsedId };
        break;
      case 'company':
        toolName = 'getCompanyProfile';
        toolArgs = { companyId: parsedId };
        break;
      case 'loan':
        toolName = 'getLoanDetails';
        toolArgs = { loanId: parsedId };
        break;
      case 'document':
        toolName = 'getDocumentSummary';
        toolArgs = { documentId: parsedId };
        break;
      default:
        return res.status(400).json({ success: false, message: `Unknown recordType: ${recordType}` });
    }

    const { meta } = await executeAssistantTool(toolName, toolArgs, req.user);

    return res.status(200).json({
      success: true,
      data: {
        recordType,
        recordId:  parsedId,
        title:     meta.title,
        snippet:   meta.snippet
      }
    });

  } catch (err) {
    console.error('[Assistant wakeContext Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load context.' });
  }
};
