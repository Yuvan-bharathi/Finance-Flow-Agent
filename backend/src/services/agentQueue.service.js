import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

/**
 * Service: Agent Priority & Concurrency Queue (Phase 5 Orchestrator)
 * Purpose: In-process priority-based job queue with concurrency controls,
 *          exponential backoff retries, and execution telemetry.
 * 
 * Note on Architecture:
 * - Queue ordering: CRITICAL (1) > HIGH (2) > MEDIUM (3) > LOW (4).
 * - Concurrency limit: Enforces MAX_CONCURRENCY (default 5) to safeguard Groq LLM API rate limits.
 * - Retry strategy: 3 attempts with exponential backoff on transient errors.
 * 
 * Data flow:
 * Trigger (Webhook / UI / API) ➔ agentQueue.addJob() ➔ Priority Heap ➔ Worker Dispatcher ➔ Orchestrator / Agent
 */

export const PRIORITY = {
  CRITICAL: 1, // Manual user click in UI / Urgent single case
  HIGH: 2,     // Bank deposit ingestion webhook
  MEDIUM: 3,   // Risk recalculation / Collection trigger
  LOW: 4       // Scheduled batch scans / Portfolio snapshots
};

class AgentPriorityQueue extends EventEmitter {
  constructor(maxConcurrency = 5, maxRetries = 3) {
    super();
    this.maxConcurrency = maxConcurrency;
    this.maxRetries = maxRetries;
    this.queue = [];       // Array of waiting job descriptors
    this.activeJobs = new Map(); // Map of currently running job IDs -> job info
    this.stats = {
      totalQueued: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalRetried: 0
    };
  }

  /**
   * Enqueues an agent task with a given priority.
   * 
   * @param {Object} options
   * @param {string} options.name - Human-readable task name (e.g. "ReconciliationPipeline-Case20")
   * @param {number} [options.priority] - PRIORITY level (1 to 4)
   * @param {Function} options.task - Async function to execute `async () => result`
   * @param {string} [options.correlationId] - Distributed tracing correlation ID
   * @param {Object} [options.metadata] - Arbitrary context metadata
   * @returns {Promise<any>} Resolves with task return value or rejects on max retry failure
   */
  addJob({ name, priority = PRIORITY.MEDIUM, task, correlationId = null, metadata = {} }) {
    return new Promise((resolve, reject) => {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const job = {
        id: jobId,
        name,
        priority,
        task,
        correlationId,
        metadata,
        attempts: 0,
        queuedAt: Date.now(),
        resolve,
        reject
      };

      this.queue.push(job);
      this.stats.totalQueued++;

      // Sort queue by priority ascending (1 is highest priority, executed first)
      // If priority matches, sort by FIFO queuedAt
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.queuedAt - b.queuedAt;
      });

      logger.info(`[AgentQueue] Enqueued job: ${name} (ID: ${jobId}, Priority: ${priority})`, {
        correlationId,
        queueDepth: this.queue.length,
        activeWorkers: this.activeJobs.size
      });

      this.emit('job_enqueued', { jobId, name, priority, queueDepth: this.queue.length });
      this._processNext();
    });
  }

  /**
   * Dispatches the next available job if worker concurrency limit allows.
   * @private
   */
  async _processNext() {
    if (this.activeJobs.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobs.set(job.id, {
      name: job.name,
      startedAt: Date.now(),
      priority: job.priority,
      correlationId: job.correlationId
    });

    this.emit('job_started', {
      jobId: job.id,
      name: job.name,
      activeCount: this.activeJobs.size
    });

    job.attempts++;
    const startTime = Date.now();

    try {
      logger.info(`[AgentQueue] Starting execution: ${job.name} (Attempt ${job.attempts}/${this.maxRetries})`, {
        correlationId: job.correlationId,
        jobId: job.id
      });

      const result = await job.task();

      const durationMs = Date.now() - startTime;
      this.activeJobs.delete(job.id);
      this.stats.totalCompleted++;

      logger.info(`[AgentQueue] Job completed successfully: ${job.name} in ${durationMs}ms`, {
        correlationId: job.correlationId,
        durationMs,
        jobId: job.id
      });

      this.emit('job_completed', { jobId: job.id, name: job.name, durationMs });
      job.resolve(result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.warn(`[AgentQueue] Job attempt ${job.attempts} failed: ${job.name} - ${error.message}`, {
        correlationId: job.correlationId,
        jobId: job.id,
        error: error.message
      });

      if (job.attempts < this.maxRetries) {
        this.stats.totalRetried++;
        // Exponential backoff: 300ms, 600ms, 1200ms
        const delayMs = 300 * Math.pow(2, job.attempts - 1);
        
        logger.info(`[AgentQueue] Scheduling retry for ${job.name} in ${delayMs}ms...`, {
          correlationId: job.correlationId,
          jobId: job.id
        });

        setTimeout(() => {
          this.activeJobs.delete(job.id);
          this.queue.push(job);
          this.queue.sort((a, b) => a.priority - b.priority);
          this._processNext();
        }, delayMs);
      } else {
        // Max retries exceeded
        this.activeJobs.delete(job.id);
        this.stats.totalFailed++;

        logger.error(`[AgentQueue] Job permanently failed after ${job.attempts} attempts: ${job.name}`, {
          correlationId: job.correlationId,
          jobId: job.id,
          error: error.message
        });

        this.emit('job_failed', { jobId: job.id, name: job.name, error: error.message });
        job.reject(error);
      }
    } finally {
      // Trigger subsequent job execution
      this._processNext();
    }
  }

  /**
   * Returns live snapshot metrics for dashboard telemetry.
   * 
   * @returns {Object} Queue status metrics
   */
  getStatus() {
    return {
      maxConcurrency: this.maxConcurrency,
      activeJobsCount: this.activeJobs.size,
      queuedJobsCount: this.queue.length,
      activeJobs: Array.from(this.activeJobs.entries()).map(([id, info]) => ({
        id,
        ...info,
        elapsedMs: Date.now() - info.startedAt
      })),
      stats: { ...this.stats }
    };
  }

  getQueueStatus() {
    return this.getStatus();
  }

  /**
   * Clears all waiting jobs (used in test teardown).
   */
  clear() {
    this.queue = [];
    this.activeJobs.clear();
  }
}

// Global Singleton Queue Instance (5 Concurrent Workers)
export const agentQueue = new AgentPriorityQueue(5, 3);
