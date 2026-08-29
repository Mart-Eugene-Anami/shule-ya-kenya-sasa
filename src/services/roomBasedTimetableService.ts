import { supabase } from "@/integrations/supabase/client";
import {
  GenerationConflict,
  EnhancedGenerationResult,
  Pathway,
} from "@/types/timetable";
import { TimetableGenerationOptions, TimetableSlot } from "@/types";
import { getRoomSubjectAllocations, getRoomTeacherAllocations } from "./roomAllocationService";

interface SubjectLessonAllocation {
  subjectId: string;
  subject: string;
  lessonsPerWeek: number;
  isCore: boolean;
  pathway?: Pathway;
  requiresSpecialRoom: boolean;
  specialRoomType?: string;
  teacherId?: string;
  teacherName?: string;
  trackIds?: string[]; // Which tracks this subject belongs to (for split rooms)
}

interface TeacherSlotTracker {
  [teacherId: string]: {
    name: string;
    weeklyCount: number;
    maxPerWeek: number;
    dailyCount: { [day: string]: number };
    scheduledSlots: Set<string>; // "day-period" format
  };
}

const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const emptyStats = {
  totalSlots: 0,
  filledSlots: 0,
  freeSlots: 0,
  coreSubjectSlots: 0,
  optionalSubjectSlots: 0,
  teacherUtilization: 0,
  roomUtilization: 0,
};

function failResult(message: string, conflicts: GenerationConflict[] = [], warnings: string[] = []): EnhancedGenerationResult {
  return { success: false, message, conflicts, stats: emptyStats, warnings };
}

/**
 * Check if two optional subjects can run concurrently in a split room.
 * They CAN be concurrent if:
 * 1. No track contains both subjects (no student takes both)
 * 2. They don't share the same teacher
 */
