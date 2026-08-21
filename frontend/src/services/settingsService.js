import api from './api';

/**
 * Service: Settings API Client
 *
 * Purpose:
 *   Provides frontend functions to read and save user/system settings.
 *
 * Called by:
 *   - frontend/src/pages/Settings.jsx
 */

/**
 * fetchSettings
 *
 * Purpose:
 *   Loads all settings for the current user from MySQL via backend.
 *
 * Data flow:
 *   Settings.jsx useEffect
 *     → fetchSettings()
 *     → GET /api/settings (with HTTP-only JWT cookie)
 *     → settings.controller.js reads user_settings table + merges defaults
 *     → Returns { user: {...}, system: {...}, locked_policies: {...} }
 *
 * @returns {Promise<Object>} { success, data: { user, system, locked_policies } }
 */
export const fetchSettings = () => api.get('/settings');

/**
 * saveSettings
 *
 * Purpose:
 *   Persists one or more setting key-value pairs to MySQL.
 *   Backend validates scope permissions (system scope = admin only).
 *
 * @param {Array} settings - Array of { key, value, scope } objects
 *   Example: [{ key: 'theme', value: 'dark', scope: 'user' }]
 *
 * @returns {Promise<Object>} { success, message }
 */
export const saveSettings = (settings) => api.put('/settings', { settings });
