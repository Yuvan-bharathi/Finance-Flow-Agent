import pool from '../config/db.js';
import { agentQueue } from '../services/agentQueue.service.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/apiResponse.js';

/**
 * Controller: System Health & Observability Probe (Phase 6)
 *
 * Function: getSystemHealth(req, res)
 * Purpose: Safe, lightweight health check probe designed for container orchestrators
 *          (Docker, Kubernetes, Render liveness probes) and DevOps monitoring.
 *
 * Checks Performed:
 * 1. Database Liveness & Latency (SQL `SELECT 1` ping)
 * 2. Process Uptime & Memory Allocation (RSS / Heap)
 * 3. Agent Priority Queue Depth & Active Worker Counts
 *
 * Called by:
 * - `GET /health` and `GET /api/v1/health`
 *
 * Returns:
 * - HTTP 200 with `{ status: "UP", ... }` if healthy.
 * - HTTP 503 with `{ status: "DEGRADED", ... }` if database connection fails.
 */
export const getSystemHealth = async (req, res) => {
  const startTime = Date.now();
  const memory = process.memoryUsage();

  let dbStatus = 'DOWN';
  let dbLatencyMs = null;
  let isHealthy = true;

  try {
    const dbPingStart = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - dbPingStart;
    dbStatus = 'UP';
  } catch (err) {
    dbStatus = 'DOWN';
    isHealthy = false;
  }

  const queueMetrics = agentQueue ? agentQueue.getQueueStatus() : { active: 0, queued: 0 };

  const healthPayload = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latency_ms: dbLatencyMs
    },
    queue: {
      active_workers: queueMetrics.activeJobsCount || 0,
      queued_jobs: queueMetrics.queuedJobsCount || 0,
      max_concurrency: queueMetrics.maxConcurrency || 5,
      total_completed: queueMetrics.stats?.totalCompleted || 0
    },
    memory: {
      rss_mb: Math.round(memory.rss / (1024 * 1024)),
      heap_used_mb: Math.round(memory.heapUsed / (1024 * 1024)),
      heap_total_mb: Math.round(memory.heapTotal / (1024 * 1024))
    },
    check_duration_ms: Date.now() - startTime
  };

  if (isHealthy) {
    return sendSuccessResponse(res, 200, 'System health operational.', healthPayload);
  } else {
    return res.status(503).json({
      success: false,
      message: 'System health degraded: Database unreachable.',
      data: healthPayload,
      correlation_id: req.correlationId || null
    });
  }
};
