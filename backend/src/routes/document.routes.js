import { Router } from 'express';
import { getDocuments, extractDocumentTerms } from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getDocuments);
router.post('/extract/:documentId', extractDocumentTerms);

export default router;
