/**
 * Pagination Utilities
 * 
 * Provides pagination helpers for large dataset queries
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrevious,
  };
}

/**
 * Apply pagination to a Supabase query
 */
export function applyPagination<T>(
  query: any,
  options: PaginationOptions = {}
): any {
  const { page = 1, pageSize = 20, sortBy, sortOrder = 'asc' } = options;

  // Apply sorting if specified
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  return query;
}

/**
 * Format paginated response
 */
export function formatPaginatedResponse<T>(
  data: T[],
  page: number = 1,
  pageSize: number = 20,
  total: number = 0
): PaginatedResponse<T> {
  return {
    data,
    pagination: calculatePagination(page, pageSize, total),
  };
}
