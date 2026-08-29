export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "school_admin" | "teacher" | "student";
  schoolId: string | null;
}

export interface School {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  name: string; // "Grade 1" or "Form 1"
  level: number; // 1-12 (CBE) or 1-4 (8-4-4)
  curriculum: "cbc" | "cbc-senior" | "8-4-4";
  schoolId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stream {
  id: string;
  name: string; // "Red", "Blue"
  gradeId?: string; // Links to Grade (nullable for school-level streams)
  divisionId?: string; // Links to Division (for division-level streams)
  schoolId?: string; // Direct link to school for school-level streams
  academicYearId?: string; // Reference to current academic year
  overrideLevel?: 'school' | 'division' | 'grade'; // Level at which this stream was defined
  createdAt?: string;
  updatedAt?: string;
}

export type CBCSeniorPathway = "stem" | "arts_sports" | "social_sciences";

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  email?: string;
  gradeId: string;
  streamId: string;
  schoolId: string;
  userId?: string; // Linked user account ID
  grade?: Grade;
  stream?: Stream;
  history?: StudentHistory[]; // Add history property
   pathway?: CBCSeniorPathway; // For CBE Senior students (Grade 10-12)
   trackId?: string; // CBE Senior track ID
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  subjectsTaught?: string[]; // Additional subjects the teacher can teach
  schoolId: string;
  isStreamTeacher?: boolean;
  streamId?: string; // Null if not a stream teacher
  academicYearId?: string; // Reference to current academic year when they were a stream teacher
}

export interface Attendance {
  id: string;
  date: string;
  studentId: string;
  streamId: string;
  status: "Present" | "Absent" | "Late";
  recordedBy: string; // Teacher ID
  recordedAt: string;
  locked: boolean;
  termId?: string; // Reference to the term
}

export interface BulkUploadResult {
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    reason: string;
    data: Record<string, any>;
  }>;
}

// New types for Exam Management & Analytics

export interface Exam {
  id: string;
  name: string;
  description?: string;
  grades: string[]; // Grade ids
  subjects: string[]; // Subject names
  startDate: string;
  endDate: string;
  createdBy: string; // Admin ID
  createdAt: string;
  schoolId: string;
  isActive: boolean;
  termId?: string; // Reference to the term
}

export interface Mark {
  id: string;
  examId: string;
  studentId: string;
  subject: string;
  score: number;
  outOf: number;
  recordedBy: string; // Teacher ID
  recordedAt: string;
}

export interface ExamAnalytics {
  examId: string;
  examName: string;
  studentCount: number;
  highestScore: number;
  lowestScore: number;
  averageScore: number;
  passingRate: number;
  subjectAverages: Array<{
    subject: string;
    average: number;
  }>;
  streamPerformance: Array<{
    streamId: string;
    streamName: string;
    average: number;
  }>;
}

export interface StudentPerformance {
  studentId: string;
  student: {
    name: string;
    admissionNo: string;
    stream: {
      name: string;
      grade: {
        name: string;
      };
    };
  };
  totalMarks: number;
  averageScore: number;
  rank: number;
  subjects: Array<{
    subject: string;
    score: number;
    outOf: number;
    grade: string;
  }>;
}

export interface SubjectAnalytics {
  subject: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passingRate: number;
  streamBreakdown: Array<{
    streamId: string;
    streamName: string;
    average: number;
  }>;
}

export interface TrendAnalytics {
  subject: string;
  periods: string[];
  averages: number[];
  passingRates: number[];
}

// New types for Academic Year, Terms and Student History

export interface AcademicYear {
  id: string;
  year: string; // "2023-2024"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schoolId: string;
}

export interface SchoolTerm {
  id: string;
  name: string; // "Term 1"
  startDate: string;
  endDate: string;
  academicYearId: string;
  isActive: boolean;
  schoolId: string;
}

export interface StudentHistory {
  id: string;
  studentId: string;
  academicYearId: string;
  gradeId: string;
  streamId: string;
  grade: Grade;
  stream: Stream;
  academicYear: AcademicYear;
}

