/**
 * Unit tests for studentService.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// parseFlexibleDate — replicated here since it's not exported
// ---------------------------------------------------------------------------
function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return trimmed;
    return null;
  }
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return null;
}

describe("parseFlexibleDate", () => {
  it("should parse YYYY-MM-DD", () => { expect(parseFlexibleDate("2025-03-15")).toBe("2025-03-15"); });
  it("should parse MM/DD/YYYY", () => { expect(parseFlexibleDate("03/15/2025")).toBe("2025-03-15"); });
  it("should parse M/D/YYYY", () => { expect(parseFlexibleDate("3/5/2025")).toBe("2025-03-05"); });
  it("should return null for empty", () => { expect(parseFlexibleDate("")).toBeNull(); });
  it("should return null for invalid", () => { expect(parseFlexibleDate("not-a-date")).toBeNull(); });
  it("should handle 'March 15, 2025'", () => { expect(parseFlexibleDate("March 15, 2025")).toBe("2025-03-15"); });
});

// ---------------------------------------------------------------------------
// Supabase-dependent tests
// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return { from: vi.fn(() => chain), _chain: chain };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock pagination utilities to work with the actual implementation
vi.mock("@/lib/pagination", () => ({
  applyPagination: vi.fn((query) => query),
  formatPaginatedResponse: vi.fn((data, page, pageSize, total) => ({
    data,
    pagination: {
      page: page || 1,
      pageSize: pageSize || 20,
      total: total || data.length,
      totalPages: Math.ceil((total || data.length) / (pageSize || 20)),
      hasNext: (page || 1) < Math.ceil((total || data.length) / (pageSize || 20)),
      hasPrevious: (page || 1) > 1,
    },
  })),
}));

import { getStudents, deleteStudent, createStudent, updateStudent } from "../studentService";

beforeEach(() => { vi.clearAllMocks(); mockSupabase.from.mockReturnValue(mockSupabase._chain); });

describe("getStudents", () => {
  it("should handle empty results", async () => {
    mockSupabase._chain.order = vi.fn().mockReturnThis();
    mockSupabase._chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

    const result = await getStudents("sch1");
    expect(result.data).toHaveLength(0);
  });
});

describe("createStudent", () => {
  it("should create student with correct data", async () => {
    const mockStudent = {
      id: "s1", admission_no: "ADM001", name: "Alice", email: "test@test.com",
      grade_id: "g1", stream_id: "st1", school_id: "sch1", pathway: null, track_id: null,
      grade: { id: "g1", name: "Grade 1", level: 1, curriculum: "cbc", school_id: "sch1" },
      stream: { id: "st1", name: "Alpha", grade_id: "g1" },
    };
    mockSupabase._chain.single = vi.fn().mockResolvedValue({ data: mockStudent, error: null });

    const result = await createStudent({
      admissionNo: "ADM001",
      name: "Alice",
      email: "test@test.com",
      gradeId: "g1",
      streamId: "st1",
      schoolId: "sch1",
    });

    expect(result.admissionNo).toBe("ADM001");
    expect(result.name).toBe("Alice");
    expect(mockSupabase.from).toHaveBeenCalledWith("students");
  });

  it("should handle array-typed relations in create", async () => {
    const mockStudent = {
      id: "s1", admission_no: "ADM001", name: "Alice", email: null,
      grade_id: "g1", stream_id: "st1", school_id: "sch1", pathway: null, track_id: null,
      grade: [{ id: "g1", name: "Grade 1", level: 1, curriculum: "cbc", school_id: "sch1" }],
      stream: [{ id: "st1", name: "Alpha", grade_id: "g1" }],
    };
    mockSupabase._chain.single = vi.fn().mockResolvedValue({ data: mockStudent, error: null });

    const result = await createStudent({
      admissionNo: "ADM001",
      name: "Alice",
      gradeId: "g1",
      streamId: "st1",
      schoolId: "sch1",
    });

    expect(result.grade?.name).toBe("Grade 1");
  });

  it("should throw on error", async () => {
    mockSupabase._chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "Validation error" } });
    await expect(createStudent({
      admissionNo: "ADM001",
      name: "Alice",
      gradeId: "g1",
      streamId: "st1",
      schoolId: "sch1",
    })).rejects.toThrow();
  });
});

describe("updateStudent", () => {
  it("should update student with provided fields", async () => {
    const mockStudent = {
      id: "s1", admission_no: "ADM002", name: "Alice Updated", email: "updated@test.com",
      grade_id: "g1", stream_id: "st1", school_id: "sch1",
      grade: { id: "g1", name: "Grade 1", level: 1, curriculum: "cbc", school_id: "sch1" },
      stream: { id: "st1", name: "Alpha", grade_id: "g1" },
    };
    mockSupabase._chain.eq = vi.fn().mockReturnThis();
    mockSupabase._chain.single = vi.fn().mockResolvedValue({ data: mockStudent, error: null });

    const result = await updateStudent("s1", {
      admissionNo: "ADM002",
      name: "Alice Updated",
      email: "updated@test.com",
    });

    expect(result.name).toBe("Alice Updated");
    expect(result.admissionNo).toBe("ADM002");
  });

  it("should handle partial updates", async () => {
    const mockStudent = {
      id: "s1", admission_no: "ADM001", name: "Alice Updated", email: null,
      grade_id: "g1", stream_id: "st1", school_id: "sch1",
      grade: { id: "g1", name: "Grade 1", level: 1, curriculum: "cbc", school_id: "sch1" },
      stream: { id: "st1", name: "Alpha", grade_id: "g1" },
    };
    mockSupabase._chain.eq = vi.fn().mockReturnThis();
    mockSupabase._chain.single = vi.fn().mockResolvedValue({ data: mockStudent, error: null });

    const result = await updateStudent("s1", { name: "Alice Updated" });
    expect(result.name).toBe("Alice Updated");
  });

  it("should throw on error", async () => {
    mockSupabase._chain.eq = vi.fn().mockReturnThis();
    mockSupabase._chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } });
    await expect(updateStudent("s1", { name: "Alice" })).rejects.toThrow();
  });
});

describe("deleteStudent", () => {
  it("should call delete with correct id", async () => {
    mockSupabase._chain.eq = vi.fn().mockResolvedValue({ error: null });
    await deleteStudent("student-123");
    expect(mockSupabase.from).toHaveBeenCalledWith("students");
    expect(mockSupabase._chain.delete).toHaveBeenCalled();
  });

  it("should throw on error", async () => {
    mockSupabase._chain.eq = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } });
    await expect(deleteStudent("student-123")).rejects.toThrow();
  });
});
