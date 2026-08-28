import express from 'express';
import { getSystemHealth } from '../controllers/health.controller.js';

/**
 * Route: System Observability Health Check (Phase 6)
 *
 * @openapi
 * /health:
 *   get:
 *     summary: System Health & Liveness Probe
 *     description: Returns lightweight operational metrics including DB latency, memory usage, uptime, and agent queue depth.
 *     tags:
 *       - Observability & System Health
 *     responses:
 *       200:
 *         description: System operational and healthy.
 *       503:
 *         description: System degraded (e.g. database unreachable).
 */
const router = express.Router();

router.get('/', getSystemHealth);

export default router;
