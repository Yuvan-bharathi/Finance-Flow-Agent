import { Router } from 'express';
import {
  analyzeCase,
  analyzeBulk,
  analyzeAllPending,
  getCases,
  getCaseById,
  getStats
} from '../controllers/reconciliation.controller.js';
import {
  approveRecommendation,
  rejectRecommendation,
  overrideRecommendation,
  getAllocations
} from '../controllers/settlement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Reconciliation & Settlement Routes
 * Base Path: /api/reconciliations
 */

const router = Router();

router.use(authenticate);

// Analytics Stats Endpoint
router.get('/stats', getStats);

// 1. AI Analysis Trigger Endpoints
router.post('/analyze/:caseId', authorize(['admin', 'manager', 'accountant']), analyzeCase);
router.post('/analyze-bulk', authorize(['admin', 'manager', 'accountant']), analyzeBulk);
router.post('/analyze-all-pending', authorize(['admin', 'manager', 'accountant']), analyzeAllPending);

// 2. Human Settlement Gate Endpoints
router.post('/approve', authorize(['admin', 'manager', 'accountant']), approveRecommendation);
router.post('/reject', authorize(['admin', 'manager', 'accountant']), rejectRecommendation);
router.post('/override', authorize(['admin', 'manager', 'accountant']), overrideRecommendation);

// 3. Query Endpoints
router.get('/cases', getCases);
router.get('/cases/:caseId', getCaseById);
router.get('/allocations', getAllocations);

export default router;
