import { assessCompanyRiskService, getAllCompaniesRiskOverviewService } from '../services/risk.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Risk Controller
 * Handlers for Agent 2 Repayment Risk Assessment endpoints.
 * 
 * Called by:
 * - risk.routes.js
 */

export const assessCompanyRisk = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const result = await assessCompanyRiskService(companyId);
    return sendSuccessResponse(res, 200, 'Company risk assessment completed', result);
  } catch (error) {
    return next(error);
  }
};

export const getRiskOverview = async (req, res, next) => {
  try {
    const results = await getAllCompaniesRiskOverviewService();
    return sendSuccessResponse(res, 200, 'Borrower risk overview retrieved successfully', results);
  } catch (error) {
    return next(error);
  }
};
