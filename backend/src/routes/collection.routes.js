import { Router } from 'express';
import { generateCollectionReminder, sendCollectionReminder } from '../controllers/collection.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/generate/:companyId', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), generateCollectionReminder);
router.post('/send', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), sendCollectionReminder);

export default router;
