import { Router } from 'express';
import {
  getLoans,
  getLoanById,
  createLoan
} from '../controllers/loan.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Loan Routes
 * Base Path: /api/loans
 * 
 * Endpoints:
 * - GET  /api/loans     (Authenticated - All roles)
 * - GET  /api/loans/:id (Authenticated - All roles)
 * - POST /api/loans     (Admin, Manager, Accountant)
 */

const router = Router();

router.use(authenticate);

router.get('/', getLoans);
router.get('/:id', getLoanById);
router.post('/', authorize(['admin', 'manager', 'accountant']), createLoan);

export default router;
