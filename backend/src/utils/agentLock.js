/**
 * Module: Global Agent Run Lock & Execution Deduplication Engine
 * Purpose: Enforces single-execution locking per entity across all 4 FinanceFlow AI operational agents,
 * preventing duplicate concurrent LLM API calls and duplicate database audit log entries.
 */

const activeAgentLocks = new Set();

/**
 * Attempts to acquire an execution lock for an agent and target entity ID.
 * 
 * @param {string} agentId - e.g. 'agent_1', 'agent_2', 'agent_3', 'agent_4'
 * @param {number|string} entityId - e.g. caseId, companyId, or documentId
 * @returns {boolean} True if lock acquired, False if already running.
 */
export const acquireAgentLock = (agentId, entityId) => {
  const lockKey = `${agentId}_${entityId}`;
  if (activeAgentLocks.has(lockKey)) {
    console.warn(`🔒 [Run Lock Blocked] Duplicate request detected for ${lockKey}`);
    return false;
  }
  activeAgentLocks.add(lockKey);
  console.log(`🔒 [Run Lock Acquired] Execution lock set for ${lockKey}`);
  return true;
};

/**
 * Releases the execution lock when agent run finishes or fails.
 * 
 * @param {string} agentId
 * @param {number|string} entityId
 */
export const releaseAgentLock = (agentId, entityId) => {
  const lockKey = `${agentId}_${entityId}`;
  activeAgentLocks.delete(lockKey);
  console.log(`🔓 [Run Lock Released] Execution lock cleared for ${lockKey}`);
};

/**
 * Checks if an entity is currently locked by a running agent.
 * 
 * @param {string} agentId
 * @param {number|string} entityId
 * @returns {boolean}
 */
export const isAgentLocked = (agentId, entityId) => {
  const lockKey = `${agentId}_${entityId}`;
  return activeAgentLocks.has(lockKey);
};
