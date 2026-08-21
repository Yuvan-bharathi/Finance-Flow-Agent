import pool from '../config/db.js';

/**
 * Controller: Settings
 *
 * Purpose:
 *   Reads and writes user settings from/to the user_settings MySQL table.
 *
 * Design Decision (settings_scope separation):
 *   'user' scope  → personal preferences (theme, timezone, notification_email).
 *                   Any authenticated user can update their own 'user' settings.
 *   'system' scope → AI operational settings (confidence_threshold, agent_5_enabled).
 *                   Only admin/super_admin can update 'system' settings.
 *                   This prevents a junior accountant from disabling agents.
 *
 * Human Approval Policy:
 *   The 'human_approval_required' setting is NOT a regular toggle.
 *   It is enforced as a read-only ENFORCED status in the UI.
 *   This prevents accidental or unauthorized disabling of the safety policy.
 *
 * Called by:
 *   - settings.routes.js
 *
 * Data flow (GET):
 *   GET /api/settings
 *     → auth.middleware (req.user)
 *     → getUserSettings()
 *     → SELECT from user_settings WHERE user_id = req.user.id
 *     → Returns flat key-value object
 *
 * Data flow (PUT):
 *   PUT /api/settings
 *     → auth.middleware (req.user)
 *     → updateUserSettings()
 *     → Validates scope permissions
 *     → INSERT...ON DUPLICATE KEY UPDATE (upsert pattern)
 *     → Returns updated settings
 *
 * @param {Object} req - Express request (req.user populated by auth.middleware)
 * @param {Object} res - Express response
 */

// ─── Default Settings (applied when user has no settings saved yet) ──────────
// These defaults are returned when no row exists in user_settings for a given key.
// They represent the safe, conservative initial state of the application.

const USER_DEFAULTS = {
  theme:              'light',
  timezone:           'Asia/Kolkata',
  date_format:        'DD/MM/YYYY',
  sound_alerts:       'false',
  notification_email: 'true',
  default_dashboard:  'reconciliations'
};

const SYSTEM_DEFAULTS = {
  agent_1_enabled:            'true',
  agent_2_enabled:            'true',
  agent_3_enabled:            'true',
  agent_4_enabled:            'true',
  agent_5_enabled:            'true',
  agent_6_enabled:            'true',
  confidence_threshold:       '85',
  delinquency_threshold:      '30',
  reconciliation_tolerance:   '5',
  max_bulk_cases:             '50'
};

// human_approval_required is always ENFORCED — never stored as a toggle
const LOCKED_POLICIES = {
  human_approval_required: 'ENFORCED'
};

/**
 * getUserSettings
 *
 * Purpose:
 *   Returns all settings for the requesting user.
 *   Merges defaults with any saved values from user_settings table.
 *
 * Returns shape:
 *   {
 *     user: { theme, timezone, ... },
 *     system: { agent_1_enabled, confidence_threshold, ... },
 *     locked_policies: { human_approval_required: 'ENFORCED' }
 *   }
 */
export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all saved settings for this user from MySQL
    const [rows] = await pool.query(`
      SELECT setting_key, setting_value, setting_scope
      FROM user_settings
      WHERE user_id = ?
    `, [userId]);

    // Convert DB rows into a flat key-value map for easy lookup
    // rows: [{ setting_key: 'theme', setting_value: 'dark', setting_scope: 'user' }]
    const savedMap = {};
    rows.forEach(row => { savedMap[row.setting_key] = row.setting_value; });

    // Merge saved values over defaults
    // If user has saved 'theme' = 'dark', it overrides USER_DEFAULTS.theme = 'light'
    const userSettings   = Object.fromEntries(
      Object.entries(USER_DEFAULTS).map(([k, v]) => [k, savedMap[k] ?? v])
    );
    const systemSettings = Object.fromEntries(
      Object.entries(SYSTEM_DEFAULTS).map(([k, v]) => [k, savedMap[k] ?? v])
    );

    return res.status(200).json({
      success: true,
      data: {
        user:            userSettings,
        system:          systemSettings,
        locked_policies: LOCKED_POLICIES
      }
    });

  } catch (err) {
    console.error('[Settings Controller getUserSettings Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve settings.' });
  }
};

/**
 * updateUserSettings
 *
 * Purpose:
 *   Saves or updates one or more settings for the requesting user.
 *   Uses INSERT...ON DUPLICATE KEY UPDATE (upsert) to create or update rows.
 *
 * Request body:
 *   {
 *     "settings": [
 *       { "key": "theme", "value": "dark", "scope": "user" },
 *       { "key": "confidence_threshold", "value": "90", "scope": "system" }
 *     ]
 *   }
 *
 * Permission check:
 *   'system' scope settings can only be updated by admin or super_admin users.
 *   'user' scope settings can be updated by any authenticated user.
 *
 * Possible errors:
 *   400 — Missing settings array
 *   403 — Non-admin trying to update system settings
 *   500 — Database error
 */
export const updateUserSettings = async (req, res) => {
  try {
    const userId   = req.user.id;
    const userRole = req.user.role;

    // req.body.settings is an array of { key, value, scope } objects
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain a non-empty "settings" array.'
      });
    }

    // Permission gate: system settings require admin or super_admin role
    const hasSystemSettings = settings.some(s => s.scope === 'system');
    if (hasSystemSettings && !['admin', 'super_admin', 'owner'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'System settings can only be modified by Admin or Super Admin users.'
      });
    }

    // Upsert each setting using MySQL INSERT...ON DUPLICATE KEY UPDATE
    // The unique key (user_id, setting_key) prevents duplicate rows.
    for (const setting of settings) {
      await pool.execute(`
        INSERT INTO user_settings (user_id, setting_key, setting_value, setting_scope)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          setting_scope = VALUES(setting_scope),
          updated_at    = NOW()
      `, [userId, setting.key, String(setting.value), setting.scope || 'user']);
    }

    return res.status(200).json({
      success: true,
      message: `${settings.length} setting(s) saved successfully.`
    });

  } catch (err) {
    console.error('[Settings Controller updateUserSettings Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to save settings.' });
  }
};
