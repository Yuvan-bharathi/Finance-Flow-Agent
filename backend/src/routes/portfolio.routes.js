import { Router } from 'express';
import {
  analyzePortfolio,
  getPortfolioSnapshots,
  getLatestSnapshot
} from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Portfolio Analytics Routes
 * Base path: /api/portfolio (mounted in app.js)
 */

const router = Router();

router.use(authenticate);

// POST /api/portfolio/analyze — Trigger Agent 5 (Restricted to owner, super_admin, admin, manager)
router.post('/analyze', authorize(['owner', 'super_admin', 'admin', 'manager']), analyzePortfolio);

// GET /api/portfolio/snapshots — History (All authenticated users can view)
router.get('/snapshots', getPortfolioSnapshots);

// GET /api/portfolio/latest — Latest snapshot (All authenticated users can view)
router.get('/latest', getLatestSnapshot);

export default router;
