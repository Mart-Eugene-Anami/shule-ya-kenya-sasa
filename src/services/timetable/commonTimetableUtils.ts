/**
 * Common timetable generation utilities shared across all curriculum strategies.
 * Contains: time range calculations, teacher tracking, slot building, period time generation.
 */

import { GenerationConflict, Pathway } from "@/types/timetable";

// ─── Time Range Utilities ────────────────────────────────────────────────────

export interface TimeRange {
  startMinutes: number; // minutes from midnight
  endMinutes: number;
}

export const timeRangesOverlap = (a: TimeRange, b: TimeRange): boolean => {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
};

// ─── Period Time Calculation ─────────────────────────────────────────────────

export interface PeriodTimeInfo {
  period: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

export interface BreakConfigInput {
  id: string;
  name: string;
  afterPeriod: number;
  durationMinutes: number;
}

export function calculatePeriodTimes(
  startTime: string,
  lessonDurationMinutes: number,
  lessonsPerDay: number,
  breaks: BreakConfigInput[]
): PeriodTimeInfo[] {
  // Validate inputs
  if (!startTime || !startTime.match(/^\d{1,2}:\d{2}$/)) {
    console.warn(`Invalid startTime format: ${startTime}. Using default 08:20`);
    startTime = "08:20";
  }
  if (!lessonDurationMinutes || lessonDurationMinutes < 10) {
    console.warn(`Invalid lessonDurationMinutes: ${lessonDurationMinutes}. Using default 40`);
    lessonDurationMinutes = 40;
  }
  if (!lessonsPerDay || lessonsPerDay < 1 || lessonsPerDay > 15) {
    console.warn(`Invalid lessonsPerDay: ${lessonsPerDay}. Using default 8`);
    lessonsPerDay = 8;
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  let currentMinutes = startHour * 60 + startMinute;

  const periodTimes: PeriodTimeInfo[] = [];
  for (let period = 1; period <= lessonsPerDay; period++) {
    const periodStartMin = currentMinutes;
    const start = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}:00`;
    currentMinutes += lessonDurationMinutes;
    const periodEndMin = currentMinutes;
    const end = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}:00`;
    periodTimes.push({ period, startTime: start, endTime: end, startMinutes: periodStartMin, endMinutes: periodEndMin });

    const breakAfter = breaks.find((b) => b.afterPeriod === period);
    if (breakAfter) {
      // Validate break duration
      const breakDuration = breakAfter.durationMinutes || 0;
      if (breakDuration > 0 && breakDuration < 120) {
        currentMinutes += breakDuration;
      } else if (breakDuration >= 120) {
        console.warn(`Break duration too long (${breakDuration} minutes) after period ${period}. Capping at 120 minutes.`);
        currentMinutes += 120;
      }
    }
  }

  return periodTimes;
}

// ─── Room Tracking ───────────────────────────────────────────────────────────

/** Tracks room busy times to prevent shared rooms from being double-booked */
export interface RoomSlotTracker {
  [roomId: string]: Map<string, TimeRange[]>; // day -> list of busy time ranges
}

export function isRoomFreeAt(
  tracker: RoomSlotTracker,
  roomId: string,
  day: string,
  range: TimeRange
): boolean {
  const daySlots = tracker[roomId]?.get(day) || [];
  return !daySlots.some((existing) => timeRangesOverlap(existing, range));
}

export function markRoomBusy(
  tracker: RoomSlotTracker,
  roomId: string,
  day: string,
  range: TimeRange
): void {
  if (!tracker[roomId]) {
    tracker[roomId] = new Map();
  }
  if (!tracker[roomId].has(day)) {
    tracker[roomId].set(day, []);
  }
  tracker[roomId].get(day)!.push(range);
}



/** Records where a teacher is busy, including which division/stream caused it */
export interface TeacherBusySlot {
  range: TimeRange;
  /** Label of the stream/grade that claimed this slot (e.g. "Grade 7 Blue") */
  sourceLabel: string;
  /** Curriculum of the stream that claimed this slot */
  sourceCurriculum: string;
}

export interface TeacherSlotTracker {
  [teacherId: string]: {
    name: string;
    weeklyCount: number;
    maxPerWeek: number;
    dailyCount: { [day: string]: number };
    /** day -> list of occupied time ranges with source info */
    scheduledSlots: Map<string, TeacherBusySlot[]>;
  };
}

export function createTeacherTracker(
  teachers: Array<{ id: string; name: string; max_lessons_per_week?: number | null }>,
  days: string[]
): TeacherSlotTracker {
  const tracker: TeacherSlotTracker = {};
  teachers.forEach((t) => {
    tracker[t.id] = {
      name: t.name,
      weeklyCount: 0,
      maxPerWeek: t.max_lessons_per_week || 30,
      dailyCount: {},
      scheduledSlots: new Map(),
    };
    days.forEach((d) => {
      tracker[t.id].dailyCount[d] = 0;
    });
  });
  return tracker;
}

export function isTeacherFreeAt(
  tracker: TeacherSlotTracker[string],
  day: string,
  range: TimeRange
): boolean {
  const daySlots = tracker.scheduledSlots.get(day) || [];
  return !daySlots.some((existing) => timeRangesOverlap(existing.range, range));
}

/**
 * Find the conflicting slot for a teacher at a given day/time.
 * Returns the source info so conflict messages can report cross-division details.
 */
export function findTeacherConflict(
  tracker: TeacherSlotTracker[string],
  day: string,
  range: TimeRange
): TeacherBusySlot | null {
  const daySlots = tracker.scheduledSlots.get(day) || [];
  return daySlots.find((existing) => timeRangesOverlap(existing.range, range)) || null;
}

export function markTeacherBusy(
  tracker: TeacherSlotTracker[string],
  day: string,
  slot: TeacherBusySlot
): void {
  if (!tracker.scheduledSlots.has(day)) {
    tracker.scheduledSlots.set(day, []);
  }
  tracker.scheduledSlots.get(day)!.push(slot);
}

export function recordTeacherUsage(
  globalTracker: TeacherSlotTracker,
  teacherId: string,
  day: string,
  range: TimeRange,
  sourceLabel: string,
  sourceCurriculum: string
): void {
  const tracker = globalTracker[teacherId];
  if (!tracker) return;
  tracker.weeklyCount++;
  tracker.dailyCount[day] = (tracker.dailyCount[day] || 0) + 1;
  markTeacherBusy(tracker, day, { range, sourceLabel, sourceCurriculum });
}

// ─── Subject Lesson Allocation ───────────────────────────────────────────────

export interface SubjectLessonAllocation {
  subjectId: string;
  subject: string;
  lessonsPerWeek: number;
  isCore: boolean;
  pathway?: Pathway;
  requiresSpecialRoom: boolean;
  specialRoomType?: string;
  teacherId?: string;
  teacherName?: string;
}

// ─── Stream Generation Unit ──────────────────────────────────────────────────

export interface StreamConfig {
  startTime: string;
  lessonDurationMinutes: number;
  lessonsPerDay: number;
  breaks: BreakConfigInput[];
  schoolDays?: string[];
}

export interface StreamGenerationUnit {
  gradeId: string;
  gradeName: string;
  gradeCurriculum: string;
  streamId: string;
  streamName: string;
  roomId: string;
  roomName: string;
  roomMode?: string; // 'standard' | 'full' | 'split'
  trackIds?: string[];
  subjectAllocations: SubjectLessonAllocation[];
  config: StreamConfig;
}

export interface StreamGenerationResult {
  gradeName: string;
  streamName: string;
  timetableId?: string;
  success: boolean;
  message: string;
  coreSlots: number;
  optionalSlots: number;
  freeSlots: number;
}

// ─── Slot Building ───────────────────────────────────────────────────────────

export interface TimetableSlotInsert {
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
}

export const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Simple seeded shuffle to vary slot allocation across runs while being deterministic.
 */
function shuffleArray<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Get effective school days for a stream unit.
 */
export function getEffectiveDays(unit: StreamGenerationUnit): string[] {
  return unit.config.schoolDays && unit.config.schoolDays.length > 0
    ? unit.config.schoolDays
    : DEFAULT_DAYS;
}

/**
 * Standard core subject allocation algorithm.
 * Schedules core subjects first, distributing them evenly across days,
 * while checking teacher availability and subject time restrictions.
 * Reports cross-division conflicts when a teacher is busy in another division.
 */
export function allocateCoreSubjects(
  corePool: Array<{ allocation: SubjectLessonAllocation; remaining: number }>,
  timetableMatrix: Map<string, SubjectLessonAllocation | null>,
  days: string[],
  lessonsPerDay: number,
  periodTimes: PeriodTimeInfo[],
  globalTracker: TeacherSlotTracker,
  subjectMaxPeriodMap: Record<string, number>,
  label: string,
  curriculum: string,
  conflicts: GenerationConflict[],
  warnings: string[],
  roomId?: string,
  roomTracker?: RoomSlotTracker
): void {
  // Shuffle subject order using a seed based on the label for variety between streams
  const labelSeed = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffledPool = shuffleArray(corePool, labelSeed);

  for (let idx = 0; idx < shuffledPool.length; idx++) {
    const item = shuffledPool[idx];
    let allocated = 0;
    const targetPerDay = Math.ceil(item.allocation.lessonsPerWeek / days.length);

    // Vary day order per subject to avoid all subjects landing in the same day/period pattern
    const dayOrder = shuffleArray(days, labelSeed + idx * 7 + 31);

    for (const day of dayOrder) {
      let allocatedToday = 0;

      // Vary period order per day per subject to avoid same-period clustering
      const periodOrder = shuffleArray(
        Array.from({ length: lessonsPerDay }, (_, i) => i + 1),
        labelSeed + idx * 13 + day.charCodeAt(0)
      );

      for (const period of periodOrder) {
        if (allocated >= item.allocation.lessonsPerWeek) break;

        const slotKey = `${day}-${period}`;
        if (timetableMatrix.get(slotKey) !== null) continue;

        const maxPeriod = subjectMaxPeriodMap[item.allocation.subject];
        if (maxPeriod !== undefined && period > maxPeriod) continue;

        const periodTimeInfo = periodTimes.find((pt) => pt.period === period)!;
        const slotTimeRange: TimeRange = { startMinutes: periodTimeInfo.startMinutes, endMinutes: periodTimeInfo.endMinutes };

        // Check room availability (shared room conflict detection)
        if (roomId && roomTracker && !isRoomFreeAt(roomTracker, roomId, day, slotTimeRange)) {
          // Track room conflicts for reporting
          if (item.allocation.teacherId) {
            const tracker = globalTracker[item.allocation.teacherId];
            if (tracker) {
              // Only report if teacher is free but room is busy (this is a real room conflict)
              if (isTeacherFreeAt(tracker, day, slotTimeRange)) {
                conflicts.push({
                  type: "room_conflict",
                  message: `Room unavailable for ${item.allocation.subject} in ${label} on ${day} P${period} — room is already booked by another stream.`,
                  details: { day, period, subject: item.allocation.subject, roomId },
                });
              }
            }
          }
          continue; // try another slot
        }

        // Validate special room requirements
        if (item.allocation.requiresSpecialRoom && item.allocation.specialRoomType) {
          // This is a warning since we don't have room type info in the current context
          // The actual room type validation should happen at the room allocation level
          warnings.push(
            `${label}: Subject "${item.allocation.subject}" requires a ${item.allocation.specialRoomType} room. Ensure the assigned room matches this requirement.`
          );
        }

        if (item.allocation.teacherId) {
          const tracker = globalTracker[item.allocation.teacherId];
          if (tracker) {
            if (!isTeacherFreeAt(tracker, day, slotTimeRange)) {
              // Instead of immediately reporting conflict, skip and try another slot
              continue;
            }
            if (tracker.weeklyCount >= tracker.maxPerWeek) {
              continue;
            }
          }
        }

        timetableMatrix.set(slotKey, item.allocation);
        allocated++;
        allocatedToday++;
        item.remaining--;

        if (item.allocation.teacherId) {
          recordTeacherUsage(globalTracker, item.allocation.teacherId, day, slotTimeRange, label, curriculum);
        }
        if (roomId && roomTracker) {
          markRoomBusy(roomTracker, roomId, day, slotTimeRange);
        }

        if (allocatedToday >= targetPerDay) break;
      }
    }

    // Second pass: if not fully allocated, try ANY remaining slot (relaxed constraints)
    if (item.remaining > 0) {
      for (const day of dayOrder) {
        for (let period = 1; period <= lessonsPerDay && item.remaining > 0; period++) {
          const slotKey = `${day}-${period}`;
          if (timetableMatrix.get(slotKey) !== null) continue;

          const maxPeriod = subjectMaxPeriodMap[item.allocation.subject];
          if (maxPeriod !== undefined && period > maxPeriod) continue;

          const periodTimeInfo = periodTimes.find((pt) => pt.period === period)!;
          const slotTimeRange: TimeRange = { startMinutes: periodTimeInfo.startMinutes, endMinutes: periodTimeInfo.endMinutes };

          if (roomId && roomTracker && !isRoomFreeAt(roomTracker, roomId, day, slotTimeRange)) {
            // Report room conflict for optional subjects too
            if (item.allocation.teacherId) {
              const tracker = globalTracker[item.allocation.teacherId];
              if (tracker && isTeacherFreeAt(tracker, day, slotTimeRange)) {
                conflicts.push({
                  type: "room_conflict",
                  message: `Room unavailable for optional subject ${item.allocation.subject} in ${label} on ${day} P${period} — room is already booked.`,
                  details: { day, period, subject: item.allocation.subject, roomId },
                });
              }
            }
            continue;
          }

          if (item.allocation.teacherId) {
            const tracker = globalTracker[item.allocation.teacherId];
            if (tracker) {
              if (!isTeacherFreeAt(tracker, day, slotTimeRange)) {
                const conflictSlot = findTeacherConflict(tracker, day, slotTimeRange);
                const crossDivision = conflictSlot && conflictSlot.sourceCurriculum !== curriculum;
                conflicts.push({
                  type: "teacher_overload",
                  message: `${tracker.name} unavailable for ${item.allocation.subject} in ${label} on ${day} P${period}` +
                    (crossDivision
                      ? ` — already teaching in ${conflictSlot!.sourceLabel} (${conflictSlot!.sourceCurriculum} division).`
                      : ` — already scheduled at ${conflictSlot?.sourceLabel || "another stream"}.`),
                  details: { day, period, subject: item.allocation.subject, teacherId: item.allocation.teacherId },
                });
                continue;
              }
              if (tracker.weeklyCount >= tracker.maxPerWeek) {
                conflicts.push({
                  type: "teacher_overload",
                  message: `${tracker.name} reached max ${tracker.maxPerWeek} lessons/week. Cannot schedule ${item.allocation.subject} for ${label}.`,
                  details: { day, period, subject: item.allocation.subject, teacherId: item.allocation.teacherId },
                });
                continue;
              }
            }
          }

          timetableMatrix.set(slotKey, item.allocation);
          item.remaining--;

          if (item.allocation.teacherId) {
            recordTeacherUsage(globalTracker, item.allocation.teacherId, day, slotTimeRange, label, curriculum);
          }
          if (roomId && roomTracker) {
            markRoomBusy(roomTracker, roomId, day, slotTimeRange);
          }
        }
      }
    }

    if (item.remaining > 0) {
      warnings.push(
        `${label}: Could not allocate ${item.remaining}/${item.allocation.lessonsPerWeek} lessons for ${item.allocation.subject}. ` +
        (item.allocation.teacherId ? "Teacher may be busy in other streams/divisions." : "No teacher assigned.")
      );
    }
  }
}

/**
 * Standard optional subject allocation algorithm.
 * Fills remaining slots with optional subjects.
 * Reports cross-division conflicts when relevant.
 */
export function allocateOptionalSubjects(
  optionalPool: Array<{ allocation: SubjectLessonAllocation; remaining: number }>,
  timetableMatrix: Map<string, SubjectLessonAllocation | null>,
  days: string[],
  lessonsPerDay: number,
  periodTimes: PeriodTimeInfo[],
  globalTracker: TeacherSlotTracker,
  subjectMaxPeriodMap: Record<string, number>,
  label: string,
  curriculum: string,
  warnings: string[],
  roomId?: string,
  roomTracker?: RoomSlotTracker
): void {
  const labelSeed = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 999;
  const shuffledPool = shuffleArray(optionalPool, labelSeed);

  for (let idx = 0; idx < shuffledPool.length; idx++) {
    const item = shuffledPool[idx];

    // Shuffle days and periods for variety
    const dayOrder = shuffleArray(days, labelSeed + idx * 11);

    for (const day of dayOrder) {
      const periodOrder = shuffleArray(
        Array.from({ length: lessonsPerDay }, (_, i) => i + 1),
        labelSeed + idx * 17 + day.charCodeAt(0)
      );

      for (const period of periodOrder) {
        if (item.remaining <= 0) break;

        const slotKey = `${day}-${period}`;
        if (timetableMatrix.get(slotKey) !== null) continue;

        const maxPeriod = subjectMaxPeriodMap[item.allocation.subject];
        if (maxPeriod !== undefined && period > maxPeriod) continue;

        const periodTimeInfo = periodTimes.find((pt) => pt.period === period)!;
        const slotTimeRange: TimeRange = { startMinutes: periodTimeInfo.startMinutes, endMinutes: periodTimeInfo.endMinutes };

        if (roomId && roomTracker && !isRoomFreeAt(roomTracker, roomId, day, slotTimeRange)) continue;

        if (item.allocation.teacherId) {
          const tracker = globalTracker[item.allocation.teacherId];
          if (tracker) {
            if (!isTeacherFreeAt(tracker, day, slotTimeRange)) continue;
            if (tracker.weeklyCount >= tracker.maxPerWeek) continue;
          }
        }

        timetableMatrix.set(slotKey, item.allocation);
        item.remaining--;

        if (item.allocation.teacherId) {
          recordTeacherUsage(globalTracker, item.allocation.teacherId, day, slotTimeRange, label, curriculum);
        }
        if (roomId && roomTracker) {
          markRoomBusy(roomTracker, roomId, day, slotTimeRange);
        }
      }
    }

    if (item.remaining > 0) {
      warnings.push(
        `${label}: Could not allocate ${item.remaining}/${item.allocation.lessonsPerWeek} optional lessons for ${item.allocation.subject}. Teacher may be busy across divisions.`
      );
    }
  }
}
