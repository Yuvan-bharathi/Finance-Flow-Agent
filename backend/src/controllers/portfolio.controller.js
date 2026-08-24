import { runPortfolioAnalyticsAgent } from '../agents/portfolioAgent.js';
import pool from '../config/db.js';

/**
 * Controller: Portfolio Analytics Agent
 *
 * Purpose:
 *   Handles HTTP requests for Agent 5 operations.
 *   Validates the request, extracts the user identity from the JWT,
 *   delegates execution to portfolioAgent.js, and returns the result.
 *
 * Called by:
 *   - portfolio.routes.js → POST /api/portfolio/analyze
 *   - portfolio.routes.js → GET  /api/portfolio/snapshots
 *
 * Data flow (trigger):
 *   React frontend → POST /api/portfolio/analyze
 *     → auth.middleware (validates JWT, sets req.user)
 *     → analyzePortfolio()
 *     → runPortfolioAnalyticsAgent(triggeredBy)
 *     → portfolioTools.js (SQL) + Groq LLM
 *     → portfolio_snapshots table
 *     → JSON response → React
 *
 * @param {Object} req
 *   Express request object.
 *   req.user — Added by auth.middleware after JWT verification.
 *               Contains { id, email, role } of the logged-in user.
 *   req.body — Not required for portfolio trigger (no body params needed).
 *
 * @param {Object} res
 *   Express response object. Sends JSON back to the React frontend.
 */

/**
 * analyzePortfolio
 *
 * Purpose:
 *   Triggers Agent 5 to compute portfolio health and generate a snapshot.
 *
 * Success response (200):
 *   { success: true, data: <portfolio_snapshot_object> }
 *
 * Possible errors:
 *   500 — Agent internal failure (Groq error, DB error, etc.)
 */
export const analyzePortfolio = async (req, res) => {
  try {
    // req.user.id comes from auth.middleware after JWT decoding.
    // We pass this to the agent so we know who triggered the run.
    const triggeredBy = req.user?.id || null;

    const result = await runPortfolioAnalyticsAgent(triggeredBy);

    return res.status(200).json({
      success: true,
      message: 'Portfolio analysis completed successfully.',
      data: result
    });

  } catch (err) {
    console.error('[Portfolio Controller Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Portfolio analysis failed.',
      error: err.message
    });
  }
};

/**
 * getPortfolioSnapshots
 *
 * Purpose:
 *   Retrieves recent portfolio health snapshots from portfolio_snapshots table.
 *   Used by the frontend to display historical portfolio health trend.
 *
 * Query params:
 *   ?limit=10 (default: 10, max: 50)
 *
 * Data flow:
 *   GET /api/portfolio/snapshots
 *     → auth.middleware
 *     → getPortfolioSnapshots()
 *     → SELECT from portfolio_snapshots
 *     → JSON response
 *
 * Success response (200):
 *   { success: true, data: [ <snapshot>, ... ] }
 */
export const getPortfolioSnapshots = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const [rows] = await pool.query(`
      SELECT
        ps.*,
        ar.triggered_by,
        u.name AS triggered_by_name
      FROM portfolio_snapshots ps
      LEFT JOIN agent_runs ar ON ps.agent_run_id = ar.id
      LEFT JOIN users u ON ar.triggered_by = u.id
      ORDER BY ps.created_at DESC
      LIMIT ?
    `, [limit]);

    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error('[Portfolio Controller getSnapshots Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve portfolio snapshots.',
      error: err.message
    });
  }
};

/**
 * getLatestSnapshot
 *
 * Purpose:
 *   Returns only the most recent portfolio snapshot.
 *   Used for the dashboard summary card and Agent Control Center overview.
 */
export const getLatestSnapshot = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ps.*, u.name AS triggered_by_name
      FROM portfolio_snapshots ps
      LEFT JOIN agent_runs ar ON ps.agent_run_id = ar.id
      LEFT JOIN users u ON ar.triggered_by = u.id
      ORDER BY ps.created_at DESC
      LIMIT 1
    `);

    return res.status(200).json({
      success: true,
      data: rows[0] || null
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve latest snapshot.' });
  }
};
