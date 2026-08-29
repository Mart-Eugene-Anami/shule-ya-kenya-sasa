/**
 * Curriculum-aware terminology utility
 * 
 * This utility provides consistent terminology based on the curriculum type.
 * - CBE (Competency Based Education): Uses "Grade" (e.g., Grade 1, Grade 2)
 * - CBE Senior Secondary: Uses "Grade" (e.g., Grade 10, Grade 11, Grade 12)
 * - 8-4-4 System: Uses "Form" for high school (e.g., Form 1, Form 2)
 * 
 * The underlying data model is the same - "forms" are just "grades" with different naming.
 */

export type CurriculumType = "cbc" | "cbc-senior" | "8-4-4" | "custom" | string;

export interface TerminologyConfig {
  gradeSingular: string;      // "Grade" or "Form"
  gradePlural: string;        // "Grades" or "Forms"
  gradeStreamLabel: string;   // "Grade & Stream" or "Form & Stream"
  selectGrade: string;        // "Select a grade" or "Select a form"
  selectGradeStream: string;  // "Select grade and stream" or "Select form and stream"
  allGrades: string;          // "All Grades" or "All Forms"
  gradePerformance: string;   // "Grade Performance" or "Form Performance"
  gradeAnalytics: string;     // "Grade Analytics" or "Form Analytics"
  gradeRankings: string;      // "Grade Rankings" or "Form Rankings"
  inGrade: string;            // "In Grade" or "In Form"
  byGrade: string;            // "By Grade" or "By Form"
}

const cbcTerminology: TerminologyConfig = {
  gradeSingular: "Grade",
  gradePlural: "Grades",
  gradeStreamLabel: "Grade & Stream",
  selectGrade: "Select a grade",
  selectGradeStream: "Select grade and stream",
  allGrades: "All Grades",
  gradePerformance: "Grade Performance",
  gradeAnalytics: "Grade Analytics",
  gradeRankings: "Grade Rankings",
  inGrade: "In Grade",
  byGrade: "By Grade",
};

const form844Terminology: TerminologyConfig = {
  gradeSingular: "Form",
  gradePlural: "Forms",
  gradeStreamLabel: "Form & Stream",
  selectGrade: "Select a form",
  selectGradeStream: "Select form and stream",
  allGrades: "All Forms",
  gradePerformance: "Form Performance",
  gradeAnalytics: "Form Analytics",
  gradeRankings: "Form Rankings",
  inGrade: "In Form",
  byGrade: "By Form",
};

/**
 * Get terminology configuration based on curriculum type
 * CBE and CBE-Senior both use "Grade" terminology
 */
export function getTerminology(curriculum?: CurriculumType): TerminologyConfig {
  if (curriculum === "8-4-4") {
    return form844Terminology;
  }
  // CBE and CBE-Senior both use Grade terminology
  return cbcTerminology;
}

/**
 * Get the grade/form singular term
 */
export function getGradeTerm(curriculum?: CurriculumType): string {
  return getTerminology(curriculum).gradeSingular;
}

/**
 * Get the grades/forms plural term
 */
export function getGradesPluralTerm(curriculum?: CurriculumType): string {
  return getTerminology(curriculum).gradePlural;
}

/**
 * Determine curriculum type from a grade name
 * If the grade name starts with "Form", it's 8-4-4
 * If grade is 10-12, it's CBE Senior
 */
export function inferCurriculumFromGradeName(gradeName?: string): CurriculumType {
  if (!gradeName) return "cbc";
  const normalized = gradeName.toLowerCase().trim();
  
  if (normalized.startsWith("form")) {
    return "8-4-4";
  }
  
  // Check for CBE Senior grades (Grade 10, 11, 12)
  const gradeMatch = normalized.match(/grade\s*(\d+)/);
  if (gradeMatch) {
    const gradeNum = parseInt(gradeMatch[1], 10);
    if (gradeNum >= 10 && gradeNum <= 12) {
      return "cbc-senior";
    }
  }
  
  return "cbc";
}

/**
 * Format a grade/form display name with stream
 * e.g., "Grade 5 Alpha" or "Form 2 Blue"
 */
export function formatGradeStreamDisplay(gradeName: string, streamName: string): string {
  return `${gradeName} ${streamName}`;
}

/**
 * Check if a curriculum type is CBE-based (uses Grade terminology)
 */
export function isCBCBasedCurriculum(curriculum?: CurriculumType): boolean {
  return curriculum === "cbc" || curriculum === "cbc-senior";
}

/**
 * Get a friendly curriculum label
 */
export function getCurriculumLabel(curriculum?: CurriculumType): string {
  switch (curriculum) {
     case "cbc":
       return "CBE (Grade 1-9)";
     case "cbc-senior":
       return "CBE Senior (Grade 10-12)";
    case "8-4-4":
      return "8-4-4 System";
    case "custom":
      return "Custom";
    default:
      return curriculum || "Unknown";
  }
}