export interface YearResetResult {
  studentsPromoted: number;
  streamsReset: number;
  teachersReassigned: number;
  errors: Array<{
    entity: string;
    id: string;
    reason: string;
  }>;
}

export interface TermStatusResult {
  currentTerm: SchoolTerm | null;
  currentAcademicYear: AcademicYear | null;
  nextTerms: SchoolTerm[];
  previousTerms: SchoolTerm[];
}

// New types for Timetable Management System

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  roomType: string; // CLASSROOM, LAB, LIBRARY, GYM, etc.
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableRule {
  id: string;
  schoolId: string;
  ruleType: string; // SUBJECT_SEQUENCE, LESSON_DURATION, TEACHER_CONSTRAINT, ROOM_ALLOCATION
  ruleData: any; // Flexible JSON data structure
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Timetable {
  id: string;
  schoolId: string;
  gradeId: string;
  streamId: string;
  academicYearId: string;
  termId: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  grade?: Grade;
  stream?: Stream;
  slots?: TimetableSlot[];
}

export interface TimetableSlot {
  id: string;
  timetableId: string;
  day: string; // Monday, Tuesday, Wednesday, Thursday, Friday
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  roomId?: string;
  teacher?: Teacher;
  room?: Room;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  day: string; // Monday, Tuesday, Wednesday, Thursday, Friday
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  academicYearId: string;
  termId: string;
  createdAt: string;
  updatedAt: string;
  teacher?: Teacher;
}

export interface TimetableBreakConfig {
  id: string;
  name: string;
  afterPeriod: number;
  durationMinutes: number;
}

export interface SubjectLessonsConfig {
  subject: string;
  lessonsPerWeek: number;
}

export interface TimetableGenerationConfig {
  startTime: string;
  lessonDurationMinutes: number;
  lessonsPerDay: number;
  breaks: TimetableBreakConfig[];
  subjectLessons: SubjectLessonsConfig[];
  schoolDays?: string[]; // e.g., ["Monday","Tuesday","Wednesday","Thursday","Friday"] or include "Saturday"
}

export interface TimetableGenerationOptions {
  schoolId: string;
  gradeId: string;
  streamId: string;
  termId: string;
  academicYearId: string;
  regenerate: boolean;
  config?: TimetableGenerationConfig;
}

export interface TimetableGenerationResult {
  success: boolean;
  message: string;
  timetableId?: string;
  conflicts?: Array<{
    type: string;
    message: string;
    details: any;
  }>;
  stats?: {
    totalSlots: number;
    filledSlots: number;
    roomUtilization: number;
    teacherUtilization: number;
  };
}

// Enhanced types for the new mark entry system
export interface Rubric {
  id: string;
  name: string;
  subject: string;
  school_id: string;
  grade_ranges: Array<{
    min_mark: number;
    max_mark: number;
    grade: string;
    points: number;
  }>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

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

export interface EnhancedMark extends Mark {
  assessment_type_id?: string;
  raw_mark?: number;
  computed_score?: number;
  grade?: string;
  rubric_id?: string;
  is_draft?: boolean;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  timestamp: string;
}

export interface YearTransitionNotification {
  id: string;
  schoolId: string;
  academicYearId: string;
  notificationType: 'term_transition' | 'year_end' | 'year_start';
  message: string;
  isRead: boolean;
  createdForUserId?: string;
  createdAt: string;
  scheduledFor?: string;
}

export interface ArchivedAcademicYear {
  id: string;
  originalAcademicYearId: string;
  schoolId: string;
  year: string;
  archivedAt: string;
  archivedBy: string;
  archiveData: any;
  createdAt: string;
}

export interface ArchivedStudentAssignment {
  id: string;
  studentId: string;
  academicYearId: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
  archivedAt: string;
  createdAt: string;
}

export interface ArchivedTeacherAssignment {
  id: string;
  teacherId: string;
  academicYearId: string;
  streamId?: string;
  gradeId?: string;
  subjectsTaught: string[];
  isStreamTeacher: boolean;
  archivedAt: string;
  createdAt: string;
}
