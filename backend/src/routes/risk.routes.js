import { Router } from 'express';
import { assessCompanyRisk, getRiskOverview } from '../controllers/risk.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Risk Assessment Agent Routes
 * Base Path: /api/risk
 */
const router = Router();

router.use(authenticate);

router.get('/overview', getRiskOverview);
router.get('/assess/:companyId', assessCompanyRisk);

export default router;
