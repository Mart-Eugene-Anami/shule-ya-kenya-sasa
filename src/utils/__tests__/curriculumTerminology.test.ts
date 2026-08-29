/**
 * Unit tests for the curriculum terminology utility.
 *
 * Verifies that the correct terminology configs are returned
 * for each supported curriculum type, and that helper functions
 * correctly identify curriculum types.
 */
import { describe, it, expect } from "vitest";
import {
  getTerminology,
  inferCurriculumFromGradeName,
  formatGradeStreamDisplay,
  isCBCBasedCurriculum,
  getCurriculumLabel,
} from "../curriculumTerminology";

describe("getTerminology", () => {
  it("should return 'Grade' singular for CBC curriculum", () => {
    const config = getTerminology("cbc");
    expect(config.gradeSingular).toBe("Grade");
    expect(config.gradePlural).toBe("Grades");
  });

  it("should return 'Form' singular for 8-4-4 curriculum", () => {
    const config = getTerminology("8-4-4");
    expect(config.gradeSingular).toBe("Form");
    expect(config.gradePlural).toBe("Forms");
  });

  it("should return 'Grade' for CBC Senior curriculum", () => {
    const config = getTerminology("cbc-senior");
    expect(config.gradeSingular).toBe("Grade");
  });

  it("should default to CBC terminology for unknown curriculum", () => {
    const config = getTerminology("unknown");
    expect(config.gradeSingular).toBe("Grade");
  });
});

describe("inferCurriculumFromGradeName", () => {
  it("should return '8-4-4' for form-based names", () => {
    expect(inferCurriculumFromGradeName("Form 2")).toBe("8-4-4");
  });

  it("should return 'cbc-senior' for grades 10-12", () => {
    expect(inferCurriculumFromGradeName("Grade 10")).toBe("cbc-senior");
    expect(inferCurriculumFromGradeName("Grade 12")).toBe("cbc-senior");
  });

  it("should return 'cbc' for grades 1-9", () => {
    expect(inferCurriculumFromGradeName("Grade 5")).toBe("cbc");
  });

  it("should default to 'cbc' for undefined input", () => {
    expect(inferCurriculumFromGradeName(undefined)).toBe("cbc");
  });
});

describe("formatGradeStreamDisplay", () => {
  it("should combine grade and stream names", () => {
    expect(formatGradeStreamDisplay("Grade 5", "Alpha")).toBe("Grade 5 Alpha");
    expect(formatGradeStreamDisplay("Form 2", "Blue")).toBe("Form 2 Blue");
  });
});

describe("isCBCBasedCurriculum", () => {
  it("should return true for cbc and cbc-senior", () => {
    expect(isCBCBasedCurriculum("cbc")).toBe(true);
    expect(isCBCBasedCurriculum("cbc-senior")).toBe(true);
  });

  it("should return false for 8-4-4", () => {
    expect(isCBCBasedCurriculum("8-4-4")).toBe(false);
  });
});

describe("getCurriculumLabel", () => {
  it("should return user-friendly labels", () => {
    expect(getCurriculumLabel("cbc")).toContain("CBE");
    expect(getCurriculumLabel("8-4-4")).toContain("8-4-4");
    expect(getCurriculumLabel("cbc-senior")).toContain("Senior");
  });
});
