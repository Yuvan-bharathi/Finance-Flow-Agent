import { confirmActionProposal, dismissActionProposal } from '../services/assistantAction.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Assistant Action Execution Controller (Phase 3)
 */

export const confirmAction = async (req, res, next) => {
  try {
    const { proposalId } = req.body;
    const user = req.user || { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' };
    const result = await confirmActionProposal(proposalId, user);
    return sendSuccessResponse(res, 200, 'Action proposal executed successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const dismissAction = async (req, res, next) => {
  try {
    const { proposalId } = req.body;
    const user = req.user || { id: 3, name: 'Senior Accountant', email: 'accountant@financeflow.com', role: 'accountant' };
    const result = await dismissActionProposal(proposalId, user);
    return sendSuccessResponse(res, 200, 'Action proposal dismissed', result);
  } catch (error) {
    return next(error);
  }
};
