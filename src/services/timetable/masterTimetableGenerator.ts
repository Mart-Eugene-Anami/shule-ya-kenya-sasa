/**
 * Master timetable generation service.
 * 
 * Generates timetables for ALL streams in the school simultaneously using a
 * GLOBAL teacher tracker. Dispatches to curriculum-specific strategies:
 * - Standard (8-4-4, CBE Primary/Junior): Core subjects pulled directly from the
 *   Subjects module (by division) for all streams. Optional subjects are only included
 *   for streams where they are explicitly allocated via room_subject_allocations.
 *   Teachers come from teacher_subject_assignments.
 * - CBE Senior: track/pathway-based scheduling with room_subject_allocations
 *   for split-room/track logic.
 * 
 * Common aspects (shared across all curricula):
 * - Global teacher conflict detection via time ranges across divisions
 * - Priority scheduling: busiest streams first
 * - Core subjects scheduled before optional/elective
 * - Subject time restrictions (subject_max_period constraints)
 * - Division-aware timetable configuration
 */

import { supabase } from "@/integrations/supabase/client";
import { GenerationConflict, Pathway } from "@/types/timetable";
import { getRoomSubjectAllocations, getRoomTeacherAllocations } from "../roomAllocationService";
import {
  TeacherSlotTracker,
  StreamGenerationUnit,
  StreamGenerationResult,
  SubjectLessonAllocation,
  createTeacherTracker,
  DEFAULT_DAYS,
  TimeRange,
  timeRangesOverlap,
} from "./commonTimetableUtils";
import { generateStandardStreamTimetable } from "./standardTimetableStrategy";
import { generateCBESeniorStreamTimetable } from "./cbeSeniorTimetableStrategy";
import { analyzePreGeneration, PreGenerationReport } from "./preGenerationAnalysis";

export interface MasterTimetableOptions {
  schoolId: string;
  termId: string;
  academicYearId: string;
  regenerate: boolean;
}

export interface MasterGenerationResult {
  success: boolean;
  message: string;
  streamResults: StreamGenerationResult[];
  conflicts: GenerationConflict[];
  warnings: string[];
  preGenerationReport?: PreGenerationReport;
  stats: {
    totalStreams: number;
    successfulStreams: number;
    failedStreams: number;
    totalSlots: number;
    filledSlots: number;
    freeSlots: number;
    teacherUtilization: number;
  };
  /** Per-curriculum breakdown for multi-curriculum schools */
  curriculumBreakdown?: Record<string, {
    curriculum: string;
    label: string;
    streamCount: number;
    successCount: number;
    strategy: "standard" | "cbe-senior";
  }>;
}

const CURRICULUM_LABELS: Record<string, string> = {
  "cbc": "CBE Primary/Junior",
  "cbc-senior": "CBE Senior",
  "8-4-4": "8-4-4",
};

/**
 * Determine which generation strategy to use based on curriculum type.
 * - CBE Senior (cbc-senior) uses specialized track/pathway strategy
 * - All other curricula (cbc, 8-4-4) use standard strategy
 *   - This includes CBE Primary (lower_primary, upper_primary - Grades 1-6)
 *   - CBE Junior (junior_secondary - Grades 7-9)
 *   - 8-4-4 (secondary - all grades)
 */
function getStrategy(curriculum: string): "standard" | "cbe-senior" {
  return curriculum === "cbc-senior" ? "cbe-senior" : "standard";
}

/**
 * For standard curricula (8-4-4, CBE Primary/Junior), build subject allocations
 * directly from the Subjects module (by division) and teacher_subject_assignments.
 * 
 * This handles:
 * - CBE Primary (Grades 1-6): lower_primary (Grades 1-3) and upper_primary (Grades 4-6)
 * - CBE Junior (Grades 7-9): junior_secondary division
 * - 8-4-4 (all grades): secondary division
 * 
 * These curricula follow a straightforward model:
 * - Students stay in their assigned rooms (one room per stream)
 * - Core subjects are mandatory for all students in the grade/stream
 * - Optional subjects can be included via room_subject_allocations if needed
 * - Teachers are assigned via teacher_subject_assignments table
 * - No complex pathway/track logic needed
 */
