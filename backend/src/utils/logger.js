import { config } from '../config/env.js';

/**
 * Module: Structured JSON Logger
 * Purpose: Enterprise structured logging utility providing consistent log formatting,
 *          log level management (INFO, WARN, ERROR, DEBUG), timestamping, and automatic
 *          correlation ID tagging for production observability.
 * 
 * Called by:
 * - Express request logger middleware (requestLogger.middleware.js)
 * - Centralized error handler (error.middleware.js)
 * - Business services (reconciliation.service.js, settlement.service.js, etc.)
 * - AI Agents & Multi-Agent Orchestrator
 * 
 * Data flow:
 * Application Event / HTTP Request
 *   ↓
 * logger.info / logger.error(message, meta)
 *   ↓
 * Format JSON Payload { timestamp, level, correlationId, service, message, meta }
 *   ↓
 * stdout / stderr (Process Stream / Cloud Watch / Render Logs)
 */

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

const CURRENT_LEVEL = config.nodeEnv === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

/**
 * Formats a structured log record.
 * 
 * @param {string} level - 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 * @param {string} message - Human-readable explanation of event
 * @param {Object} [meta] - Contextual metadata (correlationId, userId, durationMs, error details)
 * @returns {string} Serialized JSON log line
 */
const formatLog = (level, message, meta = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'financeflow-backend',
    correlationId: meta.correlationId || 'N/A',
    message,
    ...(meta.userId ? { userId: meta.userId } : {}),
    ...(meta.durationMs !== undefined ? { durationMs: meta.durationMs } : {}),
    ...(meta.path ? { path: meta.path } : {}),
    ...(meta.method ? { method: meta.method } : {}),
    ...(meta.statusCode ? { statusCode: meta.statusCode } : {}),
    ...(meta.error ? { 
      error: {
        message: meta.error.message || String(meta.error),
        stack: config.nodeEnv === 'development' ? meta.error.stack : undefined,
        code: meta.error.code || meta.error.statusCode
      }
    } : {}),
    ...meta.extra
  };

  return JSON.stringify(logEntry);
};

export const logger = {
  /**
   * Logs an informational event.
   * @param {string} message - Event description
   * @param {Object} [meta] - Optional context metadata
   */
  info: (message, meta = {}) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(formatLog('INFO', message, meta));
    }
  },

  /**
   * Logs a warning event (e.g. rate limit approached, unexpected validation fallback).
   * @param {string} message - Warning description
   * @param {Object} [meta] - Context metadata
   */
  warn: (message, meta = {}) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, meta));
    }
  },

  /**
   * Logs a critical error or exception.
   * @param {string} message - Error description
   * @param {Error|Object} [error] - Error object
   * @param {Object} [meta] - Context metadata (including correlationId)
   */
  error: (message, error = null, meta = {}) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, { ...meta, error }));
    }
  },

  /**
   * Logs fine-grained debug data during local development.
   * @param {string} message - Debug info
   * @param {Object} [meta] - Detailed debug parameters
   */
  debug: (message, meta = {}) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatLog('DEBUG', message, meta));
    }
  }
};

export default logger;
