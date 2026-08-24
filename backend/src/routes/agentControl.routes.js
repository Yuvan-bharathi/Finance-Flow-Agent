import { Router } from 'express';
import {
  getAgentStatus,
  getAgentRunHistory,
  getRunDetail,
  getRecentAgentActivity
} from '../controllers/agentControl.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Agent Control Center Routes
 * Base Path: /api/agents
 */

const router = Router();

router.use(authenticate);

router.get('/status', getAgentStatus);
router.get('/activity', getRecentAgentActivity);
router.get('/:agentId/runs', getAgentRunHistory);
router.get('/:agentId/runs/:runId', getRunDetail);

export default router;
