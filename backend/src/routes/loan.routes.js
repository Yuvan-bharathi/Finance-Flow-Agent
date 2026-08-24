import { Router } from 'express';
import {
  createLoan,
  getLoans,
  getLoanById
} from '../controllers/loan.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Loan Facilities Routes
 * Base Path: /api/loans
 */
const router = Router();

router.use(authenticate);

// Read endpoints (All authenticated roles)
router.get('/', getLoans);
router.get('/:id', getLoanById);

// Create loan facility (Restricted to owner, super_admin, admin, manager)
router.post('/', authorize(['owner', 'super_admin', 'admin', 'manager']), createLoan);

export default router;
