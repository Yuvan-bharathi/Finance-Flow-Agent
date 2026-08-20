import { Router } from 'express';
import { generateCollectionReminder, sendCollectionReminder } from '../controllers/collection.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/generate/:companyId', generateCollectionReminder);
router.post('/send', sendCollectionReminder);

export default router;
