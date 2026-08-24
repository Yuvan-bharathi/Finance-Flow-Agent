import { Router } from 'express';
import { getDocuments, extractDocumentTerms } from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getDocuments);
router.post('/extract/:documentId', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), extractDocumentTerms);

export default router;
