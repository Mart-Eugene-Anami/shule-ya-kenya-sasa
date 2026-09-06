/**
 * CBE Senior timetable generation strategy.
 * 
 * Key differences from standard strategy:
 * 1. Track/pathway-based scheduling — optional subjects are grouped by pathway
 * 2. Full vs Split room modes:
 *    - Full rooms: dedicated to one track, scheduled like standard
 *    - Split rooms: accommodate multiple tracks, allow concurrent optional subjects
 * 3. Concurrent scheduling: In split rooms, two optional subjects from different
 *    pathways can run in the same period if they have different teachers and
 *    no student overlap (no track contains both subjects)
 * 4. Effective core promotion: subjects shared across ALL tracks in a split room
 *    are temporarily promoted to core status for scheduling purposes
 * 5. Cross-track conflict detection
 * 6. Cross-division teacher conflict detection — teachers shared with other
 *    divisions (e.g. primary) are tracked globally via time ranges
 */

import { supabase } from "@/integrations/supabase/client";
import { GenerationConflict, Pathway } from "@/types/timetable";
import {
  TeacherSlotTracker,
  StreamGenerationUnit,
  StreamGenerationResult,
  SubjectLessonAllocation,
  TimetableSlotInsert,
  PeriodTimeInfo,
  TimeRange,
  RoomSlotTracker,
  calculatePeriodTimes,
  getEffectiveDays,
  allocateCoreSubjects,
  isTeacherFreeAt,
  findTeacherConflict,
  recordTeacherUsage,
  isRoomFreeAt,
  markRoomBusy,
} from "./commonTimetableUtils";

interface TrackSubjectInfo {
  trackId: string;
  trackName: string;
  pathway: string;
  subjectIds: string[];
}

/**
 * Determine which optional subjects are "effective core" — present in ALL tracks of a split room.
 */
function findEffectiveCoreSubjects(
  optionalAllocations: SubjectLessonAllocation[],
  tracks: TrackSubjectInfo[]
): Set<string> {
  if (tracks.length <= 1) return new Set();

  const effectiveCore = new Set<string>();
  for (const alloc of optionalAllocations) {
    const inAllTracks = tracks.every((track) =>
      track.subjectIds.includes(alloc.subjectId)
    );
    if (inAllTracks) {
      effectiveCore.add(alloc.subjectId);
    }
  }
  return effectiveCore;
}

/**
 * Check if two subjects have student overlap — i.e. any student is enrolled in both.
 * First checks track-based overlap, then (for accuracy) checks actual student enrollment
 * via the studentSubjectMap if provided.
 */
function hasStudentOverlap(
  subjectIdA: string,
  subjectIdB: string,
  tracks: TrackSubjectInfo[],
  studentSubjectMap?: Map<string, Set<string>>
): boolean {
  // If we have actual student enrollment data, use it for precise detection
  if (studentSubjectMap && studentSubjectMap.size > 0) {
    for (const [, subjectIds] of studentSubjectMap) {
      if (subjectIds.has(subjectIdA) && subjectIds.has(subjectIdB)) {
        return true;
      }
    }
    return false;
  }

  // Fallback: track-based overlap (a track contains both subjects)
  return tracks.some(
    (track) =>
      track.subjectIds.includes(subjectIdA) &&
      track.subjectIds.includes(subjectIdB)
  );
}

/**
 * Group optional subjects by pathway for block scheduling.
 */
function groupByPathway(
  allocations: SubjectLessonAllocation[]
): Map<string, SubjectLessonAllocation[]> {
  const groups = new Map<string, SubjectLessonAllocation[]>();
  for (const alloc of allocations) {
    const pathway = alloc.pathway || "general";
    if (!groups.has(pathway)) groups.set(pathway, []);
    groups.get(pathway)!.push(alloc);
  }
  return groups;
}

/**
 * Generate timetable for a CBE Senior stream.
 * Handles both Full and Split room modes.
 */
