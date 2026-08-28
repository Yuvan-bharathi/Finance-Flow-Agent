import { Router } from 'express';
import { assessCompanyRisk, getRiskOverview } from '../controllers/risk.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Risk Assessment Agent Routes
 * Base Path: /api/risk
 */
const router = Router();

router.use(authenticate);

router.get('/overview', getRiskOverview);
router.get('/assess/:companyId', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), assessCompanyRisk);

export default router;
