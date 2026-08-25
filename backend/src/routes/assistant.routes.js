import { Router } from 'express';
import { chat, wakeContext } from '../controllers/assistant.controller.js';
import { confirmAction, dismissAction } from '../controllers/assistantAction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

/**
 * Express Router: AI Assistant Routes
 * Base path: /api/assistant (and /api/v1/assistant)
 * Purpose: AI Copilot conversation, entity investigation, and human-in-the-loop action execution.
 */
const router = Router();

router.use(authenticate);

// 1. AI Copilot Conversation & Investigation (Requires AI_QUERY)
router.post('/chat', requirePermission(PERMISSIONS.AI_QUERY), chat);
router.get('/wake/:recordType/:recordId', requirePermission(PERMISSIONS.AI_QUERY), wakeContext);

// 2. Action Confirmation Execution (Requires AI_ACTION_CONFIRM + Idempotency Guard)
router.post(
  '/actions/confirm',
  requirePermission(PERMISSIONS.AI_ACTION_CONFIRM),
  idempotencyMiddleware({ required: false }),
  confirmAction
);

// 3. Action Dismissal (Requires AI_ACTION_PROPOSE)
router.post('/actions/dismiss', requirePermission(PERMISSIONS.AI_ACTION_PROPOSE), dismissAction);

export default router;
