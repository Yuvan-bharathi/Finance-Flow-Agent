import { runAssistantAgent } from '../agents/assistantAgent.js';
import {
  confirmActionProposal,
  dismissActionProposal
} from '../services/assistantAction.service.js';
import { findActiveProposalsByUserId, findProposalById } from '../models/assistantAction.model.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/apiResponse.js';

/**
 * Controller: FinanceFlow AI Operational Assistant & Copilot (Phase 7)
 *
 * Handles:
 * 1. `POST /api/v1/assistant/chat` - Conversational tool-calling endpoint.
 * 2. `GET /api/v1/assistant/proposals` - Retrieves user's pending action proposals.
 * 3. `POST /api/v1/assistant/proposals/:id/confirm` - Human confirmation & ACID execution.
 * 4. `POST /api/v1/assistant/proposals/:id/dismiss` - Rejection of proposal without mutation.
 * 5. `GET /api/v1/assistant/wake/:recordType/:recordId` - Context pre-loader.
 */

/**
 * chat — Main AI Copilot Conversation Endpoint
 */
export const chat = async (req, res, next) => {
  try {
    const { message, conversationHistory = [], contextPayload = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return sendErrorResponse(res, 400, 'A non-empty message is required.');
    }

    const user = {
      id: req.user.id,
      name: req.user.name || req.user.email,
      email: req.user.email,
      role: req.user.role || req.user.role_name || 'accountant',
      role_name: req.user.role_name || req.user.role || 'accountant'
    };

    const result = await runAssistantAgent({
      message: message.trim(),
      conversationHistory: conversationHistory.slice(-10),
      contextPayload,
      user
    });

    // Check if any proposals were generated during this run and attach active list
    const activeProposals = await findActiveProposalsByUserId(req.user.id);

    return sendSuccessResponse(res, 200, 'AI Copilot response generated successfully', {
      ...result,
      activeProposals
    });

  } catch (err) {
    return next(err);
  }
};

/**
 * getActiveProposals — List active pending proposals for the authenticated user
 */
export const getActiveProposals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const proposals = await findActiveProposalsByUserId(userId);
    return sendSuccessResponse(res, 200, 'Active proposals retrieved successfully', proposals);
  } catch (err) {
    return next(err);
  }
};

/**
 * confirmProposal — Human Confirmation & ACID State Mutation Gate
 */
export const confirmProposal = async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id, 10);
    const correlationId = req.correlationId || req.headers['x-correlation-id'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await confirmActionProposal(proposalId, req.user, {
      correlationId,
      ipAddress
    });

    return sendSuccessResponse(res, 200, 'Action proposal confirmed and executed successfully', result);
  } catch (err) {
    return next(err);
  }
};

/**
 * dismissProposal — Dismiss proposal without mutating database
 */
export const dismissProposal = async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id, 10);
    const result = await dismissActionProposal(proposalId, req.user);
    return sendSuccessResponse(res, 200, 'Action proposal dismissed', result);
  } catch (err) {
    return next(err);
  }
};

/**
 * wakeContext — Pre-load context for Quick Ask button
 */
export const wakeContext = async (req, res, next) => {
  try {
    const { recordType, recordId } = req.params;
    const parsedId = parseInt(recordId, 10);

    if (!recordType || !parsedId) {
      return sendErrorResponse(res, 400, 'recordType and recordId are required.');
    }

    const { executeAssistantTool } = await import('../tools/assistantTools.js');

    let toolName = null;
    let toolArgs = {};

    switch (recordType) {
      case 'payment':
        toolName = 'getPaymentDetails';
        toolArgs = { paymentId: parsedId };
        break;
      case 'reconciliation_case':
        toolName = 'getReconciliationCase';
        toolArgs = { caseId: parsedId };
        break;
      case 'company':
        toolName = 'getCompanyProfile';
        toolArgs = { companyId: parsedId };
        break;
      case 'loan':
        toolName = 'getLoanDetails';
        toolArgs = { loanId: parsedId };
        break;
      case 'document':
        toolName = 'getDocumentSummary';
        toolArgs = { documentId: parsedId };
        break;
      default:
        return sendErrorResponse(res, 400, `Unknown recordType: ${recordType}`);
    }

    const { meta } = await executeAssistantTool(toolName, toolArgs, req.user);

    return sendSuccessResponse(res, 200, 'Context loaded successfully', {
      recordType,
      recordId: parsedId,
      title: meta.title,
      snippet: meta.snippet
    });

  } catch (err) {
    return next(err);
  }
};
