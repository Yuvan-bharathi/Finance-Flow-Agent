import { config } from './env.js';

/**
 * Module: Agent System Configuration
 * Purpose: Centralized agent configuration parameters for pre-check thresholds,
 * bulk execution limits, and concurrency limits.
 */
export const AGENT_CONFIG = {
  precheck: {
    threshold: config.agents.precheckThreshold,
    scoring: {
      bankAccount: 40,
      amount: 30,
      reference: 20
    }
  },
  bulk: {
    maxSelectedCases: config.agents.maxSelectedCases,
    maxAllPendingCases: config.agents.maxBulkCases,
    maxConcurrentRuns: config.agents.maxConcurrentRuns
  }
};
