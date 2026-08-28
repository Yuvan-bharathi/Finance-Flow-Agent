/**
 * Module: Standardized Pagination & Query Helper
 * Purpose: Provides a uniform utility for parsing cursor/offset pagination query parameters,
 *          sanitizing sorting options against SQL injection, calculating limits/offsets,
 *          and building enterprise pagination response envelopes.
 * 
 * Called by:
 * - Controllers and Repositories (payment.controller.js, reconciliation.controller.js, audit.controller.js, etc.)
 * 
 * Data flow:
 * HTTP Query Parameters (?page=2&limit=25&sortBy=amount&order=desc)
 *   ↓
 * parsePagination(req.query, allowedColumns)
 *   ↓
 * SQL Query with `LIMIT ? OFFSET ?` & `SELECT COUNT(*) ...`
 *   ↓
 * buildPaginatedResponse(records, totalCount, paginationOptions)
 *   ↓
 * Client Response Envelope { success: true, data: [...], pagination: { page, limit, totalRecords, totalPages, hasNext, hasPrev } }
 */

/**
 * Parses and sanitizes incoming pagination and sorting query parameters.
 * 
 * @param {Object} query - Express `req.query` object.
 * @param {Array<string>} [allowedSortColumns] - Whitelisted column names to prevent SQL injection.
 * @param {string} [defaultSort] - Default sort column if none provided or matched.
 * @returns {Object} `{ page, limit, offset, sortBy, order }`
 */
export const parsePagination = (
  query = {},
  allowedSortColumns = ['id', 'created_at', 'updated_at', 'status', 'amount', 'due_date'],
  defaultSort = 'created_at'
) => {
  // 1. Page number (minimum 1)
  const page = Math.max(1, parseInt(query.page, 10) || 1);

  // 2. Limit per page (minimum 1, default 20, maximum capped at 100 to prevent Denial of Service)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  // 3. Offset calculation
  const offset = (page - 1) * limit;

  // 4. Sort direction (strict ASC / DESC)
  const rawOrder = String(query.order || query.direction || 'DESC').trim().toUpperCase();
  const order = rawOrder === 'ASC' ? 'ASC' : 'DESC';

  // 5. Sort column whitelist validation
  const rawSort = String(query.sortBy || query.sort || '').trim();
  const sortBy = allowedSortColumns.includes(rawSort) ? rawSort : defaultSort;

  return {
    page,
    limit,
    offset,
    sortBy,
    order
  };
};

/**
 * Constructs a standardized paginated response envelope.
 * 
 * @param {Array} data - Array of result records from database.
 * @param {number} totalRecords - Total count of matching records across all pages.
 * @param {Object} paginationOptions - `{ page, limit }`
 * @returns {Object} Standardized envelope `{ data, pagination: { ... } }`
 */
export const buildPaginatedResponse = (data = [], totalRecords = 0, { page = 1, limit = 20 } = {}) => {
  const total = parseInt(totalRecords, 10) || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    pagination: {
      page,
      limit,
      totalRecords: total,
      totalPages,
      hasNext,
      hasPrev
    }
  };
};

export default {
  parsePagination,
  buildPaginatedResponse
};