export async function generateCBESeniorStreamTimetable(
  unit: StreamGenerationUnit,
  globalTracker: TeacherSlotTracker,
  subjectMaxPeriodMap: Record<string, number>,
  schoolId: string,
  termId: string,
  academicYearId: string,
  conflicts: GenerationConflict[],
  warnings: string[],
  roomTracker?: RoomSlotTracker
): Promise<StreamGenerationResult> {
  const DAYS = getEffectiveDays(unit);
  const label = `${unit.gradeName} ${unit.streamName}`;
  const isSplitRoom = unit.roomMode === "split";

  const periodTimes = calculatePeriodTimes(
    unit.config.startTime,
    unit.config.lessonDurationMinutes,
    unit.config.lessonsPerDay,
    unit.config.breaks
  );

  // Fetch track info for this room if it's a split room
  let tracks: TrackSubjectInfo[] = [];
  // Map of studentId -> Set<subjectId> for precise overlap detection
  let studentSubjectMap = new Map<string, Set<string>>();

  if (isSplitRoom && unit.trackIds && unit.trackIds.length > 0) {
    const { data: trackData } = await supabase
      .from("cbc_senior_tracks")
      .select("id, name, pathway, subject_ids")
      .in("id", unit.trackIds);

    tracks = (trackData || []).map((t) => ({
      trackId: t.id,
      trackName: t.name,
      pathway: t.pathway,
      subjectIds: (t.subject_ids || []) as string[],
    }));

    // Fetch actual students enrolled in this stream's tracks for precise overlap detection
    const { data: trackStudents } = await supabase
      .from("students")
      .select("id, track_id")
      .eq("stream_id", unit.streamId)
      .eq("status", "active")
      .in("track_id", unit.trackIds);

    if (trackStudents && trackStudents.length > 0) {
      for (const student of trackStudents) {
        const track = tracks.find((t) => t.trackId === student.track_id);
        if (track) {
          studentSubjectMap.set(student.id, new Set(track.subjectIds));
        }
      }
    }
  }

  // Separate core and optional
  const coreAllocations = unit.subjectAllocations.filter((s) => s.isCore);
  const optionalAllocations = unit.subjectAllocations.filter((s) => !s.isCore);

  // For split rooms, find "effective core" subjects (in all tracks)
  const effectiveCoreIds = isSplitRoom
    ? findEffectiveCoreSubjects(optionalAllocations, tracks)
    : new Set<string>();

  // Move effective core subjects from optional to core pool
  const promotedCore = optionalAllocations.filter((a) => effectiveCoreIds.has(a.subjectId));
  const remainingOptional = optionalAllocations.filter((a) => !effectiveCoreIds.has(a.subjectId));

  if (promotedCore.length > 0) {
    warnings.push(
      `${label}: ${promotedCore.map((s) => s.subject).join(", ")} promoted to effective core (shared across all tracks in split room).`
    );
  }

  const allCorePool = [...coreAllocations, ...promotedCore].map((s) => ({
    allocation: { ...s, isCore: true },
    remaining: s.lessonsPerWeek,
  }));

  // Create timetable matrix
  const timetableMatrix: Map<string, SubjectLessonAllocation | null> = new Map();
  const concurrentSlots: Map<string, SubjectLessonAllocation> = new Map();

  for (const day of DAYS) {
    for (let period = 1; period <= unit.config.lessonsPerDay; period++) {
      timetableMatrix.set(`${day}-${period}`, null);
    }
  }

  // 1. Schedule core subjects (cross-division aware)
  allocateCoreSubjects(
    allCorePool, timetableMatrix, DAYS, unit.config.lessonsPerDay,
    periodTimes, globalTracker, subjectMaxPeriodMap, label, unit.gradeCurriculum, conflicts, warnings,
    unit.roomId, roomTracker
  );

  // 2. Schedule optional subjects with pathway-aware logic
  if (isSplitRoom && tracks.length > 1) {
    allocateSplitRoomOptionals(
      remainingOptional, timetableMatrix, concurrentSlots,
      DAYS, unit.config.lessonsPerDay, periodTimes,
      globalTracker, subjectMaxPeriodMap, tracks, studentSubjectMap,
      label, unit.gradeCurriculum, conflicts, warnings
    );
  } else {
    allocatePathwayOptionals(
      remainingOptional, timetableMatrix,
      DAYS, unit.config.lessonsPerDay, periodTimes,
      globalTracker, subjectMaxPeriodMap,
      label, unit.gradeCurriculum, warnings
    );
  }

  // 3. Create timetable record
  const { data: newTimetable, error: timetableError } = await supabase
    .from("timetables")
    .insert({
      school_id: schoolId,
      grade_id: unit.gradeId,
      stream_id: unit.streamId,
      term_id: termId,
      academic_year_id: academicYearId,
      version: 1,
      is_active: true,
    })
    .select()
    .single();

  if (timetableError) {
    return {
      gradeName: unit.gradeName,
      streamName: unit.streamName,
      success: false,
      message: `Database error: ${timetableError.message}`,
      coreSlots: 0,
      optionalSlots: 0,
      freeSlots: 0,
    };
  }

  // 4. Build slots including concurrent subjects
  const slots: TimetableSlotInsert[] = [];
  let coreSlots = 0;
  let optionalSlots = 0;
  let freeSlots = 0;

  for (const day of DAYS) {
    for (const periodTime of periodTimes) {
      const slotKey = `${day}-${periodTime.period}`;
      const allocation = timetableMatrix.get(slotKey);
      const concurrent = concurrentSlots.get(slotKey);

      if (!allocation) {
        slots.push({
          timetable_id: newTimetable.id,
          day,
          period: periodTime.period,
          start_time: periodTime.startTime,
          end_time: periodTime.endTime,
          subject: "Free Period",
          teacher_id: null,
          room_id: unit.roomId,
          is_free_period: true,
          is_optional_subject: false,
          pathway: null,
        });
        freeSlots++;
      } else {
        slots.push({
          timetable_id: newTimetable.id,
          day,
          period: periodTime.period,
          start_time: periodTime.startTime,
          end_time: periodTime.endTime,
          subject: allocation.subject,
          teacher_id: allocation.teacherId || null,
          room_id: unit.roomId,
          is_free_period: false,
          is_optional_subject: !allocation.isCore,
          pathway: allocation.pathway || null,
        });
        if (allocation.isCore) coreSlots++;
        else optionalSlots++;

        if (concurrent) {
          slots.push({
            timetable_id: newTimetable.id,
            day,
            period: periodTime.period,
            start_time: periodTime.startTime,
            end_time: periodTime.endTime,
            subject: concurrent.subject,
            teacher_id: concurrent.teacherId || null,
            room_id: unit.roomId,
            is_free_period: false,
            is_optional_subject: true,
            pathway: concurrent.pathway || null,
          });
          optionalSlots++;
        }
      }
    }
  }

  const { error: slotsError } = await supabase.from("timetable_slots").insert(slots);

  if (slotsError) {
    await supabase.from("timetables").delete().eq("id", newTimetable.id);
    return {
      gradeName: unit.gradeName,
      streamName: unit.streamName,
      success: false,
      message: `Failed to insert slots: ${slotsError.message}`,
      coreSlots: 0,
      optionalSlots: 0,
      freeSlots: 0,
    };
  }

  const concurrentCount = concurrentSlots.size;
  return {
    gradeName: unit.gradeName,
    streamName: unit.streamName,
    timetableId: newTimetable.id,
    success: true,
    message: `${coreSlots} core, ${optionalSlots} optional (${concurrentCount} concurrent), ${freeSlots} free`,
    coreSlots,
    optionalSlots,
    freeSlots,
  };
}

