import { Router } from 'express';
import {
  getUserSettings,
  updateUserSettings,
  getAiTokenUsage,
  setActiveAiModel
} from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Settings Routes
 * Base path: /api/settings
 */
const router = Router();

router.use(authenticate);

// Read & update settings
router.get('/', getUserSettings);
router.put('/', updateUserSettings);

// Infrastructure billing telemetry & live model switcher (Restricted to owner & super_admin)
router.get('/token-usage', authorize(['owner', 'super_admin']), getAiTokenUsage);
router.put('/active-model', authorize(['owner', 'super_admin']), setActiveAiModel);

export default router;
