import {
  getRunsByAgent,
  getRecentActivity,
  getAgentStats,
  getAllAgentsOverview
} from '../models/agentRun.model.js';
import { getLogsByRunId } from '../models/agentExecutionLog.model.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Agent Control Center Controller
 * Purpose: Provides observability endpoints for agent stat cards, run history, and execution timelines.
 */

/**
 * Retrieves aggregate statistics for all 6 agents (active agents 1-4 + coming soon agents 5-6).
 */
export const getAgentStatus = async (req, res, next) => {
  try {
    const overview = await getAllAgentsOverview();

    // Stats for all 6 active agents
    const agent1Stats = await getAgentStats('agent_1_reconciliation');
    const agent2Stats = await getAgentStats('agent_2_risk');
    const agent3Stats = await getAgentStats('agent_3_collection');
    const agent4Stats = await getAgentStats('agent_4_document');
    const agent5Stats = await getAgentStats('agent_5_portfolio');
    const agent6Stats = await getAgentStats('agent_6_notification');

    const agents = [
      {
        id: 'agent_1_reconciliation',
        name: 'Payment Reconciliation Agent',
        status: 'READY',
        is_active: true,
        metrics: agent1Stats
      },
      {
        id: 'agent_2_risk',
        name: 'Repayment Risk Assessment Agent',
        status: 'READY',
        is_active: true,
        metrics: agent2Stats
      },
      {
        id: 'agent_3_collection',
        name: 'Automated Collection Follow-Up Agent',
        status: 'READY',
        is_active: true,
        metrics: agent3Stats
      },
      {
        id: 'agent_4_document',
        name: 'Document Intelligence Agent',
        status: 'READY',
        is_active: true,
        metrics: agent4Stats
      },
      {
        id: 'agent_5_portfolio',
        name: 'Portfolio Analytics Agent',
        status: 'READY',
        is_active: true,
        metrics: agent5Stats
      },
      {
        id: 'agent_6_notification',
        name: 'Notification & Escalation Agent',
        status: 'READY',
        is_active: true,
        metrics: agent6Stats
      }
    ];

    return sendSuccessResponse(res, 200, 'Agent status retrieved successfully', {
      overview,
      agents
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves run history for a given agent.
 */
export const getAgentRunHistory = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const runs = await getRunsByAgent(agentId, limit);
    return sendSuccessResponse(res, 200, `Run history retrieved for ${agentId}`, runs);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves full details and execution step logs for a specific agent run.
 */
export const getRunDetail = async (req, res, next) => {
  try {
    const runId = parseInt(req.params.runId, 10);
    const logs = await getLogsByRunId(runId);
    return sendSuccessResponse(res, 200, 'Run execution logs retrieved', logs);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves recent agent activity feed across all agents.
 */
export const getRecentAgentActivity = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const activity = await getRecentActivity(limit);
    return sendSuccessResponse(res, 200, 'Recent agent activity retrieved', activity);
  } catch (error) {
    return next(error);
  }
};
