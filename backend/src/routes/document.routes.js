import { Router } from 'express';
import {
  getDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  extractDocumentTerms,
  generateDocument
} from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getDocuments);
router.post(
  '/upload',
  authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']),
  upload.single('file'),
  uploadDocument
);
router.put(
  '/:id',
  authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']),
  updateDocument
);
router.delete(
  '/:id',
  authorize(['owner', 'super_admin', 'admin', 'manager']),
  deleteDocument
);
router.post('/extract/:documentId', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), extractDocumentTerms);
router.get('/generate/:type/:caseId', generateDocument);

export default router;
