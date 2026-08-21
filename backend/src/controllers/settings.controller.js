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

/**
 * getAiTokenUsage
 *
 * Purpose:
 *   Retrieves platform-wide AI token consumption analytics for Admins & Owners.
 *   Calculates today's usage, total historical usage, agent breakdowns, and estimated costs.
 */
export const getAiTokenUsage = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;

    // 1. Overall stats
    const [summaryRows] = await pool.query(`
      SELECT
        COALESCE(SUM(total_tokens), 0) AS grand_total_tokens,
        COALESCE(SUM(CASE WHEN created_at >= CURDATE() THEN total_tokens ELSE 0 END), 0) AS today_tokens,
        COALESCE(SUM(CASE WHEN created_at >= CURDATE() THEN 1 ELSE 0 END), 0) AS today_runs,
        COALESCE(COUNT(*), 0) AS total_runs
      FROM agent_runs
    `);

    // 2. Per-agent breakdown
    const [agentRows] = await pool.query(`
      SELECT
        agent_id,
        agent_name,
        COUNT(*) AS total_runs,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        ROUND(AVG(total_tokens), 0) AS avg_tokens_per_run,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful_runs,
        SUM(CASE WHEN groq_called = 1 THEN 1 ELSE 0 END) AS groq_calls
      FROM agent_runs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY agent_id, agent_name
      ORDER BY total_tokens DESC
    `, [days]);

    // 3. Active model from settings or env
    const [modelSetting] = await pool.query(`
      SELECT setting_value FROM user_settings WHERE setting_key = 'ai_active_model' LIMIT 1
    `);
    const activeModel = modelSetting[0]?.setting_value || process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

    const grandTotal = parseInt(summaryRows[0]?.grand_total_tokens || 0, 10);
    const todayTokens = parseInt(summaryRows[0]?.today_tokens || 0, 10);
    // Estimated cost: ~₹0.005 per 1,000 tokens (Groq / Enterprise LLM scale)
    const estimatedCostInr = ((grandTotal / 1000) * 0.005).toFixed(2);
    const todayCostInr = ((todayTokens / 1000) * 0.005).toFixed(2);

    const availableModels = [
      { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Reasoning & Tool Call)', provider: 'Groq Cloud', tier: 'Fast / High Quota', status: 'Active' },
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (Enterprise Financial)', provider: 'Groq Cloud', tier: 'High Precision', status: 'Active' },
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (Compact & Fast)', provider: 'Groq Cloud', tier: 'Lightweight', status: 'Active' },
      { id: 'groq/compound-mini', name: 'Groq Compound Mini (MoE Router)', provider: 'Groq Cloud', tier: 'Fast', status: 'Standby' },
      { id: 'allam-2-7b', name: 'Allam 2 7B (Multilingual)', provider: 'Groq Cloud', tier: 'Fast', status: 'Standby' }
    ];

    return res.status(200).json({
      success: true,
      data: {
        grand_total_tokens: grandTotal,
        today_tokens: todayTokens,
        today_runs: parseInt(summaryRows[0]?.today_runs || 0, 10),
        total_runs: parseInt(summaryRows[0]?.total_runs || 0, 10),
        tpd_limit: 200000,
        tpd_used_pct: Math.min(Math.round((todayTokens / 200000) * 100), 100),
        estimated_cost_inr: estimatedCostInr,
        today_cost_inr: todayCostInr,
        active_model: activeModel,
        available_models: availableModels,
        agent_breakdown: agentRows
      }
    });
  } catch (err) {
    console.error('[Settings getAiTokenUsage Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve AI token usage.' });
  }
};

/**
 * setActiveAiModel
 *
 * Purpose:
 *   Allows Admins and Owners to change the active LLM model dynamically.
 */
export const setActiveAiModel = async (req, res) => {
  try {
    const { model } = req.body;
    const userRole = req.user.role;

    if (!['admin', 'super_admin', 'owner'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only Administrators and Owners can switch the platform AI model.'
      });
    }

    if (!model) {
      return res.status(400).json({ success: false, message: 'Model ID is required.' });
    }

    // Save to user_settings as system setting
    await pool.execute(`
      INSERT INTO user_settings (user_id, setting_key, setting_value, setting_scope)
      VALUES (?, 'ai_active_model', ?, 'system')
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_at = NOW()
    `, [req.user.id, model]);

    // Update runtime env
    process.env.GROQ_MODEL = model;

    return res.status(200).json({
      success: true,
      message: `Active AI model successfully switched to ${model}.`,
      active_model: model
    });
  } catch (err) {
    console.error('[Settings setActiveAiModel Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to switch AI model.' });
  }
};

