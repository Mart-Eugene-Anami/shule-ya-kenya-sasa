/**
 * Test Helpers and Utilities
 * 
 * Provides common testing utilities for mocking, data generation, and test setup
 */
import { vi } from "vitest";

/**
 * Mock Supabase query chain builder
 */
export function createMockQueryChain(returnData: any = null, returnError: any = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockResolvedValue({ error: returnError }),
  };
}

/**
 * Generate mock student data
 */
export function createMockStudent(overrides: Partial<any> = {}) {
  return {
    id: `student-${Math.random().toString(36).substr(2, 9)}`,
    admission_no: `ADM${Math.floor(Math.random() * 10000)}`,
    name: "Test Student",
    email: "test@student.com",
    grade_id: "grade-1",
    stream_id: "stream-1",
    school_id: "school-1",
    status: "active",
    enrollment_date: "2024-01-01",
    gender: "male",
    guardian_name: "Test Guardian",
    guardian_phone: "+254700000000",
    pathway: null,
    track_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Generate mock teacher data
 */
export function createMockTeacher(overrides: Partial<any> = {}) {
  return {
    id: `teacher-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Teacher",
    email: "test@teacher.com",
    subject: "Mathematics",
    school_id: "school-1",
    user_id: `user-${Math.random().toString(36).substr(2, 9)}`,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Generate mock grade data
 */
export function createMockGrade(overrides: Partial<any> = {}) {
  return {
    id: `grade-${Math.random().toString(36).substr(2, 9)}`,
    name: "Grade 1",
    level: 1,
    curriculum: "cbc",
    school_id: "school-1",
    division_id: "division-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Generate mock stream data
 */
export function createMockStream(overrides: Partial<any> = {}) {
  return {
    id: `stream-${Math.random().toString(36).substr(2, 9)}`,
    name: "Stream A",
    grade_id: "grade-1",
    academic_year_id: "year-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Clear all localStorage data
 */
export function clearLocalStorage() {
  localStorage.clear();
}

/**
 * Mock localStorage with specific data
 */
export function mockLocalStorage(data: Record<string, string>) {
  clearLocalStorage();
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

/**
 * Wait for a specified time (for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock Supabase error
 */
export function createSupabaseError(message: string, code: string, status: number = 500) {
  return {
    message,
    code,
    status,
    hint: null,
    details: null,
  };
}
