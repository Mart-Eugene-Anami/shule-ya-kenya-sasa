// Extended timetable types for optional subjects, constraints, and free lessons

export type SubjectType = 'core' | 'optional' | 'elective';
export type Pathway = 'stem' | 'arts_sports' | 'social_sciences';

export interface SubjectConfig {
  id: string;
  name: string;
  subjectType: SubjectType;
  pathway?: Pathway;
  maxLessonsPerWeek: number;
  requiresSpecialRoom: boolean;
  specialRoomType?: string;
  curriculum: string;
}

export interface TeacherConstraint {
  teacherId: string;
  teacherName: string;
  maxLessonsPerWeek: number;
  currentLessonsAssigned?: number;
}

export interface SubjectLessonConstraint {
  subject: string;
  lessonsPerWeek: number;
  isOptional: boolean;
  pathway?: Pathway;
  roomRequirement?: string;
}

export interface TimetableConstraint {
  id: string;
  schoolId: string;
  constraintType: 'teacher_max_lessons' | 'subject_max_lessons' | 'free_periods_per_day' | 'max_consecutive_lessons' | 'subject_max_period';
  entityId?: string;
  entityName?: string;
  maxValue: number;
  isActive: boolean;
}

export interface SubjectRoomRequirement {
  id: string;
  schoolId: string;
  subjectId: string;
  roomId?: string;
  roomType?: string;
  isMandatory: boolean;
}

export interface EnhancedSubjectLessonsConfig {
  subject: string;
  lessonsPerWeek: number;
  isOptional: boolean;
  pathway?: Pathway;
  requiresSpecialRoom: boolean;
  specialRoomType?: string;
}

export interface EnhancedTimetableConfig {
  startTime: string;
  lessonDurationMinutes: number;
  lessonsPerDay: number;
  breaks: BreakConfig[];
  subjectLessons: EnhancedSubjectLessonsConfig[];
  freePeriodsPerDay: number;
  teacherMaxLessonsPerWeek: number;
  defaultMaxLessonsPerSubject: number;
}

export interface BreakConfig {
  id: string;
  name: string;
  afterPeriod: number;
  durationMinutes: number;
}

export interface TimetableGenerationContext {
  schoolId: string;
  gradeId: string;
  streamId: string;
  termId: string;
  academicYearId: string;
  gradeCurriculum: string;
  config: EnhancedTimetableConfig;
  coreSubjects: SubjectConfig[];
  optionalSubjects: SubjectConfig[];
  teachers: TeacherWithConstraints[];
  rooms: RoomWithType[];
  teacherAssignments: TeacherSubjectAssignment[];
  studentPathways?: Pathway[]; // For CBE Senior
}

export interface TeacherWithConstraints {
  id: string;
  name: string;
  maxLessonsPerWeek: number;
  currentWeeklyLessons: number;
  subjectsTaught: string[];
}

export interface RoomWithType {
  id: string;
  name: string;
  roomType: string;
  isShared: boolean;
  capacity?: number;
}

export interface TeacherSubjectAssignment {
  teacherId: string;
  subject: string;
  gradeStreamId: string;
}

export interface GenerationSlot {
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  roomId?: string;
  isFreePeriod: boolean;
  isOptionalSubject: boolean;
  pathway?: Pathway;
}

export interface GenerationConflict {
  type: 'teacher_overload' | 'room_conflict' | 'subject_limit_exceeded' | 'no_teacher_available' | 'no_room_available';
  message: string;
  details: {
    day?: string;
    period?: number;
    subject?: string;
    teacherId?: string;
    roomId?: string;
  };
}

export interface EnhancedGenerationResult {
  success: boolean;
  message: string;
  timetableId?: string;
  conflicts: GenerationConflict[];
  stats: {
    totalSlots: number;
    filledSlots: number;
    freeSlots: number;
    coreSubjectSlots: number;
    optionalSubjectSlots: number;
    teacherUtilization: number;
    roomUtilization: number;
  };
  warnings: string[];
}
