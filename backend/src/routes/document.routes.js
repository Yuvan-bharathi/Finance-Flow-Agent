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

const DOCUMENT_ROLES = [
  'owner',
  'super_admin',
  'super admin',
  'platform_admin',
  'platform admin',
  'admin',
  'manager',
  'senior_accountant',
  'senior accountant',
  'accountant'
];

router.get('/', getDocuments);
router.post(
  '/upload',
  authorize(DOCUMENT_ROLES),
  upload.single('file'),
  uploadDocument
);
router.put(
  '/:id',
  authorize(DOCUMENT_ROLES),
  updateDocument
);
router.delete(
  '/:id',
  authorize(DOCUMENT_ROLES),
  deleteDocument
);
router.post('/extract/:documentId', authorize(DOCUMENT_ROLES), extractDocumentTerms);
router.get('/generate/:type/:caseId', generateDocument);

export default router;