async function buildStandardSubjectAllocations(
  grade: any,
  streamId: string,
  gradeStreamId: string | null,
  schoolId: string,
  academicYearId: string,
  divisions: any[],
  warnings: string[],
  roomId?: string
): Promise<SubjectLessonAllocation[]> {
  // Extract grade level from grade.level field or parse from grade name
  // Handles formats like "Grade 1", "Grade 7", "Form 1", "Standard 8", etc.
  const gradeLevel = grade.level || parseInt(grade.name.replace(/\D/g, "")) || 1;

  // Find division for this grade based on curriculum and grade level range
  // This ensures proper subject selection for:
  // - CBE Primary: lower_primary (Grades 1-3), upper_primary (Grades 4-6)
  // - CBE Junior: junior_secondary (Grades 7-9)
  // - 8-4-4: secondary (all grades)
  const matchingDivision = divisions.find(
    (d: any) => d.curriculum === grade.curriculum && gradeLevel >= d.grade_level_start && gradeLevel <= d.grade_level_end
  );

  // Fetch subjects by division_id first, then fallback to curriculum
  let subjects: any[] = [];
  if (matchingDivision) {
    const { data: divSubjects } = await supabase
      .from("subjects")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .eq("division_id", matchingDivision.id)
      .order("subject_type")
      .order("name");

    if (divSubjects && divSubjects.length > 0) {
      subjects = divSubjects;
    } else {
      const { data: currSubjects } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .eq("curriculum", grade.curriculum)
        .order("subject_type")
        .order("name");
      subjects = currSubjects || [];
    }
  }

  if (subjects.length === 0) {
    warnings.push(`${grade.name}: No subjects found for division/curriculum. Skipping.`);
    return [];
  }

  // Get teacher assignments from teacher_subject_assignments
  // This applies to all standard curricula (CBE Primary, CBE Junior, 8-4-4)
  // Teachers are assigned per grade-stream combination for each academic year
  const teacherMap: Record<string, { teacherId: string; teacherName: string }> = {};
  if (gradeStreamId) {
    const { data: teacherAssignments } = await supabase
      .from("teacher_subject_assignments")
      .select("subject, teacher_id, teachers!inner(id, name)")
      .eq("grade_stream_id", gradeStreamId)
      .eq("academic_year_id", academicYearId);

    (teacherAssignments || []).forEach((ta: any) => {
      teacherMap[ta.subject] = {
        teacherId: ta.teacher_id,
        teacherName: ta.teachers?.name || "Unknown",
      };
    });
  }

  // Separate core and optional subjects
  const coreSubjects = subjects.filter((s: any) => s.subject_type === "core");
  const optionalSubjects = subjects.filter((s: any) => s.subject_type !== "core");

  // Core subjects are always included for all streams
  const allocations: SubjectLessonAllocation[] = coreSubjects.map((subject: any) => {
    const teacher = teacherMap[subject.name];
    if (!teacher) {
      warnings.push(`${grade.name}: No teacher assigned to core subject "${subject.name}". Subject will be scheduled without a teacher.`);
    }
    return {
      subjectId: subject.id,
      subject: subject.name,
      lessonsPerWeek: subject.max_lessons_per_week || 4,
      isCore: true,
      pathway: subject.pathway as Pathway | undefined,
      requiresSpecialRoom: subject.requires_special_room || false,
      specialRoomType: subject.special_room_type,
      teacherId: teacher?.teacherId,
      teacherName: teacher?.teacherName,
    };
  });

  // Optional subjects: only include those allocated to this room via room_subject_allocations
  // This allows schools to control which optional subjects are offered per stream
  if (roomId && optionalSubjects.length > 0) {
    const roomAllocations = await getRoomSubjectAllocations(roomId, academicYearId);
    const allocatedSubjectIds = new Set(roomAllocations.map((a) => a.subjectId));

    for (const subject of optionalSubjects) {
      if (allocatedSubjectIds.has(subject.id)) {
        const teacher = teacherMap[subject.name];
        if (!teacher) {
          warnings.push(`${grade.name}: No teacher assigned to optional subject "${subject.name}". Subject will be scheduled without a teacher.`);
        }
        allocations.push({
          subjectId: subject.id,
          subject: subject.name,
          lessonsPerWeek: subject.max_lessons_per_week || 4,
          isCore: false,
          pathway: subject.pathway as Pathway | undefined,
          requiresSpecialRoom: subject.requires_special_room || false,
          specialRoomType: subject.special_room_type,
          teacherId: teacher?.teacherId,
          teacherName: teacher?.teacherName,
        });
      }
    }

    // If no optional subjects are explicitly allocated, include all (backward compatibility)
    // This ensures existing setups continue to work
    if (!roomAllocations.length && optionalSubjects.length > 0) {
      for (const subject of optionalSubjects) {
        const teacher = teacherMap[subject.name];
        if (!teacher) {
          warnings.push(`${grade.name}: No teacher assigned to optional subject "${subject.name}". Subject will be scheduled without a teacher.`);
        }
        allocations.push({
          subjectId: subject.id,
          subject: subject.name,
          lessonsPerWeek: subject.max_lessons_per_week || 4,
          isCore: false,
          pathway: subject.pathway as Pathway | undefined,
          requiresSpecialRoom: subject.requires_special_room || false,
          specialRoomType: subject.special_room_type,
          teacherId: teacher?.teacherId,
          teacherName: teacher?.teacherName,
        });
      }
    }
  } else {
    // No room ID: include all optional subjects (fallback)
    for (const subject of optionalSubjects) {
      const teacher = teacherMap[subject.name];
      if (!teacher) {
        warnings.push(`${grade.name}: No teacher assigned to optional subject "${subject.name}". Subject will be scheduled without a teacher.`);
      }
      allocations.push({
        subjectId: subject.id,
        subject: subject.name,
        lessonsPerWeek: subject.max_lessons_per_week || 4,
        isCore: false,
        pathway: subject.pathway as Pathway | undefined,
        requiresSpecialRoom: subject.requires_special_room || false,
        specialRoomType: subject.special_room_type,
        teacherId: teacher?.teacherId,
        teacherName: teacher?.teacherName,
      });
    }
  }

  return allocations;
}

