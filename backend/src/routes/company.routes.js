import { Router } from 'express';
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany
} from '../controllers/company.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

/**
 * Express Router: Borrowing Companies Master Data Routes
 * Base Path: /api/companies
 */
const router = Router();

router.use(authenticate);

// Read endpoints (All authenticated roles - Cached for 60s under 'companies' tag)
router.get('/', cacheMiddleware({ ttlSeconds: 60, tag: 'companies' }), getCompanies);
router.get('/:id', cacheMiddleware({ ttlSeconds: 60, tag: 'companies' }), getCompanyById);

// Create / Modify endpoints (Restricted to owner, super_admin, admin, manager)
router.post('/', authorize(['owner', 'super_admin', 'admin', 'manager']), createCompany);
router.put('/:id', authorize(['owner', 'super_admin', 'admin', 'manager']), updateCompany);

// Delete / Deactivate endpoint (Strictly restricted to owner, super_admin)
router.delete('/:id', authorize(['owner', 'super_admin']), deleteCompany);

export default router;
