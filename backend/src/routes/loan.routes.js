import { Router } from 'express';
import {
  createLoan,
  getLoans,
  getLoanById
} from '../controllers/loan.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

/**
 * Express Router: Loan Facilities Routes
 * Base Path: /api/loans
 */
const router = Router();

router.use(authenticate);

// Read endpoints (All authenticated roles - Cached for 60s under 'loans' tag)
router.get('/', cacheMiddleware({ ttlSeconds: 60, tag: 'loans' }), getLoans);
router.get('/:id', cacheMiddleware({ ttlSeconds: 60, tag: 'loans' }), getLoanById);

// Create loan facility (Restricted to owner, super_admin, admin, manager)
router.post('/', authorize(['owner', 'super_admin', 'admin', 'manager']), createLoan);

export default router;