/**
 * For CBE Senior (Grades 10-12), use room_subject_allocations and room_teacher_allocations
 * (manual allocation step needed for track/pathway logic).
 * 
 * CBE Senior has complex requirements:
 * - Students choose pathways: STEM, Arts & Sports, or Social Sciences
 * - Each pathway has specific subject combinations
 * - Rooms can be "full" (dedicated to one track) or "split" (accommodate multiple tracks)
 * - Split rooms allow concurrent scheduling of different pathway subjects
 * - Manual allocation via room_subject_allocations and room_teacher_allocations is required
 * - Track-based student enrollment determines subject overlap detection
 */
async function buildCBESeniorSubjectAllocations(
  roomId: string,
  roomMode: string,
  academicYearId: string,
  warnings: string[],
  label: string
): Promise<SubjectLessonAllocation[]> {
  const roomSubjectAllocations = await getRoomSubjectAllocations(roomId, academicYearId);
  if (roomSubjectAllocations.length === 0) {
    warnings.push(`${label}: No subjects allocated to room. Skipping.`);
    return [];
  }

  // For CBE Senior, teachers are assigned via room_teacher_allocations
  // This allows different teachers for different tracks/pathways in the same room
  // and supports the complex subject combinations in CBE Senior
  const roomTeacherAllocations = await getRoomTeacherAllocations(roomId, academicYearId);

  const subjectTeacherMap: Record<string, { teacherId: string; teacherName?: string; lessonsPerWeek: number }> = {};
  roomTeacherAllocations.forEach((alloc: any) => {
    subjectTeacherMap[alloc.subjectId] = {
      teacherId: alloc.teacherId,
      teacherName: alloc.teacherName,
      lessonsPerWeek: alloc.lessonsPerWeek,
    };
  });

  const subjectIds = roomSubjectAllocations.map((a: any) => a.subjectId);
  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("*")
    .in("id", subjectIds);

  const subjectMap = new Map((subjectsData || []).map((s: any) => [s.id, s]));

  return roomSubjectAllocations.map((alloc: any) => {
    const subject = subjectMap.get(alloc.subjectId);
    const teacherAlloc = subjectTeacherMap[alloc.subjectId];
    // Full rooms: ALL subjects are core (all students take all subjects)
    // Split rooms: respect the original core/optional classification
    const isCore = roomMode === "full"
      ? true
      : (alloc.isCore !== undefined ? alloc.isCore : (subject?.subject_type === "core"));

    if (!teacherAlloc) {
      const subjectName = alloc.subjectName || (subject as any)?.name || "Unknown";
      warnings.push(`${label}: No teacher allocated to subject "${subjectName}" via room_teacher_allocations. Subject will be scheduled without a teacher.`);
    }

    return {
      subjectId: alloc.subjectId,
      subject: alloc.subjectName || (subject as any)?.name || "Unknown",
      lessonsPerWeek: (subject as any)?.max_lessons_per_week || teacherAlloc?.lessonsPerWeek || 4,
      isCore,
      pathway: (subject as any)?.pathway as Pathway | undefined,
      requiresSpecialRoom: (subject as any)?.requires_special_room || false,
      specialRoomType: (subject as any)?.special_room_type,
      teacherId: teacherAlloc?.teacherId,
      teacherName: teacherAlloc?.teacherName,
    };
  });
}