/**
 * Allocate optional subjects in a SPLIT room with concurrent scheduling.
 * Cross-division teacher conflicts are detected and reported.
 */
function allocateSplitRoomOptionals(
  optionals: SubjectLessonAllocation[],
  timetableMatrix: Map<string, SubjectLessonAllocation | null>,
  concurrentSlots: Map<string, SubjectLessonAllocation>,
  days: string[],
  lessonsPerDay: number,
  periodTimes: PeriodTimeInfo[],
  globalTracker: TeacherSlotTracker,
  subjectMaxPeriodMap: Record<string, number>,
  tracks: TrackSubjectInfo[],
  studentSubjectMap: Map<string, Set<string>>,
  label: string,
  curriculum: string,
  conflicts: GenerationConflict[],
  warnings: string[]
): void {
  const pools = optionals.map((s) => ({ allocation: s, remaining: s.lessonsPerWeek }));

  for (const item of pools) {
    let allocated = 0;

    for (const day of days) {
      for (let period = 1; period <= lessonsPerDay && allocated < item.allocation.lessonsPerWeek; period++) {
        const slotKey = `${day}-${period}`;

        const maxPeriod = subjectMaxPeriodMap[item.allocation.subject];
        if (maxPeriod !== undefined && period > maxPeriod) continue;

        const periodTimeInfo = periodTimes.find((pt) => pt.period === period)!;
        const slotTimeRange: TimeRange = {
          startMinutes: periodTimeInfo.startMinutes,
          endMinutes: periodTimeInfo.endMinutes,
        };

        // Check teacher availability (cross-division aware)
        if (item.allocation.teacherId) {
          const tracker = globalTracker[item.allocation.teacherId];
          if (tracker) {
            if (!isTeacherFreeAt(tracker, day, slotTimeRange)) {
              const conflictSlot = findTeacherConflict(tracker, day, slotTimeRange);
              if (conflictSlot && conflictSlot.sourceCurriculum !== curriculum) {
                conflicts.push({
                  type: "teacher_overload",
                  message: `${tracker.name} unavailable for ${item.allocation.subject} in ${label} on ${day} P${period} — teaching in ${conflictSlot.sourceLabel} (${conflictSlot.sourceCurriculum} division).`,
                  details: { day, period, subject: item.allocation.subject, teacherId: item.allocation.teacherId },
                });
              }
              continue;
            }
            if (tracker.weeklyCount >= tracker.maxPerWeek) continue;
          }
        }

        const existingAllocation = timetableMatrix.get(slotKey);
        const existingConcurrent = concurrentSlots.get(slotKey);

        if (existingAllocation === null) {
          timetableMatrix.set(slotKey, item.allocation);
          allocated++;
          item.remaining--;

          if (item.allocation.teacherId) {
            recordTeacherUsage(globalTracker, item.allocation.teacherId, day, slotTimeRange, label, curriculum);
          }
        } else if (existingAllocation && !existingAllocation.isCore && !existingConcurrent) {
          if (existingAllocation.teacherId === item.allocation.teacherId) continue;

          if (hasStudentOverlap(existingAllocation.subjectId, item.allocation.subjectId, tracks, studentSubjectMap)) {
            conflicts.push({
              type: "room_conflict",
              message: `${label}: Cannot schedule ${item.allocation.subject} concurrent with ${existingAllocation.subject} on ${day} P${period} — student overlap detected.`,
              details: { day, period, subject: item.allocation.subject },
            });
            continue;
          }

          // Validate room capacity for concurrent subjects
          // In split rooms, concurrent subjects share the same physical space
          // We need to ensure total students from both pathways don't exceed room capacity
          const totalPathways = tracks.length;
          if (totalPathways > 1) {
            // Estimate: each pathway has roughly equal students
            // This is a warning since we don't have actual student counts in the allocation context
            warnings.push(
              `${label}: Scheduling concurrent subjects ${existingAllocation.subject} and ${item.allocation.subject} in split room. Ensure room capacity is sufficient for all students from ${totalPathways} pathways.`
            );
          }

          concurrentSlots.set(slotKey, item.allocation);
          allocated++;
          item.remaining--;

          if (item.allocation.teacherId) {
            recordTeacherUsage(globalTracker, item.allocation.teacherId, day, slotTimeRange, label, curriculum);
          }
        }
      }
    }

    if (item.remaining > 0) {
      warnings.push(
        `${label}: Could not allocate ${item.remaining}/${item.allocation.lessonsPerWeek} optional lessons for ${item.allocation.subject} (split room). Teacher may be busy across divisions.`
      );
    }
  }
}