function canSubjectsRunConcurrently(
  a: SubjectLessonAllocation,
  b: SubjectLessonAllocation,
  trackSubjectMap: Map<string, Set<string>> // trackId -> set of subjectIds
): boolean {
  // Same teacher = can't be concurrent
  if (a.teacherId && b.teacherId && a.teacherId === b.teacherId) return false;

  // Check if any track contains both subjects
  const aTrackIds = a.trackIds || [];
  const bTrackIds = b.trackIds || [];

  for (const trackId of aTrackIds) {
    if (bTrackIds.includes(trackId)) {
      // Both subjects are in the same track - students in that track take both
      // so they can't be concurrent
      return false;
    }
  }

  // Also verify via trackSubjectMap that no track has both subject IDs
  for (const [, subjectIds] of trackSubjectMap) {
    if (subjectIds.has(a.subjectId) && subjectIds.has(b.subjectId)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a subject can be added concurrently to an existing set of concurrent subjects
 */
function canAddToConcurrentGroup(
  candidate: SubjectLessonAllocation,
  existing: SubjectLessonAllocation[],
  trackSubjectMap: Map<string, Set<string>>
): boolean {
  return existing.every(e => canSubjectsRunConcurrently(candidate, e, trackSubjectMap));
}

/**
 * Comprehensive pre-generation validation.
 */
function validateBeforeGeneration(params: {
  days: string[];
  lessonsPerDay: number;
  subjectAllocations: SubjectLessonAllocation[];
  teacherTracker: TeacherSlotTracker;
  gradeName: string;
  streamName: string;
  isSplitRoom: boolean;
  trackSubjectMap: Map<string, Set<string>>;
}): string[] {
  const { days, lessonsPerDay, subjectAllocations, teacherTracker, gradeName, streamName, isSplitRoom, trackSubjectMap } = params;
  const errors: string[] = [];
  const label = `${gradeName} ${streamName}`.trim();

  const totalAvailableSlots = days.length * lessonsPerDay;
  
  // For split rooms with concurrent optionals, effective capacity is higher
  // so we only check core subjects strictly
  const coreSubjects = subjectAllocations.filter(s => s.isCore);
  const optionalSubjects = subjectAllocations.filter(s => !s.isCore);
  
  const totalCoreLessons = coreSubjects.reduce((sum, s) => sum + s.lessonsPerWeek, 0);
  const totalOptionalLessons = optionalSubjects.reduce((sum, s) => sum + s.lessonsPerWeek, 0);

  if (!isSplitRoom) {
    const totalRequired = totalCoreLessons + totalOptionalLessons;
    if (totalRequired > totalAvailableSlots) {
      errors.push(
        `IMPOSSIBLE: ${label} needs ${totalRequired} lessons/week but only ${totalAvailableSlots} slots are available. ` +
        `Reduce lessons per subject or increase lessons per day.`
      );
    }
  } else {
    // In split rooms, concurrent optionals share slots, so only core lessons must fit
    if (totalCoreLessons > totalAvailableSlots) {
      errors.push(
        `IMPOSSIBLE: ${label} needs ${totalCoreLessons} core lessons/week but only ${totalAvailableSlots} slots are available.`
      );
    }
    // Check that optional lessons can fit with concurrency
    const slotsAfterCore = totalAvailableSlots - totalCoreLessons;
    // Calculate minimum slots needed considering concurrency
    // Group optionals by concurrency compatibility
    const concurrencyGroups = buildConcurrencyGroups(optionalSubjects, trackSubjectMap);
    const minOptionalSlots = concurrencyGroups.reduce((max, group) => {
      const groupMax = Math.max(...group.map(s => s.lessonsPerWeek));
      return max + groupMax; // Each group needs at least as many slots as its most frequent subject
    }, 0);
    // This is a rough estimate - the actual scheduling may need fewer
  }

  if (totalCoreLessons + totalOptionalLessons === 0) {
    errors.push(
      `No lessons configured for ${label}. Please assign teachers with lessons per week.`
    );
  }

  // Check each subject has a teacher
  const subjectsWithoutTeachers = subjectAllocations.filter(s => !s.teacherId && s.lessonsPerWeek > 0);
  if (subjectsWithoutTeachers.length > 0) {
    const subjectNames = subjectsWithoutTeachers.map(s => s.subject).join(", ");
    errors.push(
      `Missing teachers: ${subjectNames}. Please assign teachers in the Teacher Allocation tab.`
    );
  }

  // Check teacher capacity
  const teacherLoadMap: Record<string, { name: string; totalRequired: number; maxPerWeek: number; subjects: string[] }> = {};
  for (const alloc of subjectAllocations) {
    if (!alloc.teacherId) continue;
    if (!teacherLoadMap[alloc.teacherId]) {
      const tracker = teacherTracker[alloc.teacherId];
      teacherLoadMap[alloc.teacherId] = {
        name: alloc.teacherName || tracker?.name || "Unknown",
        totalRequired: 0,
        maxPerWeek: tracker?.maxPerWeek || 30,
        subjects: [],
      };
    }
    teacherLoadMap[alloc.teacherId].totalRequired += alloc.lessonsPerWeek;
    teacherLoadMap[alloc.teacherId].subjects.push(`${alloc.subject} (${alloc.lessonsPerWeek})`);
  }

  for (const [, load] of Object.entries(teacherLoadMap)) {
    if (load.totalRequired > load.maxPerWeek) {
      errors.push(
        `Teacher overloaded: ${load.name} is assigned ${load.totalRequired} lessons/week ` +
        `(${load.subjects.join(", ")}) but max is ${load.maxPerWeek}.`
      );
    }
  }

  return errors;
}

/**
 * Group optional subjects by mutual exclusivity for concurrency.
 * Subjects that CAN run concurrently are in the same group.
 * Returns groups where all subjects within a group are pairwise compatible.
 */
function buildConcurrencyGroups(
  optionalSubjects: SubjectLessonAllocation[],
  trackSubjectMap: Map<string, Set<string>>
): SubjectLessonAllocation[][] {
  const groups: SubjectLessonAllocation[][] = [];
  const assigned = new Set<string>();

  for (const subject of optionalSubjects) {
    if (assigned.has(subject.subjectId)) continue;

    // Try to add to an existing group
    let addedToGroup = false;
    for (const group of groups) {
      if (canAddToConcurrentGroup(subject, group, trackSubjectMap)) {
        group.push(subject);
        assigned.add(subject.subjectId);
        addedToGroup = true;
        break;
      }
    }

    if (!addedToGroup) {
      groups.push([subject]);
      assigned.add(subject.subjectId);
    }
  }

  return groups;
}

/**
 * Room-based timetable generation with concurrent optional subject support for split rooms.
 */
export const generateRoomBasedTimetable = async (
  options: TimetableGenerationOptions
): Promise<EnhancedGenerationResult> => {
  const conflicts: GenerationConflict[] = [];
  const warnings: string[] = [];

  try {
    console.log("Starting room-based timetable generation:", options);

    if (!options.schoolId || !options.gradeId || !options.streamId || !options.termId || !options.academicYearId) {
      return failResult("Missing required fields: Please ensure School, Grade, Stream, Term, and Academic Year are all selected.");
    }

    const config = options.config || {
      startTime: "08:20",
      lessonDurationMinutes: 40,
      lessonsPerDay: 8,
      breaks: [],
      subjectLessons: [],
    };

    const DAYS = config.schoolDays && config.schoolDays.length > 0 ? config.schoolDays : DEFAULT_DAYS;
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const invalidDays = DAYS.filter(d => !validDays.includes(d));
    if (invalidDays.length > 0) return failResult(`Invalid school days: ${invalidDays.join(", ")}`);
    if (DAYS.length < 1) return failResult("At least one school day must be configured.");

    // Fetch grade info
    const { data: gradeData, error: gradeError } = await supabase
      .from("grades")
      .select("name, curriculum")
      .eq("id", options.gradeId)
      .single();
    if (gradeError || !gradeData) return failResult("Could not find the selected grade.");

    const gradeName = gradeData.name || "";
    const gradeCurriculum = gradeData.curriculum || "cbc";

    // Fetch stream info
    const { data: streamData, error: streamError } = await supabase
      .from("streams")
      .select("name")
      .eq("id", options.streamId)
      .single();
    if (streamError || !streamData) return failResult("Could not find the selected stream.");
    const streamName = streamData.name || "";

    // Find the room for this grade-stream
    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("school_id", options.schoolId)
      .eq("grade_id", options.gradeId)
      .eq("stream_id", options.streamId)
      .maybeSingle();

    if (!roomData) {
      return failResult(
        `No room found for ${gradeName} ${streamName}. Please go to the Rooms tab and generate rooms first.`
      );
    }

    // Determine if this is a CBE Senior split room
    const isCBESenior = gradeCurriculum === "cbc-senior";
    const roomTrackIds: string[] = roomData.track_ids || (roomData.track_id ? [roomData.track_id] : []);
    const isSplitRoom = isCBESenior && roomTrackIds.length > 1 && (roomData.room_mode === "split");

    // Fetch track data for split room analysis
    let trackSubjectMap = new Map<string, Set<string>>(); // trackId -> set of subjectIds
    let trackStudentCounts = new Map<string, number>(); // trackId -> student count
    let subjectTrackMembership = new Map<string, string[]>(); // subjectId -> trackIds that contain it

    if (isCBESenior && roomTrackIds.length > 0) {
      // Fetch tracks
      const { data: tracksData } = await supabase
        .from("cbc_senior_tracks")
        .select("id, name, subject_ids")
        .in("id", roomTrackIds);

      (tracksData || []).forEach(track => {
        const subjectIds = new Set<string>(track.subject_ids || []);
        trackSubjectMap.set(track.id, subjectIds);
        
        // Build reverse mapping: subject -> tracks
        subjectIds.forEach(sid => {
          const existing = subjectTrackMembership.get(sid) || [];
          existing.push(track.id);
          subjectTrackMembership.set(sid, existing);
        });
      });

      // Fetch student counts per track for this grade
      const { data: studentData } = await supabase
        .from("students")
        .select("track_id")
        .eq("school_id", options.schoolId)
        .eq("grade_id", options.gradeId)
        .eq("status", "active")
        .in("track_id", roomTrackIds);

      (studentData || []).forEach(s => {
        if (s.track_id) {
          trackStudentCounts.set(s.track_id, (trackStudentCounts.get(s.track_id) || 0) + 1);
        }
      });

      if (isSplitRoom) {
        const trackNames = (tracksData || []).map(t => t.name).join(", ");
        const totalStudents = Array.from(trackStudentCounts.values()).reduce((a, b) => a + b, 0);
        warnings.push(
          `Split room detected: ${roomData.name} contains tracks [${trackNames}] with ${totalStudents} total students. ` +
          `Non-conflicting optional subjects will be scheduled concurrently where possible.`
        );
      }
    }

    // Get subject allocations for this room
    const roomSubjectAllocations = await getRoomSubjectAllocations(roomData.id, options.academicYearId);
    if (roomSubjectAllocations.length === 0) {
      return failResult(
        `No subjects allocated to ${gradeName} ${streamName} (Room: ${roomData.name}). ` +
        `Please assign subjects in the Subject Allocation tab.`
      );
    }

    // Get teacher allocations
    const roomTeacherAllocations = await getRoomTeacherAllocations(roomData.id, options.academicYearId);
    const subjectTeacherMap: Record<string, { teacherId: string; teacherName?: string; lessonsPerWeek: number }> = {};
    roomTeacherAllocations.forEach((alloc) => {
      subjectTeacherMap[alloc.subjectId] = {
        teacherId: alloc.teacherId,
        teacherName: alloc.teacherName,
        lessonsPerWeek: alloc.lessonsPerWeek,
      };
    });

    // Fetch subject details
    const subjectIds = roomSubjectAllocations.map((a) => a.subjectId);
    const { data: subjectsData } = await supabase.from("subjects").select("*").in("id", subjectIds);
    const subjectMap = new Map((subjectsData || []).map((s) => [s.id, s]));

    // Build subject allocations with track membership
    // Key rule for split rooms: if a subject appears in MULTIPLE tracks within this room,
    // it's effectively a "core" subject for that room (all students take it together with one teacher).
    // Only subjects exclusive to a single track are truly optional and eligible for concurrent scheduling.
    const subjectAllocations: SubjectLessonAllocation[] = roomSubjectAllocations.map((alloc) => {
      const subject = subjectMap.get(alloc.subjectId);
      const teacherAlloc = subjectTeacherMap[alloc.subjectId];
      const configuredLessons = config.subjectLessons.find((sl) => sl.subject === subject?.name);
      const memberTrackIds = (subjectTrackMembership.get(alloc.subjectId) || [])
        .filter(tid => roomTrackIds.includes(tid)); // Only consider tracks in THIS room

      // A subject in multiple tracks within this room is shared/core for this room
      const isSharedAcrossTracks = isSplitRoom && memberTrackIds.length > 1;
      const effectiveIsCore = alloc.isCore || isSharedAcrossTracks;

      return {
        subjectId: alloc.subjectId,
        subject: alloc.subjectName || subject?.name || "Unknown",
        lessonsPerWeek: teacherAlloc?.lessonsPerWeek || configuredLessons?.lessonsPerWeek || 4,
        isCore: effectiveIsCore,
        pathway: subject?.pathway as Pathway | undefined,
        requiresSpecialRoom: subject?.requires_special_room || false,
        specialRoomType: subject?.special_room_type,
        teacherId: teacherAlloc?.teacherId,
        teacherName: teacherAlloc?.teacherName,
        trackIds: memberTrackIds,
      };
    });

    if (isSplitRoom) {
      const sharedSubjects = subjectAllocations.filter(s => s.isCore && !roomSubjectAllocations.find(a => a.subjectId === s.subjectId)?.isCore);
      if (sharedSubjects.length > 0) {
        const names = sharedSubjects.map(s => s.subject).join(", ");
        warnings.push(
          `Shared across tracks (scheduled as core): ${names}. ` +
          `These subjects appear in multiple tracks in this room, so all students attend together.`
        );
      }
    }

    const coreSubjects = subjectAllocations.filter((s) => s.isCore);
    const optionalSubjects = subjectAllocations.filter((s) => !s.isCore);

    // Fetch teachers
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, name, max_lessons_per_week")
      .eq("school_id", options.schoolId)
      .eq("status", "active");

    const teacherTracker: TeacherSlotTracker = {};
    (teachersData || []).forEach((t) => {
      teacherTracker[t.id] = {
        name: t.name,
        weeklyCount: 0,
        maxPerWeek: t.max_lessons_per_week || 30,
        dailyCount: {},
        scheduledSlots: new Set(),
      };
      DAYS.forEach((d) => { teacherTracker[t.id].dailyCount[d] = 0; });
    });

    // ==========================================
    // PRE-GENERATION VALIDATION
    // ==========================================
    const validationErrors = validateBeforeGeneration({
      days: DAYS,
      lessonsPerDay: config.lessonsPerDay,
      subjectAllocations,
      teacherTracker,
      gradeName,
      streamName,
      isSplitRoom,
      trackSubjectMap,
    });

    if (validationErrors.length > 0) {
      return failResult(
        `Cannot generate timetable for ${gradeName} ${streamName}:\n\n` +
        validationErrors.map((e, i) => `${i + 1}. ${e}`).join("\n\n"),
        [],
        validationErrors
      );
    }

    // Warning checks
    const totalAvailableSlots = DAYS.length * config.lessonsPerDay;
    const totalRequiredLessons = subjectAllocations.reduce((sum, s) => sum + s.lessonsPerWeek, 0);

    if (!isSplitRoom) {
      const freePeriodsExpected = totalAvailableSlots - totalRequiredLessons;
      if (freePeriodsExpected > totalAvailableSlots * 0.4) {
        warnings.push(
          `${freePeriodsExpected} free periods out of ${totalAvailableSlots} total slots. Consider adding more subjects.`
        );
      }
    }

    // Calculate time slots
    const [startHour, startMinute] = config.startTime.split(":").map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    const periodTimes: Array<{ period: number; startTime: string; endTime: string }> = [];
    for (let period = 1; period <= config.lessonsPerDay; period++) {
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}:00`;
      currentMinutes += config.lessonDurationMinutes;
      const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}:00`;
      periodTimes.push({ period, startTime, endTime });
      const breakAfter = config.breaks.find((b) => b.afterPeriod === period);
      if (breakAfter) currentMinutes += breakAfter.durationMinutes;
    }

    // ==========================================
    // TIMETABLE MATRIX - supports concurrent subjects per slot
    // Each slot can hold multiple non-conflicting optional subjects
    // ==========================================
    const timetableMatrix: Map<string, SubjectLessonAllocation[]> = new Map();

    for (const day of DAYS) {
      for (let period = 1; period <= config.lessonsPerDay; period++) {
        timetableMatrix.set(`${day}-${period}`, []);
      }
    }

    // Helper: check if a slot has a core subject (core occupies full slot)
    const slotHasCore = (slotKey: string): boolean => {
      const allocs = timetableMatrix.get(slotKey) || [];
      return allocs.some(a => a.isCore);
    };

    // Helper: check if teacher is available at a slot
    const isTeacherAvailable = (teacherId: string, day: string, period: number): boolean => {
      if (!teacherId || !teacherTracker[teacherId]) return true;
      const tracker = teacherTracker[teacherId];
      if (tracker.scheduledSlots.has(`${day}-${period}`)) return false;
      if (tracker.weeklyCount >= tracker.maxPerWeek) return false;
      return true;
    };

    // Helper: mark teacher as scheduled
    const markTeacherScheduled = (teacherId: string, day: string, period: number) => {
      if (!teacherId || !teacherTracker[teacherId]) return;
      teacherTracker[teacherId].weeklyCount++;
      teacherTracker[teacherId].dailyCount[day]++;
      teacherTracker[teacherId].scheduledSlots.add(`${day}-${period}`);
    };

    // ==========================================
    // PHASE 1: Allocate core subjects (occupy full slot)
    // ==========================================
    const corePool = coreSubjects.map((s) => ({ allocation: s, remaining: s.lessonsPerWeek }));

    for (const item of corePool) {
      let allocated = 0;
      const targetPerDay = Math.ceil(item.allocation.lessonsPerWeek / DAYS.length);

      for (const day of DAYS) {
        let allocatedToday = 0;

        for (let period = 1; period <= config.lessonsPerDay && allocated < item.allocation.lessonsPerWeek; period++) {
          const slotKey = `${day}-${period}`;
          const existing = timetableMatrix.get(slotKey) || [];

          // Core needs an empty slot
          if (existing.length > 0) continue;

          if (item.allocation.teacherId && !isTeacherAvailable(item.allocation.teacherId, day, period)) {
            if (teacherTracker[item.allocation.teacherId]?.weeklyCount >= teacherTracker[item.allocation.teacherId]?.maxPerWeek) {
              conflicts.push({
                type: "teacher_overload",
                message: `${teacherTracker[item.allocation.teacherId]?.name || "Teacher"} max lessons reached for ${item.allocation.subject}.`,
                details: { day, period, subject: item.allocation.subject, teacherId: item.allocation.teacherId },
              });
            }
            continue;
          }

          timetableMatrix.set(slotKey, [item.allocation]);
          allocated++;
          allocatedToday++;
          item.remaining--;

          if (item.allocation.teacherId) markTeacherScheduled(item.allocation.teacherId, day, period);
          if (allocatedToday >= targetPerDay) break;
        }
      }

      if (item.remaining > 0) {
        warnings.push(
          `Could not allocate all lessons for ${item.allocation.subject}: ${item.remaining} of ${item.allocation.lessonsPerWeek} unplaced.`
        );
      }
    }

    // ==========================================
    // PHASE 2: Allocate optional subjects
    // For split rooms, non-conflicting subjects can share slots
    // ==========================================
    const optionalPool = optionalSubjects.map((s) => ({ allocation: s, remaining: s.lessonsPerWeek }));

    if (isSplitRoom) {
      // Build concurrency groups: subjects that can run together
      // Use greedy approach: for each optional subject, try to place it
      // either in an empty slot or concurrently with compatible subjects
      
      // Sort optionals by lessons needed (descending) to place hardest first
      optionalPool.sort((a, b) => b.allocation.lessonsPerWeek - a.allocation.lessonsPerWeek);

      for (const item of optionalPool) {
        let allocated = 0;

        for (const day of DAYS) {
          for (let period = 1; period <= config.lessonsPerDay && allocated < item.allocation.lessonsPerWeek; period++) {
            const slotKey = `${day}-${period}`;
            const existing = timetableMatrix.get(slotKey) || [];

            // Can't place in a core slot
            if (slotHasCore(slotKey)) continue;

            // Check teacher availability
            if (item.allocation.teacherId && !isTeacherAvailable(item.allocation.teacherId, day, period)) {
              continue;
            }

            if (existing.length === 0) {
              // Empty slot - place directly
              timetableMatrix.set(slotKey, [item.allocation]);
              allocated++;
              item.remaining--;
              if (item.allocation.teacherId) markTeacherScheduled(item.allocation.teacherId, day, period);
            } else {
              // Slot has optional subjects - check if we can add concurrently
              const existingOptionals = existing.filter(a => !a.isCore);
              if (canAddToConcurrentGroup(item.allocation, existingOptionals, trackSubjectMap)) {
                existing.push(item.allocation);
                timetableMatrix.set(slotKey, existing);
                allocated++;
                item.remaining--;
                if (item.allocation.teacherId) markTeacherScheduled(item.allocation.teacherId, day, period);
              }
            }
          }
        }

        if (item.remaining > 0) {
          // Second pass: try harder to find concurrent slots
          for (const day of DAYS) {
            for (let period = 1; period <= config.lessonsPerDay && item.remaining > 0; period++) {
              const slotKey = `${day}-${period}`;
              const existing = timetableMatrix.get(slotKey) || [];

              if (slotHasCore(slotKey)) continue;
              if (existing.some(a => a.subjectId === item.allocation.subjectId)) continue; // already placed here

              if (item.allocation.teacherId && !isTeacherAvailable(item.allocation.teacherId, day, period)) continue;

              if (existing.length > 0) {
                const existingOptionals = existing.filter(a => !a.isCore);
                if (canAddToConcurrentGroup(item.allocation, existingOptionals, trackSubjectMap)) {
                  existing.push(item.allocation);
                  timetableMatrix.set(slotKey, existing);
                  item.remaining--;
                  if (item.allocation.teacherId) markTeacherScheduled(item.allocation.teacherId, day, period);
                }
              }
            }
          }

          if (item.remaining > 0) {
            warnings.push(
              `Could not allocate all lessons for optional subject ${item.allocation.subject}: ` +
              `${item.remaining} of ${item.allocation.lessonsPerWeek} unplaced. ` +
              `This may be due to teacher conflicts or clashing track memberships.`
            );
          }
        }
      }
    } else {
      // Non-split room: standard sequential allocation
      for (const item of optionalPool) {
        let allocated = 0;

        for (const day of DAYS) {
          for (let period = 1; period <= config.lessonsPerDay && allocated < item.allocation.lessonsPerWeek; period++) {
            const slotKey = `${day}-${period}`;
            const existing = timetableMatrix.get(slotKey) || [];

            if (existing.length > 0) continue;

            if (item.allocation.teacherId && !isTeacherAvailable(item.allocation.teacherId, day, period)) {
              continue;
            }

            timetableMatrix.set(slotKey, [item.allocation]);
            allocated++;
            item.remaining--;

            if (item.allocation.teacherId) markTeacherScheduled(item.allocation.teacherId, day, period);
          }
        }

        if (item.remaining > 0) {
          warnings.push(
            `Could not allocate all lessons for optional subject ${item.allocation.subject}: ` +
            `${item.remaining} of ${item.allocation.lessonsPerWeek} unplaced.`
          );
        }
      }
    }

    // Check completely unallocated core subjects
    const completelyUnallocated = corePool.filter(
      (item) => item.remaining === item.allocation.lessonsPerWeek && item.allocation.lessonsPerWeek > 0
    );
    if (completelyUnallocated.length > 0) {
      const names = completelyUnallocated.map((i) => i.allocation.subject).join(", ");
      return failResult(
        `Failed to schedule any lessons for core subjects: ${names}. Check teacher assignments and workload.`,
        conflicts,
        warnings
      );
    }

    // Delete existing timetable if regenerating
    const { data: existingTimetables } = await supabase
      .from("timetables")
      .select("id")
      .eq("school_id", options.schoolId)
      .eq("grade_id", options.gradeId)
      .eq("stream_id", options.streamId)
      .eq("term_id", options.termId)
      .eq("academic_year_id", options.academicYearId);

    if (existingTimetables && existingTimetables.length > 0) {
      if (!options.regenerate) {
        return failResult(`A timetable already exists for ${gradeName} ${streamName}. Use Regenerate to replace it.`);
      }
      for (const tt of existingTimetables) {
        await supabase.from("timetable_slots").delete().eq("timetable_id", tt.id);
        await supabase.from("timetables").delete().eq("id", tt.id);
      }
    }

    // Create new timetable
    const { data: newTimetable, error: timetableError } = await supabase
      .from("timetables")
      .insert({
        school_id: options.schoolId,
        grade_id: options.gradeId,
        stream_id: options.streamId,
        term_id: options.termId,
        academic_year_id: options.academicYearId,
        version: 1,
        is_active: true,
      })
      .select()
      .single();

    if (timetableError) throw new Error(`Database error: ${timetableError.message}`);

    // ==========================================
    // BUILD SLOTS - concurrent subjects get separate rows
    // ==========================================
    const slots: Array<{
      timetable_id: string;
      day: string;
      period: number;
      start_time: string;
      end_time: string;
      subject: string;
      teacher_id: string | null;
      room_id: string;
      is_free_period: boolean;
      is_optional_subject: boolean;
      pathway: string | null;
    }> = [];

    let coreSlots = 0;
    let optionalSlots = 0;
    let freeSlots = 0;
    let concurrentSlotPairs = 0;

    for (const day of DAYS) {
      for (let periodIdx = 0; periodIdx < periodTimes.length; periodIdx++) {
        const periodTime = periodTimes[periodIdx];
        const slotKey = `${day}-${periodTime.period}`;
        const allocations = timetableMatrix.get(slotKey) || [];

        if (allocations.length === 0) {
          slots.push({
            timetable_id: newTimetable.id,
            day,
            period: periodTime.period,
            start_time: periodTime.startTime,
            end_time: periodTime.endTime,
            subject: "Free Period",
            teacher_id: null,
            room_id: roomData.id,
            is_free_period: true,
            is_optional_subject: false,
            pathway: null,
          });
          freeSlots++;
        } else {
          // Each allocation gets its own slot row (concurrent subjects = multiple rows same period)
          if (allocations.length > 1) concurrentSlotPairs++;

          for (const allocation of allocations) {
            slots.push({
              timetable_id: newTimetable.id,
              day,
              period: periodTime.period,
              start_time: periodTime.startTime,
              end_time: periodTime.endTime,
              subject: allocation.subject,
              teacher_id: allocation.teacherId || null,
              room_id: roomData.id,
              is_free_period: false,
              is_optional_subject: !allocation.isCore,
              pathway: allocation.pathway || null,
            });

            if (allocation.isCore) coreSlots++;
            else optionalSlots++;
          }
        }
      }
    }

    // Insert slots
    const { error: slotsError } = await supabase.from("timetable_slots").insert(slots);
    if (slotsError) {
      await supabase.from("timetables").delete().eq("id", newTimetable.id);
      throw new Error(`Database error creating slots: ${slotsError.message}`);
    }

    // Calculate stats
    const filledSlots = slots.filter((s) => !s.is_free_period).length;
    const teachersUsed = new Set(slots.filter((s) => s.teacher_id).map((s) => s.teacher_id)).size;

    let successMessage = `Timetable generated for ${gradeName} ${streamName}: ` +
      `${coreSlots} core, ${optionalSlots} optional, ${freeSlots} free periods across ${DAYS.length} days.`;

    if (concurrentSlotPairs > 0) {
      successMessage += ` ${concurrentSlotPairs} time slots have concurrent optional subjects.`;
    }
    if (warnings.length > 0) successMessage += ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})`;
    if (conflicts.length > 0) successMessage += ` (${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""})`;

    return {
      success: true,
      message: successMessage,
      timetableId: newTimetable.id,
      conflicts,
      stats: {
        totalSlots: DAYS.length * config.lessonsPerDay, // logical slots (not DB rows)
        filledSlots,
        freeSlots,
        coreSubjectSlots: coreSlots,
        optionalSubjectSlots: optionalSlots,
        teacherUtilization: teachersData?.length ? Math.round((teachersUsed / teachersData.length) * 100) : 0,
        roomUtilization: Math.round(((DAYS.length * config.lessonsPerDay - freeSlots) / (DAYS.length * config.lessonsPerDay)) * 100),
      },
      warnings,
    };
  } catch (error: any) {
    console.error("Room-based timetable generation error:", error);
    return failResult(
      `Timetable generation failed: ${error.message || "An unexpected error occurred."}`,
      conflicts,
      warnings
    );
  }
};
