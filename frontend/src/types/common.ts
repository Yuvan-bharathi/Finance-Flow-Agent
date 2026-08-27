// ============================================================
// common.ts — Shared generic types across all FinanceFlow modules
// ============================================================

/** Generic API response wrapper matching backend { success, data, message } shape */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  correlationId?: string;
}

/** Generic paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Date range filter used across all pages */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/** Date preset identifier */
export type DatePreset = 'all' | 'today' | '7d' | 'this_month' | '30d' | '2025' | '2026' | 'ytd' | 'this_year' | 'custom';

/** Pagination query parameters */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Cache operation options */
export interface CacheOptions {
  ttl?: number;         // TTL in seconds
  bypassCache?: boolean;
  tags?: string[];
}

/** Client cache entry */
export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  tags: string[];
}

/** Cache diagnostic statistics */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRatio: string;
  activeTags: string[];
}