/**
 * Allocate optional subjects in a FULL room, grouped by pathway for block scheduling.
 */
function allocatePathwayOptionals(
  optionals: SubjectLessonAllocation[],
  timetableMatrix: Map<string, SubjectLessonAllocation | null>,
  days: string[],
  lessonsPerDay: number,
  periodTimes: PeriodTimeInfo[],
  globalTracker: TeacherSlotTracker,
  subjectMaxPeriodMap: Record<string, number>,
  label: string,
  curriculum: string,
  warnings: string[]
): void {
  const pathwayGroups = groupByPathway(optionals);

  for (const [pathway, subjects] of pathwayGroups) {
    const pools = subjects.map((s) => ({ allocation: s, remaining: s.lessonsPerWeek }));

    for (const item of pools) {
      let allocated = 0;

      for (const day of days) {
        for (let period = 1; period <= lessonsPerDay && allocated < item.allocation.lessonsPerWeek; period++) {
          const slotKey = `${day}-${period}`;
          if (timetableMatrix.get(slotKey) !== null) continue;

          const maxPeriod = subjectMaxPeriodMap[item.allocation.subject];
          if (maxPeriod !== undefined && period > maxPeriod) continue;

          const periodTimeInfo = periodTimes.find((pt) => pt.period === period)!;
          const slotTimeRange: TimeRange = {
            startMinutes: periodTimeInfo.startMinutes,
            endMinutes: periodTimeInfo.endMinutes,
          };

          if (item.allocation.teacherId) {
            const tracker = globalTracker[item.allocation.teacherId];
            if (tracker) {
              if (!isTeacherFreeAt(tracker, day, slotTimeRange)) continue;
              if (tracker.weeklyCount >= tracker.maxPerWeek) continue;
            }
          }

          timetableMatrix.set(slotKey, item.allocation);
          allocated++;
          item.remaining--;

          if (item.allocation.teacherId) {
            recordTeacherUsage(globalTracker, item.allocation.teacherId, day, slotTimeRange, label, curriculum);
          }
        }
      }

      if (item.remaining > 0) {
        warnings.push(
          `${label}: Could not allocate ${item.remaining}/${item.allocation.lessonsPerWeek} lessons for ${item.allocation.subject} (${pathway} pathway). Teacher may be busy across divisions.`
        );
      }
    }
  }
}
