import { Router } from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Settings Routes
 *
 * Base path: /api/settings (mounted in app.js)
 * Authentication: Required for all routes
 *
 * Routes:
 *
 *   GET /api/settings
 *     → Returns all settings for the authenticated user
 *     → Merges user_settings DB rows with defaults
 *     → Returns: { user: {...}, system: {...}, locked_policies: {...} }
 *     → Auth: Any authenticated user
 *
 *   PUT /api/settings
 *     → Upserts one or more settings for the authenticated user
 *     → Body: { settings: [{ key, value, scope }] }
 *     → Permission: 'system' scope requires admin/super_admin role
 *     → Auth: Authenticated user (scope-based permission enforced in controller)
 */
const router = Router();

router.use(authenticate);

router.get('/',  getUserSettings);
router.put('/',  updateUserSettings);

export default router;
