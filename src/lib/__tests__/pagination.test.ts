/**
 * Unit tests for pagination utilities
 */
import { describe, it, expect, vi } from "vitest";
import {
  calculatePagination,
  applyPagination,
  formatPaginatedResponse,
  PaginationOptions,
  PaginatedResponse,
} from "../pagination";

describe("calculatePagination", () => {
  it("should calculate pagination metadata correctly", () => {
    const result = calculatePagination(1, 20, 100);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(false);
  });

  it("should handle last page correctly", () => {
    const result = calculatePagination(5, 20, 100);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(true);
  });

  it("should handle single page correctly", () => {
    const result = calculatePagination(1, 20, 15);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
  });

  it("should handle middle page correctly", () => {
    const result = calculatePagination(3, 20, 100);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
  });

  it("should handle zero total correctly", () => {
    const result = calculatePagination(1, 20, 0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
  });

  it("should handle exact page division", () => {
    const result = calculatePagination(2, 25, 50);
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(true);
  });
});

describe("applyPagination", () => {
  it("should apply pagination to query object", () => {
    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };
    
    const options: PaginationOptions = {
      page: 2,
      pageSize: 10,
      sortBy: "name",
      sortOrder: "asc",
    };
    
    const result = applyPagination(mockQuery, options);
    
    expect(mockQuery.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
  });

  it("should apply descending sort order", () => {
    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };
    
    const options: PaginationOptions = {
      page: 1,
      pageSize: 20,
      sortBy: "created_at",
      sortOrder: "desc",
    };
    
    applyPagination(mockQuery, options);
    
    expect(mockQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("should use default options when not provided", () => {
    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };
    
    const result = applyPagination(mockQuery);
    
    expect(mockQuery.order).not.toHaveBeenCalled();
    expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
  });

  it("should calculate correct range for page 1", () => {
    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };
    
    applyPagination(mockQuery, { page: 1, pageSize: 25 });
    
    expect(mockQuery.range).toHaveBeenCalledWith(0, 24);
  });

  it("should calculate correct range for page 3", () => {
    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };
    
    applyPagination(mockQuery, { page: 3, pageSize: 10 });
    
    expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
  });
});

describe("formatPaginatedResponse", () => {
  it("should format paginated response correctly", () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = formatPaginatedResponse(data, 1, 10, 30);
    
    expect(result.data).toEqual(data);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(10);
    expect(result.pagination.total).toBe(30);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrevious).toBe(false);
  });

  it("should handle empty data array", () => {
    const result = formatPaginatedResponse([], 1, 10, 0);
    
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it("should handle last page", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = formatPaginatedResponse(data, 3, 10, 25);
    
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrevious).toBe(true);
  });

  it("should use default page and pageSize when not provided", () => {
    const data = [{ id: 1 }];
    const result = formatPaginatedResponse(data, undefined, undefined, 100);
    
    expect(result.pagination.page).toBe(1); // formatPaginatedResponse should handle undefined
    expect(result.pagination.pageSize).toBe(20);
  });
});

describe("Pagination Integration", () => {
  it("should handle complete pagination workflow", () => {
    const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
    const options: PaginationOptions = {
      page: 2,
      pageSize: 15,
      sortBy: "id",
      sortOrder: "asc",
    };
    
    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };
    
    applyPagination(mockQuery, options);
    
    const paginatedData = mockData.slice(15, 30);
    const result = formatPaginatedResponse(paginatedData, 2, 15, 50);
    
    expect(result.data.length).toBe(15);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.totalPages).toBe(4);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrevious).toBe(true);
  });

  it("should handle edge case with page beyond total pages", () => {
    const data = [{ id: 1 }];
    const result = formatPaginatedResponse(data, 10, 10, 5);
    
    expect(result.pagination.page).toBe(10);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrevious).toBe(true);
  });
});
