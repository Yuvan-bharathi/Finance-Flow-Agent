import { Router } from 'express';
import {
  analyzePortfolio,
  getPortfolioSnapshots,
  getLatestSnapshot
} from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

/**
 * Express Router: Portfolio Analytics Routes
 * Base path: /api/portfolio (mounted in app.js)
 */

const router = Router();

router.use(authenticate);

// POST /api/portfolio/analyze — Trigger Agent 5 (Restricted to owner, super_admin, admin, manager)
router.post('/analyze', authorize(['owner', 'super_admin', 'admin', 'manager']), analyzePortfolio);

// GET /api/portfolio/snapshots — History (Cached for 120s under 'reports' tag)
router.get('/snapshots', cacheMiddleware({ ttlSeconds: 120, tag: 'reports' }), getPortfolioSnapshots);

// GET /api/portfolio/latest — Latest snapshot (Cached for 60s under 'reports' tag)
router.get('/latest', cacheMiddleware({ ttlSeconds: 60, tag: 'reports' }), getLatestSnapshot);

export default router;
