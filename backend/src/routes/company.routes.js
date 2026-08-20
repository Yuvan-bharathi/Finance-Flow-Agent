import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany
} from '../controllers/company.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Company Routes
 * Base Path: /api/companies
 * 
 * Endpoints:
 * - GET  /api/companies     (Authenticated - All roles)
 * - GET  /api/companies/:id (Authenticated - All roles)
 * - POST /api/companies     (Admin, Manager, Accountant)
 * - PUT  /api/companies/:id (Admin, Manager, Accountant)
 */

const router = Router();

// Apply authentication middleware to all company endpoints
router.use(authenticate);

router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/', authorize(['admin', 'manager', 'accountant']), createCompany);
router.put('/:id', authorize(['admin', 'manager', 'accountant']), updateCompany);

export default router;
