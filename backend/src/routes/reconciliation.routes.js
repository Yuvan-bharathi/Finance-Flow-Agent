import { Router } from 'express';
import {
  analyzeCase,
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
 * 
 * Endpoints:
 * - GET  /api/reconciliations/stats          (Authenticated - All roles)
 * - POST /api/reconciliations/analyze/:caseId (Admin, Manager, Accountant) - Trigger Agent 1
 * - POST /api/reconciliations/approve        (Admin, Manager, Accountant) - Human-in-the-Loop Approve
 * - POST /api/reconciliations/reject         (Admin, Manager, Accountant) - Human-in-the-Loop Reject
 * - POST /api/reconciliations/override       (Admin, Manager, Accountant) - Human-in-the-Loop Manual Override
 * - GET  /api/reconciliations/cases          (Authenticated - All roles)
 * - GET  /api/reconciliations/cases/:caseId   (Authenticated - All roles)
 * - GET  /api/reconciliations/allocations    (Authenticated - All roles)
 */

const router = Router();

router.use(authenticate);

// Analytics Stats Endpoint
router.get('/stats', getStats);

// 1. AI Analysis Trigger Endpoint
router.post('/analyze/:caseId', authorize(['admin', 'manager', 'accountant']), analyzeCase);

// 2. Human Settlement Gate Endpoints
router.post('/approve', authorize(['admin', 'manager', 'accountant']), approveRecommendation);
router.post('/reject', authorize(['admin', 'manager', 'accountant']), rejectRecommendation);
router.post('/override', authorize(['admin', 'manager', 'accountant']), overrideRecommendation);

// 3. Query Endpoints
router.get('/cases', getCases);
router.get('/cases/:caseId', getCaseById);
router.get('/allocations', getAllocations);

export default router;
