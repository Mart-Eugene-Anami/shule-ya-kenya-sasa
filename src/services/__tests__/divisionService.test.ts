/**
 * Unit tests for divisionService.
 *
 * Tests the pure utility functions (getDefaultDivisionsForCurricula,
 * getDivisionDisplayName) without needing a Supabase mock.
 */
import { describe, it, expect } from "vitest";
import {
  getDefaultDivisionsForCurricula,
  getDivisionDisplayName,
  cbcDivisionConfigs,
  cbcSeniorDivisionConfig,
  system844DivisionConfig,
  type SchoolDivision,
} from "../divisionService";

// ---------------------------------------------------------------------------
// getDefaultDivisionsForCurricula — pure function
// ---------------------------------------------------------------------------
describe("getDefaultDivisionsForCurricula", () => {
  it("should return CBC divisions for 'cbc' curriculum", () => {
    const divisions = getDefaultDivisionsForCurricula(["cbc"]);

    expect(divisions).toHaveLength(3);
    expect(divisions.map(d => d.type)).toEqual([
      "lower_primary",
      "upper_primary",
      "junior_secondary",
    ]);
  });

  it("should return senior secondary for 'cbc-senior' curriculum", () => {
    const divisions = getDefaultDivisionsForCurricula(["cbc-senior"]);

    expect(divisions).toHaveLength(1);
    expect(divisions[0].type).toBe("senior_secondary");
    expect(divisions[0].gradeLevelStart).toBe(10);
    expect(divisions[0].gradeLevelEnd).toBe(12);
  });

  it("should return 8-4-4 division for '8-4-4' curriculum", () => {
    const divisions = getDefaultDivisionsForCurricula(["8-4-4"]);

    expect(divisions).toHaveLength(1);
    expect(divisions[0].type).toBe("8-4-4");
    expect(divisions[0].curriculum).toBe("8-4-4");
  });

  it("should combine divisions for multiple curriculum types", () => {
    const divisions = getDefaultDivisionsForCurricula(["cbc", "cbc-senior", "8-4-4"]);

    // 3 CBC + 1 Senior + 1 8-4-4 = 5 total
    expect(divisions).toHaveLength(5);
  });

  it("should sort by displayOrder", () => {
    const divisions = getDefaultDivisionsForCurricula(["8-4-4", "cbc"]);

    // CBC divisions (order 1,2,3) should come before 8-4-4 (order 5)
    expect(divisions[0].type).toBe("lower_primary");
    expect(divisions[divisions.length - 1].type).toBe("8-4-4");
  });

  it("should return empty array for unknown curriculum", () => {
    const divisions = getDefaultDivisionsForCurricula(["unknown"]);
    expect(divisions).toHaveLength(0);
  });

  it("should return empty array for empty input", () => {
    const divisions = getDefaultDivisionsForCurricula([]);
    expect(divisions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getDivisionDisplayName — pure function
// ---------------------------------------------------------------------------
describe("getDivisionDisplayName", () => {
  it("should use 'Grade' for CBC divisions", () => {
    const division = {
      id: "1",
      school_id: "s1",
      name: "Lower Primary",
      short_name: "LP",
      description: null,
      curriculum: "cbc",
      grade_level_start: 1,
      grade_level_end: 3,
      division_type: "lower_primary" as const,
      is_active: true,
      display_order: 1,
      created_at: "",
      updated_at: "",
    } satisfies SchoolDivision;

    expect(getDivisionDisplayName(division)).toBe("Lower Primary (Grade 1-3)");
  });

  it("should use 'Form' for 8-4-4 divisions", () => {
    const division = {
      id: "2",
      school_id: "s1",
      name: "8-4-4 Secondary",
      short_name: "844",
      description: null,
      curriculum: "8-4-4",
      grade_level_start: 1,
      grade_level_end: 4,
      division_type: "8-4-4" as const,
      is_active: true,
      display_order: 5,
      created_at: "",
      updated_at: "",
    } satisfies SchoolDivision;

    expect(getDivisionDisplayName(division)).toBe("8-4-4 Secondary (Form 1-4)");
  });
});

// ---------------------------------------------------------------------------
// Division config constants — sanity checks
// ---------------------------------------------------------------------------
describe("Division config constants", () => {
  it("cbcDivisionConfigs should have correct grade ranges", () => {
    const lp = cbcDivisionConfigs.find(d => d.type === "lower_primary")!;
    expect(lp.gradeLevelStart).toBe(1);
    expect(lp.gradeLevelEnd).toBe(3);

    const up = cbcDivisionConfigs.find(d => d.type === "upper_primary")!;
    expect(up.gradeLevelStart).toBe(4);
    expect(up.gradeLevelEnd).toBe(6);

    const js = cbcDivisionConfigs.find(d => d.type === "junior_secondary")!;
    expect(js.gradeLevelStart).toBe(7);
    expect(js.gradeLevelEnd).toBe(9);
  });

  it("cbcSeniorDivisionConfig should cover grades 10-12", () => {
    expect(cbcSeniorDivisionConfig.gradeLevelStart).toBe(10);
    expect(cbcSeniorDivisionConfig.gradeLevelEnd).toBe(12);
    expect(cbcSeniorDivisionConfig.curriculum).toBe("cbc-senior");
  });

  it("system844DivisionConfig should cover forms 1-4", () => {
    expect(system844DivisionConfig.gradeLevelStart).toBe(1);
    expect(system844DivisionConfig.gradeLevelEnd).toBe(4);
    expect(system844DivisionConfig.curriculum).toBe("8-4-4");
  });
});
