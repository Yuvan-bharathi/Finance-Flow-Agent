import { Router } from 'express';
import {
  getStats,
  getCases,
  getCaseById,
  getAllocations,
  analyzeCase,
  analyzeBulk,
  analyzeAllPending,
  approveRecommendation,
  rejectRecommendation,
  overrideRecommendation
} from '../controllers/reconciliation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Payment Reconciliation Routes
 * Base path: /api/reconciliations
 */
const router = Router();

router.use(authenticate);

// Read statistics & cases (All authenticated roles)
router.get('/stats', getStats);
router.get('/cases', getCases);
router.get('/cases/:caseId', getCaseById);
router.get('/allocations', getAllocations);

// Trigger AI Agent 1 (Restricted to non-viewer operational roles)
router.post('/analyze/:caseId', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), analyzeCase);
router.post('/analyze-bulk', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), analyzeBulk);
router.post('/analyze-all-pending', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), analyzeAllPending);

// Human-in-the-loop decisions (Restricted to owner, super_admin, admin, manager, senior_accountant)
router.post('/approve', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), approveRecommendation);
router.post('/reject', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), rejectRecommendation);
router.post('/override', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), overrideRecommendation);

export default router;
