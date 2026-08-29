/**
 * Unit tests for academicService.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

import { getGrades, deleteGrade } from "../academicService";

function createChainMock(resolvedData: any = { data: null, error: null }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedData),
    maybeSingle: vi.fn().mockResolvedValue(resolvedData),
  };
  chain.then = (resolve: any) => resolve(resolvedData);
  return chain;
}

beforeEach(() => { vi.clearAllMocks(); });

describe("getGrades", () => {
  it("should transform DB rows to Grade[]", async () => {
    const dbRows = [{ id: "g1", name: "Grade 1", level: 1, curriculum: "cbc", school_id: "s1", academic_year_id: "ay1", created_at: "", updated_at: "" }];
    const chain = createChainMock({ data: dbRows, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const grades = await getGrades("s1");
    expect(grades).toHaveLength(1);
    expect(grades[0].schoolId).toBe("s1");
    expect(grades[0].level).toBe(1);
  });

  it("should throw on DB error", async () => {
    const chain = createChainMock({ data: null, error: { message: "err" } });
    chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: "err" } });
    mockSupabase.from.mockReturnValue(chain);
    await expect(getGrades("s1")).rejects.toBeTruthy();
  });
});

describe("deleteGrade", () => {
  it("should call delete with correct ID", async () => {
    const chain = createChainMock({ error: null });
    chain.eq = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue(chain);
    await deleteGrade("grade-1");
    expect(mockSupabase.from).toHaveBeenCalledWith("grades");
    expect(chain.delete).toHaveBeenCalled();
  });
});
