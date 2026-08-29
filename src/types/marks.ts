// Performance level structure matching the CBE rubric system
export interface PerformanceSubLevel {
  code: string;           // e.g., "EE1", "EE2"
  min_mark: number;       // e.g., 90
  max_mark: number;       // e.g., 100
  points: number;         // e.g., 4.0
}

export interface PerformanceLevel {
  name: string;           // e.g., "Exceeding Expectation"
  code: string;           // e.g., "EE"
  sub_levels: PerformanceSubLevel[];
}

export interface RubricGradeRange {
  performance_level: string;     // e.g., "Exceeding Expectation (EE)"
  actual_level: string;          // e.g., "EE1"
  min_mark: number;
  max_mark: number;
  points: number;
}

export interface Rubric {
  id: string;
  name: string;
  subject: string;
  school_id: string;
  grade_ranges: RubricGradeRange[];
  is_active: boolean;
  is_multi_subject: boolean;
  subjects: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Default CBE Rubric Template
export const DEFAULT_RUBRIC_TEMPLATE: RubricGradeRange[] = [
  { performance_level: "Exceeding Expectation (EE)", actual_level: "EE1", min_mark: 90, max_mark: 100, points: 4.0 },
  { performance_level: "Exceeding Expectation (EE)", actual_level: "EE2", min_mark: 75, max_mark: 89, points: 3.5 },
  { performance_level: "Meeting Expectation (ME)", actual_level: "ME1", min_mark: 58, max_mark: 74, points: 3.0 },
  { performance_level: "Meeting Expectation (ME)", actual_level: "ME2", min_mark: 41, max_mark: 57, points: 2.5 },
  { performance_level: "Approaching Expectation (AE)", actual_level: "AE1", min_mark: 31, max_mark: 40, points: 2.0 },
  { performance_level: "Approaching Expectation (AE)", actual_level: "AE2", min_mark: 21, max_mark: 30, points: 1.5 },
  { performance_level: "Below Expectation (BE)", actual_level: "BE1", min_mark: 11, max_mark: 20, points: 1.0 },
  { performance_level: "Below Expectation (BE)", actual_level: "BE2", min_mark: 1, max_mark: 10, points: 0.5 },
];

// 8-4-4 Rubric Template (Traditional Kenyan grading system)
export const RUBRIC_844_TEMPLATE: RubricGradeRange[] = [
  { performance_level: "Excellent", actual_level: "A", min_mark: 80, max_mark: 100, points: 12.0 },
  { performance_level: "Excellent", actual_level: "A-", min_mark: 75, max_mark: 79, points: 11.0 },
  { performance_level: "Very Good", actual_level: "B+", min_mark: 70, max_mark: 74, points: 10.0 },
  { performance_level: "Very Good", actual_level: "B", min_mark: 65, max_mark: 69, points: 9.0 },
  { performance_level: "Good", actual_level: "B-", min_mark: 60, max_mark: 64, points: 8.0 },
  { performance_level: "Good", actual_level: "C+", min_mark: 55, max_mark: 59, points: 7.0 },
  { performance_level: "Average", actual_level: "C", min_mark: 50, max_mark: 54, points: 6.0 },
  { performance_level: "Average", actual_level: "C-", min_mark: 45, max_mark: 49, points: 5.0 },
  { performance_level: "Below Average", actual_level: "D+", min_mark: 40, max_mark: 44, points: 4.0 },
  { performance_level: "Below Average", actual_level: "D", min_mark: 35, max_mark: 39, points: 3.0 },
  { performance_level: "Weak", actual_level: "D-", min_mark: 30, max_mark: 34, points: 2.0 },
  { performance_level: "Weak", actual_level: "E", min_mark: 0, max_mark: 29, points: 1.0 },
];

// Custom rubric starting template
export const CUSTOM_RUBRIC_TEMPLATE: RubricGradeRange[] = [
  { performance_level: "Excellent", actual_level: "A", min_mark: 80, max_mark: 100, points: 5.0 },
  { performance_level: "Good", actual_level: "B", min_mark: 60, max_mark: 79, points: 4.0 },
  { performance_level: "Average", actual_level: "C", min_mark: 40, max_mark: 59, points: 3.0 },
  { performance_level: "Below Average", actual_level: "D", min_mark: 20, max_mark: 39, points: 2.0 },
  { performance_level: "Fail", actual_level: "F", min_mark: 0, max_mark: 19, points: 1.0 },
];

export type RubricType = 'cbc' | '844' | 'custom';

export const RUBRIC_TYPE_LABELS: Record<RubricType, string> = {
  cbc: 'CBE (Competency Based)',
  '844': '8-4-4 (Traditional)',
  custom: 'Custom',
};

export const getRubricTemplate = (type: RubricType): RubricGradeRange[] => {
  switch (type) {
    case 'cbc':
      return [...DEFAULT_RUBRIC_TEMPLATE];
    case '844':
      return [...RUBRIC_844_TEMPLATE];
    case 'custom':
      return [...CUSTOM_RUBRIC_TEMPLATE];
    default:
      return [...DEFAULT_RUBRIC_TEMPLATE];
  }
};

export interface AssessmentType {
  id: string;
  name: string;
  school_id: string;
  weight: number;
  max_marks: number;
  is_active: boolean;
  created_at: string;
}

export interface MarkEntrySession {
  id: string;
  teacher_id: string;
  stream_id: string;
  subject: string;
  assessment_type_id: string;
  exam_id?: string;
  status: 'draft' | 'submitted' | 'finalized';
  total_students: number;
  entered_count: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedMark {
  id?: string;
  exam_id: string;
  student_id: string;
  subject: string;
  assessment_type_id: string;
  raw_mark: number;
  computed_score?: number;
  grade?: string;
  rubric_id?: string;
  is_draft: boolean;
  recorded_by: string;
  recorded_at: string;
}

export interface StudentMarkEntry {
  student_id: string;
  student_name: string;
  admission_no: string;
  raw_mark?: number;
  computed_score?: number;
  grade?: string;
  is_valid: boolean;
  validation_error?: string;
}
