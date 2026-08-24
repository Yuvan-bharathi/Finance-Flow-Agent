import api from './api';

/**
 * Service: Portfolio Analytics API Client
 *
 * Purpose:
 *   Provides frontend functions to interact with the Portfolio Analytics backend.
 *   Each function maps to one backend API route.
 *
 * Data flow:
 *   React component → portfolioService function → api.js (axios) → Express backend
 *
 * Called by:
 *   - frontend/src/pages/AgentControlCenter.jsx
 */

/**
 * triggerPortfolioAnalysis
 *
 * Purpose:
 *   Triggers Agent 5 to run a full portfolio health analysis.
 *   Sends POST request — backend validates JWT, runs agent, returns snapshot.
 *
 * Data flow:
 *   React [Run Portfolio Analytics] button
 *     → triggerPortfolioAnalysis()
 *     → POST /api/portfolio/analyze (with HTTP-only JWT cookie)
 *     → backend portfolioAgent.js
 *     → Returns portfolio health snapshot
 *
 * @returns {Promise<Object>} { success, data: { health_score, health_grade, ai_interpretation, ... } }
 */
export const triggerPortfolioAnalysis = () => api.post('/portfolio/analyze');

/**
 * getPortfolioSnapshots
 *
 * Purpose:
 *   Retrieves recent portfolio snapshots for historical trend display.
 *
 * @param {number} limit - How many snapshots to return (default: 10)
 * @returns {Promise<Object>} { success, data: [ <snapshot>, ... ] }
 */
export const getPortfolioSnapshots = (limit = 10) =>
  api.get(`/portfolio/snapshots?limit=${limit}`);

/**
 * getLatestPortfolioSnapshot
 *
 * Purpose:
 *   Retrieves only the most recent portfolio snapshot for the dashboard card.
 *
 * @returns {Promise<Object>} { success, data: <latest_snapshot | null> }
 */
export const getLatestPortfolioSnapshot = () => api.get('/portfolio/latest');
