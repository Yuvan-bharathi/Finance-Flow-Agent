import { Router } from 'express';
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany
} from '../controllers/company.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Borrowing Companies Master Data Routes
 * Base Path: /api/companies
 */
const router = Router();

router.use(authenticate);

// Read endpoints (All authenticated roles)
router.get('/', getCompanies);
router.get('/:id', getCompanyById);

// Create / Modify endpoints (Restricted to owner, super_admin, admin, manager)
router.post('/', authorize(['owner', 'super_admin', 'admin', 'manager']), createCompany);
router.put('/:id', authorize(['owner', 'super_admin', 'admin', 'manager']), updateCompany);

export default router;
