import {
  findAllCompanies,
  findCompanyById,
  insertCompany,
  updateCompanyById
} from '../models/company.model.js';

/**
 * Service: Company Service
 * Purpose: Business logic for managing borrowing company master data.
 * 
 * Called by:
 * - company.controller.js
 */

/**
 * Retrieves list of all companies.
 * 
 * Called by:
 * - company.controller.js -> getCompanies
 * 
 * @param {string|null} status - Optional status filter.
 * @returns {Promise<Array>} List of companies.
 */
export const getCompaniesService = async (status = null) => {
  return await findAllCompanies(status);
};

/**
 * Retrieves company details by ID.
 * 
 * Called by:
 * - company.controller.js -> getCompanyById
 * 
 * @param {number} companyId - Company ID.
 * @returns {Promise<Object>} Company details.
 * @throws {Error} 404 if company not found.
 */
export const getCompanyByIdService = async (companyId) => {
  const company = await findCompanyById(companyId);
  if (!company) {
    const error = new Error(`Company with ID ${companyId} not found.`);
    error.statusCode = 404;
    throw error;
  }
  return company;
};

/**
 * Creates a new borrowing company.
 * 
 * Called by:
 * - company.controller.js -> createCompany
 * 
 * @param {Object} companyData - Input body data.
 * @returns {Promise<Object>} Created company record.
 * @throws {Error} 400 if validation fails.
 */
export const createCompanyService = async (companyData) => {
  if (!companyData.company_name) {
    const error = new Error('company_name is required.');
    error.statusCode = 400;
    throw error;
  }

  const insertId = await insertCompany(companyData);
  return await findCompanyById(insertId);
};

/**
 * Updates an existing company's details.
 * 
 * Called by:
 * - company.controller.js -> updateCompany
 * 
 * @param {number} companyId - Target company ID.
 * @param {Object} companyData - Fields to update.
 * @returns {Promise<Object>} Updated company object.
 */
export const updateCompanyService = async (companyId, companyData) => {
  const existingCompany = await findCompanyById(companyId);
  if (!existingCompany) {
    const error = new Error(`Company with ID ${companyId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updatedData = {
    company_name: companyData.company_name || existingCompany.company_name,
    registration_number: companyData.registration_number !== undefined ? companyData.registration_number : existingCompany.registration_number,
    tax_identifier: companyData.tax_identifier !== undefined ? companyData.tax_identifier : existingCompany.tax_identifier,
    bank_account_number: companyData.bank_account_number !== undefined ? companyData.bank_account_number : existingCompany.bank_account_number,
    contact_name: companyData.contact_name !== undefined ? companyData.contact_name : existingCompany.contact_name,
    contact_email: companyData.contact_email !== undefined ? companyData.contact_email : existingCompany.contact_email,
    contact_phone: companyData.contact_phone !== undefined ? companyData.contact_phone : existingCompany.contact_phone,
    address: companyData.address !== undefined ? companyData.address : existingCompany.address,
    status: companyData.status || existingCompany.status
  };

  await updateCompanyById(companyId, updatedData);
  return await findCompanyById(companyId);
};
