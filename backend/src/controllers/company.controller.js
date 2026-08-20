import {
  getCompaniesService,
  getCompanyByIdService,
  createCompanyService,
  updateCompanyService
} from '../services/company.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Company Controller
 * Purpose: Express HTTP request handlers for Company master data CRUD endpoints.
 * 
 * Called by:
 * - company.routes.js
 */

/**
 * Controller: getCompanies
 * Endpoint: GET /api/companies
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object. `req.query.status` optionally filters status.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error propagation.
 */
export const getCompanies = async (req, res, next) => {
  try {
    const { status } = req.query;
    const companies = await getCompaniesService(status);
    return sendSuccessResponse(res, 200, 'Companies retrieved successfully', companies);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getCompanyById
 * Endpoint: GET /api/companies/:id
 * Access: Authenticated (all roles)
 * 
 * @param {Object} req - Express request object. `req.params.id` contains company ID.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error propagation.
 */
export const getCompanyById = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const company = await getCompanyByIdService(companyId);
    return sendSuccessResponse(res, 200, 'Company details retrieved successfully', company);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: createCompany
 * Endpoint: POST /api/companies
 * Access: Admin, Manager, Accountant
 * 
 * @param {Object} req - Express request object. `req.body` contains company fields.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error propagation.
 */
export const createCompany = async (req, res, next) => {
  try {
    const company = await createCompanyService(req.body);
    return sendSuccessResponse(res, 201, 'Company created successfully', company);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: updateCompany
 * Endpoint: PUT /api/companies/:id
 * Access: Admin, Manager, Accountant
 * 
 * @param {Object} req - Express request object. `req.params.id` contains company ID. `req.body` contains updated fields.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error propagation.
 */
export const updateCompany = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const company = await updateCompanyService(companyId, req.body);
    return sendSuccessResponse(res, 200, 'Company updated successfully', company);
  } catch (error) {
    return next(error);
  }
};
