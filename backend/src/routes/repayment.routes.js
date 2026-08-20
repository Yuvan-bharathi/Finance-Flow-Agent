import { Router } from 'express';
import {
  getScheduleByLoanId,
  getDueInstallments,
  getScheduleById
} from '../controllers/repayment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Repayment Routes
 * Base Path: /api/repayments
 * 
 * Endpoints:
 * - GET /api/repayments/loan/:loanId (Authenticated - All roles)
 * - GET /api/repayments/due         (Authenticated - All roles)
 * - GET /api/repayments/:id         (Authenticated - All roles)
 */

const router = Router();

router.use(authenticate);

router.get('/loan/:loanId', getScheduleByLoanId);
router.get('/due', getDueInstallments);
router.get('/:id', getScheduleById);

export default router;
