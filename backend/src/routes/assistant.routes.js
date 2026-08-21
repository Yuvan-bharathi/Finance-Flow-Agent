import { Router } from 'express';
import { chat, wakeContext } from '../controllers/assistant.controller.js';
import { confirmAction, dismissAction } from '../controllers/assistantAction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: AI Assistant Routes
 *
 * Base path: /api/assistant (mounted in app.js)
 * Authentication: Required for all routes (JWT cookie via authenticate middleware)
 *
 * Routes:
 *
 *   POST /api/assistant/chat
 *     → Main AI Copilot conversation endpoint
 *     → Body: { message, conversationHistory[], contextPayload: { page, recordType, recordId } }
 *     → Returns: { answer, sources[], suggestedActions[], total_tokens }
 *     → Auth: Any authenticated user
 *
 *   GET /api/assistant/wake/:recordType/:recordId
 *     → Pre-loads context when user clicks [Ask AI] / [Investigate] on a record
 *     → Returns: { title, snippet } for context badge in copilot panel
 *
 *   POST /api/assistant/actions/confirm
 *     → Executes a confirmed action proposal (Human-in-the-Loop)
 *     → Body: { proposalId }
 *
 *   POST /api/assistant/actions/dismiss
 *     → Dismisses an action proposal without executing mutations
 *     → Body: { proposalId }
 */
const router = Router();

router.use(authenticate);

// Main conversation endpoint
router.post('/chat', chat);

// Context pre-loader for Investigate button
router.get('/wake/:recordType/:recordId', wakeContext);

// Phase 3 Action Proposal Endpoints
router.post('/actions/confirm', confirmAction);
router.post('/actions/dismiss', dismissAction);

export default router;
