import {
  findAllCompanies,
  findCompanyById,
  insertCompany,
  updateCompanyById,
  deleteCompanyById
} from '../models/company.model.js';
import pool from '../config/db.js';
import { cacheService } from './cache.service.js';
import { emitSocketEvent } from '../config/socket.js';

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
 * @param {number} [userId] - Current authenticated user ID.
 * @returns {Promise<Object>} Created company record.
 * @throws {Error} 400 if validation fails.
 */
export const createCompanyService = async (companyData, userId = null) => {
  if (!companyData.company_name) {
    const error = new Error('company_name is required.');
    error.statusCode = 400;
    throw error;
  }

  const insertId = await insertCompany(companyData);
  const createdCompany = await findCompanyById(insertId);

  // Invalidate cache
  try {
    await cacheService.invalidateByTag('reports');
    await cacheService.invalidateByTag('payments');
  } catch (cErr) {
    console.warn('[Company Service] Cache invalidation notice:', cErr.message);
  }

  // Real-time broadcast
  emitSocketEvent('COMPANY_CREATED', { company: createdCompany });

  return createdCompany;
};

/**
 * Updates an existing company's details.
 * 
 * Called by:
 * - company.controller.js -> updateCompany
 * 
 * @param {number} companyId - Target company ID.
 * @param {Object} companyData - Fields to update.
 * @param {number} [userId] - Current authenticated user ID.
 * @returns {Promise<Object>} Updated company object.
 */
export const updateCompanyService = async (companyId, companyData, userId = null) => {
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
  const updatedCompany = await findCompanyById(companyId);

  // Audit logging
  try {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES (?, 'UPDATE_COMPANY', 'company', ?, ?, '127.0.0.1');
    `, [userId || null, companyId, JSON.stringify(updatedData)]);
  } catch (aErr) {
    console.warn('[Company Service] Audit log notice:', aErr.message);
  }

  // Invalidate cache
  try {
    await cacheService.invalidateByTag('reports');
    await cacheService.invalidateByTag('payments');
  } catch (cErr) {
    console.warn('[Company Service] Cache invalidation notice:', cErr.message);
  }

  // Real-time broadcast
  emitSocketEvent('COMPANY_UPDATED', { company: updatedCompany });

  return updatedCompany;
};

/**
 * Deactivates or deletes a company based on financial integrity constraints.
 * 
 * Called by:
 * - company.controller.js -> deleteCompany
 * 
 * @param {number} companyId - Target company ID.
 * @param {number} [userId] - Current authenticated user ID.
 * @returns {Promise<Object>} Deletion or deactivation outcome.
 */
export const deleteCompanyService = async (companyId, userId = null) => {
  const existingCompany = await findCompanyById(companyId);
  if (!existingCompany) {
    const error = new Error(`Company with ID ${companyId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Check for active or historical loan facilities
  const [loans] = await pool.query(`SELECT id, loan_number, status FROM loans WHERE company_id = ?`, [companyId]);

  if (loans.length > 0) {
    // Financial Safety Guard: Perform safe deactivation/archival
    await updateCompanyById(companyId, {
      company_name: existingCompany.company_name,
      registration_number: existingCompany.registration_number,
      tax_identifier: existingCompany.tax_identifier,
      bank_account_number: existingCompany.bank_account_number,
      contact_name: existingCompany.contact_name,
      contact_email: existingCompany.contact_email,
      contact_phone: existingCompany.contact_phone,
      address: existingCompany.address,
      status: 'inactive'
    });

    try {
      await pool.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
        VALUES (?, 'DEACTIVATE_COMPANY', 'company', ?, ?, '127.0.0.1');
      `, [userId || null, companyId, JSON.stringify({ reason: `Company has ${loans.length} associated loan contract(s). Safe deactivation applied.` })]);
    } catch (aErr) {
      console.warn('[Company Service] Audit log notice:', aErr.message);
    }

    try {
      await cacheService.invalidateByTag('reports');
      await cacheService.invalidateByTag('payments');
    } catch (cErr) {
      console.warn('[Company Service] Cache invalidation notice:', cErr.message);
    }

    emitSocketEvent('COMPANY_DEACTIVATED', { companyId });

    return {
      action: 'deactivated',
      status: 'inactive',
      message: `Company '${existingCompany.company_name}' has ${loans.length} associated loan contract(s). Profile has been safely deactivated/archived to preserve ledger integrity.`,
      companyId
    };
  }

  // If 0 loans, perform full hard delete
  await deleteCompanyById(companyId);

  try {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES (?, 'DELETE_COMPANY', 'company', ?, ?, '127.0.0.1');
    `, [userId || null, companyId, JSON.stringify({ deleted_company: existingCompany.company_name })]);
  } catch (aErr) {
    console.warn('[Company Service] Audit log notice:', aErr.message);
  }

  try {
    await cacheService.invalidateByTag('reports');
    await cacheService.invalidateByTag('payments');
  } catch (cErr) {
    console.warn('[Company Service] Cache invalidation notice:', cErr.message);
  }

  emitSocketEvent('COMPANY_DELETED', { companyId });

  return {
    action: 'deleted',
    message: `Company '${existingCompany.company_name}' was successfully deleted.`,
    companyId
  };
};