/**
 * Master timetable generation: generates timetables for ALL streams in the school
 * simultaneously, using a GLOBAL teacher tracker to prevent cross-stream conflicts.
 * Dispatches to curriculum-specific strategies per stream.
 */
export const generateMasterTimetable = async (
  options: MasterTimetableOptions
): Promise<MasterGenerationResult> => {
  const conflicts: GenerationConflict[] = [];
  const warnings: string[] = [];
  const streamResults: StreamGenerationResult[] = [];

  try {
    console.log("Starting MASTER timetable generation for entire school:", options);

    const { schoolId, termId, academicYearId } = options;

    if (!schoolId || !termId || !academicYearId) {
      return {
        success: false,
        message: "Missing required fields: schoolId, termId, and academicYearId are all required.",
        streamResults: [],
        conflicts: [],
        warnings: [],
        stats: { totalStreams: 0, successfulStreams: 0, failedStreams: 0, totalSlots: 0, filledSlots: 0, freeSlots: 0, teacherUtilization: 0 },
      };
    }

    // 1. Fetch ALL rooms with grade-stream links
    const { data: allRooms } = await supabase
      .from("rooms")
      .select("*, grades(id, name, curriculum, level), streams(id, name)")
      .eq("school_id", schoolId)
      .not("grade_id", "is", null)
      .not("stream_id", "is", null);

    if (!allRooms || allRooms.length === 0) {
      return {
        success: false,
        message: "No rooms found with grade-stream assignments. Please generate rooms from streams in the Rooms tab first.",
        streamResults: [],
        conflicts: [],
        warnings: [],
        stats: { totalStreams: 0, successfulStreams: 0, failedStreams: 0, totalSlots: 0, filledSlots: 0, freeSlots: 0, teacherUtilization: 0 },
      };
    }

    // 2. Fetch ALL teachers for GLOBAL tracking
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, name, max_lessons_per_week")
      .eq("school_id", schoolId)
      .eq("status", "active");

    const allDaysSet = new Set<string>(DEFAULT_DAYS);

    // GLOBAL teacher tracker — shared across ALL streams and curricula
    const globalTeacherTracker = createTeacherTracker(
      teachersData || [],
      Array.from(allDaysSet)
    );

    // 3. Fetch timetable configurations per division
    const { data: timetableConfigs } = await supabase
      .from("timetable_configurations")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true);

    // 4. Fetch divisions for config matching
    const { data: divisions } = await supabase
      .from("school_divisions")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true);

    // 5. Fetch subject_max_period constraints
    const { data: constraintsData } = await supabase
      .from("timetable_constraints")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true);

    const subjectMaxPeriodMap: Record<string, number> = {};
    (constraintsData || [])
      .filter((c: any) => c.constraint_type === "subject_max_period" && c.entity_name)
      .forEach((c: any) => {
        subjectMaxPeriodMap[c.entity_name!] = c.max_value;
      });

    // 5b. Fetch all grade_streams for teacher assignment lookups (standard curricula)
    const gradeIds = [...new Set(allRooms.map((r: any) => r.grade_id).filter(Boolean))];
    const { data: allGradeStreams } = await supabase
      .from("grade_streams")
      .select("id, grade_id, stream_id")
      .in("grade_id", gradeIds);

    const gradeStreamLookup = new Map<string, string>();
    (allGradeStreams || []).forEach((gs: any) => {
      gradeStreamLookup.set(`${gs.grade_id}-${gs.stream_id}`, gs.id);
    });

    // 6. Build stream generation units
    const streamUnits: StreamGenerationUnit[] = [];

    for (const room of allRooms) {
      const grade = room.grades as any;
      const stream = room.streams as any;
      if (!grade || !stream) continue;

      const strategy = getStrategy(grade.curriculum);
      const label = `${grade.name} ${stream.name}`;
      let subjectAllocations: SubjectLessonAllocation[];

      if (strategy === "cbe-senior") {
        // CBE Senior: use room-based allocations (manual step for tracks/pathways)
        subjectAllocations = await buildCBESeniorSubjectAllocations(
          room.id, room.room_mode || "standard", academicYearId, warnings, label
        );
      } else {
        // Standard (8-4-4, CBE Primary): pull directly from Subjects module + teacher_subject_assignments
        const gradeStreamId = gradeStreamLookup.get(`${grade.id}-${stream.id}`) || null;
        subjectAllocations = await buildStandardSubjectAllocations(
          grade, stream.id, gradeStreamId, schoolId, academicYearId,
          divisions || [], warnings, room.id
        );
      }

      if (subjectAllocations.length === 0) continue;

      // Find matching config for this grade's division
      // Extract grade level from grade.level field or parse from grade name
      // This ensures proper configuration selection for all curriculum types
      const gradeLevel = grade.level || parseInt(grade.name.replace(/\D/g, "")) || 1;
      const matchingDivision = (divisions || []).find(
        (d: any) => d.curriculum === grade.curriculum && gradeLevel >= d.grade_level_start && gradeLevel <= d.grade_level_end
      );

      const matchingConfig = matchingDivision
        ? (timetableConfigs || []).find((c: any) => c.division_id === matchingDivision.id)
        : null;

      const config = matchingConfig
        ? {
            startTime: matchingConfig.start_time as string,
            lessonDurationMinutes: matchingConfig.lesson_duration_minutes as number,
            lessonsPerDay: matchingConfig.lessons_per_day as number,
            breaks: (matchingConfig.breaks as unknown as Array<{ id: string; name: string; afterPeriod: number; durationMinutes: number }>) || [],
            schoolDays: (matchingConfig.school_days as string[]) || undefined,
          }
        : {
            startTime: "08:20",
            lessonDurationMinutes: 40,
            lessonsPerDay: 8,
            breaks: [] as Array<{ id: string; name: string; afterPeriod: number; durationMinutes: number }>,
          };

      if (config.schoolDays) {
        config.schoolDays.forEach((d) => allDaysSet.add(d));
      }

      streamUnits.push({
        gradeId: grade.id,
        gradeName: grade.name,
        gradeCurriculum: grade.curriculum,
        streamId: stream.id,
        streamName: stream.name,
        roomId: room.id,
        roomName: room.name,
        roomMode: room.room_mode || "standard",
        trackIds: room.track_ids || [],
        subjectAllocations,
        config,
      });
    }

    if (streamUnits.length === 0) {
      return {
        success: false,
        message: "No streams with subject allocations found. Ensure subjects are set up in the Subjects module and teachers are assigned in the Teachers module.",
        streamResults: [],
        conflicts: [],
        warnings,
        stats: { totalStreams: 0, successfulStreams: 0, failedStreams: 0, totalSlots: 0, filledSlots: 0, freeSlots: 0, teacherUtilization: 0 },
      };
    }

    // Ensure all days are initialized in the tracker
    const allDays = Array.from(allDaysSet);
    Object.values(globalTeacherTracker).forEach((tracker) => {
      allDays.forEach((d) => {
        if (tracker.dailyCount[d] === undefined) tracker.dailyCount[d] = 0;
      });
    });

    // ── Pre-generation analysis ──────────────────────────────────────────────
    const preGenerationReport = analyzePreGeneration(
      streamUnits,
      divisions || [],
      timetableConfigs || [],
      teachersData || []
    );

    // Add pre-generation warnings to the warnings array
    for (const issue of preGenerationReport.issues) {
      if (issue.severity === "error") {
        warnings.push(`⚠ PRE-CHECK ERROR: ${issue.message}`);
      } else if (issue.severity === "warning") {
        warnings.push(`PRE-CHECK: ${issue.message}`);
      }
    }

    console.log("Pre-generation analysis:", {
      canProceed: preGenerationReport.canProceed,
      issues: preGenerationReport.issues.length,
      summary: preGenerationReport.summary,
    });

    // 7. Delete ALL existing timetables for this term if regenerating
    if (options.regenerate) {
      const { data: existingTimetables } = await supabase
        .from("timetables")
        .select("id")
        .eq("school_id", schoolId)
        .eq("term_id", termId)
        .eq("academic_year_id", academicYearId);

      if (existingTimetables && existingTimetables.length > 0) {
        for (const tt of existingTimetables) {
          await supabase.from("timetable_slots").delete().eq("timetable_id", tt.id);
          await supabase.from("timetables").delete().eq("id", tt.id);
        }
      }
    }

    // ── Room tracker for shared room conflict detection ───────────────────────
    // Tracks which room is busy at which day/time to prevent double-booking
    const roomSlotTracker: Record<string, Map<string, TimeRange[]>> = {};

    // 8. Sort streams using smart heuristic:
    //    a) Busiest streams first (most required lessons)
    //    b) Streams with exclusive teachers first (no sharing across divisions)
    //    c) Streams in divisions with more constraints first
    const teacherStreamCount = new Map<string, number>();
    for (const unit of streamUnits) {
      for (const alloc of unit.subjectAllocations) {
        if (alloc.teacherId) {
          teacherStreamCount.set(alloc.teacherId, (teacherStreamCount.get(alloc.teacherId) || 0) + 1);
        }
      }
    }

    streamUnits.sort((a, b) => {
      // Primary: total required lessons (busiest first)
      const aTotal = a.subjectAllocations.reduce((s, x) => s + x.lessonsPerWeek, 0);
      const bTotal = b.subjectAllocations.reduce((s, x) => s + x.lessonsPerWeek, 0);
      if (bTotal !== aTotal) return bTotal - aTotal;

      // Secondary: streams with more exclusive teachers first (lower sharing score = schedule first)
      const aSharingScore = a.subjectAllocations.reduce(
        (s, x) => s + (x.teacherId ? (teacherStreamCount.get(x.teacherId) || 1) : 0), 0
      );
      const bSharingScore = b.subjectAllocations.reduce(
        (s, x) => s + (x.teacherId ? (teacherStreamCount.get(x.teacherId) || 1) : 0), 0
      );
      return aSharingScore - bSharingScore;
    });

    let totalSlotsAll = 0;
    let filledSlotsAll = 0;
    let freeSlotsAll = 0;

    const curriculumBreakdown: Record<string, {
      curriculum: string;
      label: string;
      streamCount: number;
      successCount: number;
      strategy: "standard" | "cbe-senior";
    }> = {};

    // 9. Generate for each stream using the appropriate strategy
    for (const unit of streamUnits) {
      const strategy = getStrategy(unit.gradeCurriculum);
      const currKey = unit.gradeCurriculum;

      if (!curriculumBreakdown[currKey]) {
        curriculumBreakdown[currKey] = {
          curriculum: currKey,
          label: CURRICULUM_LABELS[currKey] || currKey.toUpperCase(),
          streamCount: 0,
          successCount: 0,
          strategy,
        };
      }
      curriculumBreakdown[currKey].streamCount++;

      console.log(`Generating [${strategy}] timetable for ${unit.gradeName} ${unit.streamName} (${currKey})`);

      let result: StreamGenerationResult;

      if (strategy === "cbe-senior") {
        result = await generateCBESeniorStreamTimetable(
          unit, globalTeacherTracker, subjectMaxPeriodMap,
          schoolId, termId, academicYearId, conflicts, warnings,
          roomSlotTracker
        );
      } else {
        result = await generateStandardStreamTimetable(
          unit, globalTeacherTracker, subjectMaxPeriodMap,
          schoolId, termId, academicYearId, conflicts, warnings,
          roomSlotTracker
        );
      }

      streamResults.push(result);

      if (result.success) {
        curriculumBreakdown[currKey].successCount++;
        totalSlotsAll += result.coreSlots + result.optionalSlots + result.freeSlots;
        filledSlotsAll += result.coreSlots + result.optionalSlots;
        freeSlotsAll += result.freeSlots;
      }
    }

    const successCount = streamResults.filter((r) => r.success).length;
    const failCount = streamResults.filter((r) => !r.success).length;
    const teachersUsed = Object.values(globalTeacherTracker).filter((t) => t.weeklyCount > 0).length;

    const currBreakdownSummary = Object.values(curriculumBreakdown)
      .map((b) => `${b.label}: ${b.successCount}/${b.streamCount} streams (${b.strategy})`)
      .join("; ");

    return {
      success: successCount > 0,
      message: `Master timetable generated: ${successCount} streams successful, ${failCount} failed. ${currBreakdownSummary}. ${conflicts.length} conflict(s), ${warnings.length} warning(s).`,
      streamResults,
      conflicts,
      warnings,
      preGenerationReport,
      stats: {
        totalStreams: streamUnits.length,
        successfulStreams: successCount,
        failedStreams: failCount,
        totalSlots: totalSlotsAll,
        filledSlots: filledSlotsAll,
        freeSlots: freeSlotsAll,
        teacherUtilization: teachersData?.length ? Math.round((teachersUsed / teachersData.length) * 100) : 0,
      },
      curriculumBreakdown,
    };
  } catch (error: any) {
    console.error("Master timetable generation error:", error);
    return {
      success: false,
      message: `Master timetable generation failed: ${error.message}`,
      streamResults,
      conflicts,
      warnings,
      stats: { totalStreams: 0, successfulStreams: 0, failedStreams: 0, totalSlots: 0, filledSlots: 0, freeSlots: 0, teacherUtilization: 0 },
    };
  }
};
