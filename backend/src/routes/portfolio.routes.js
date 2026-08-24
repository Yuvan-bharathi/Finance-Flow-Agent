import { Router } from 'express';
import {
  analyzePortfolio,
  getPortfolioSnapshots,
  getLatestSnapshot
} from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Portfolio Analytics Routes
 *
 * Base path: /api/portfolio (mounted in app.js)
 *
 * All routes require authentication via JWT cookie (authenticate middleware).
 *
 * Routes:
 *
 *   POST /api/portfolio/analyze
 *     → Triggers Agent 5 (Portfolio Analytics Agent)
 *     → Computes SQL metrics + Groq interpretation
 *     → Saves snapshot to portfolio_snapshots
 *     → Auth: Any authenticated user
 *
 *   GET /api/portfolio/snapshots
 *     → Returns recent portfolio snapshots (default: last 10)
 *     → Query param: ?limit=N (max 50)
 *     → Auth: Any authenticated user
 *
 *   GET /api/portfolio/latest
 *     → Returns the most recent single portfolio snapshot
 *     → Auth: Any authenticated user
 *
 * Data flow for POST /analyze:
 *   React AgentControlCenter
 *     → POST /api/portfolio/analyze (with JWT cookie)
 *     → authenticate middleware (validates JWT, populates req.user)
 *     → analyzePortfolio controller
 *     → runPortfolioAnalyticsAgent()
 *     → portfolioTools.js (SQL) + Groq LLM
 *     → portfolio_snapshots table
 *     → WebSocket PORTFOLIO_SNAPSHOT_READY event
 *     → JSON response → React
 */

const router = Router();

// All portfolio routes require the user to be authenticated.
// authenticate reads the HTTP-only cookie, verifies the JWT,
// and attaches { id, email, role } to req.user.
router.use(authenticate);

// POST /api/portfolio/analyze — Trigger Agent 5
router.post('/analyze', analyzePortfolio);

// GET /api/portfolio/snapshots — History
router.get('/snapshots', getPortfolioSnapshots);

// GET /api/portfolio/latest — Latest snapshot
router.get('/latest', getLatestSnapshot);

export default router;
