/**
 * Unit tests for examService.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

import { examService } from "../examService";

function createChainMock(resolvedData: any = { data: null, error: null }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedData),
  };
  chain.then = (resolve: any) => resolve(resolvedData);
  return chain;
}

beforeEach(() => { vi.clearAllMocks(); });

describe("examService.createExam", () => {
  it("should transform camelCase to snake_case for DB and back", async () => {
    const dbRow = {
      id: "exam-1", name: "Midterm", description: "Midterm exam",
      grades: ["g1"], subjects: ["Math"], start_date: "2026-03-01",
      end_date: "2026-03-05", school_id: "school-1", created_by: "user-1",
      created_at: "2026-03-01T00:00:00Z", term_id: "term-1", is_active: true,
    };
    const chain = createChainMock({ data: dbRow, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await examService.createExam({
      name: "Midterm", description: "Midterm exam", grades: ["g1"],
      subjects: ["Math"], startDate: "2026-03-01", endDate: "2026-03-05",
      schoolId: "school-1", createdBy: "user-1", termId: "term-1", isActive: true,
    });

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ start_date: "2026-03-01" }));
    expect(result.startDate).toBe("2026-03-01");
    expect(result.schoolId).toBe("school-1");
  });

  it("should throw when DB returns an error", async () => {
    const chain = createChainMock({ data: null, error: { message: "Duplicate" } });
    mockSupabase.from.mockReturnValue(chain);

    await expect(examService.createExam({
      name: "Test", description: null, grades: [], subjects: [],
      startDate: "2026-01-01", endDate: "2026-01-02", schoolId: "s1",
      createdBy: "u1", termId: null, isActive: true,
    })).rejects.toBeTruthy();
  });
});

describe("examService.getExamsBySchool", () => {
  it("should transform DB rows to Exam[]", async () => {
    const dbRows = [{
      id: "e1", name: "Final", description: null, grades: ["g1"],
      subjects: ["Math"], start_date: "2026-06-01", end_date: "2026-06-10",
      school_id: "s1", created_by: "u1", created_at: "2026-01-01T00:00:00Z",
      term_id: "t1", is_active: true,
    }];
    const chain = createChainMock({ data: dbRows, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const exams = await examService.getExamsBySchool("s1");
    expect(exams).toHaveLength(1);
    expect(exams[0].startDate).toBe("2026-06-01");
  });
});

describe("examService.deleteExam", () => {
  it("should call delete with correct id", async () => {
    const chain = createChainMock({ error: null });
    mockSupabase.from.mockReturnValue(chain);
    await examService.deleteExam("exam-123");
    expect(mockSupabase.from).toHaveBeenCalledWith("exams");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "exam-123");
  });
});
