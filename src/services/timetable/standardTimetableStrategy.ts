/**
 * Standard timetable generation strategy for 8-4-4 and CBE Primary/Junior schools.
 * 
 * Process:
 * 1. Simple room-per-stream model
 * 2. Core subjects scheduled first (distributed evenly across days)
 * 3. Optional subjects fill remaining slots
 * 4. One teacher per subject per slot
 * 5. Global teacher conflict detection via time ranges (cross-division aware)
 */

import { supabase } from "@/integrations/supabase/client";
import { GenerationConflict } from "@/types/timetable";
import {
  TeacherSlotTracker,
  StreamGenerationUnit,
  StreamGenerationResult,
  SubjectLessonAllocation,
  TimetableSlotInsert,
  RoomSlotTracker,
  calculatePeriodTimes,
  getEffectiveDays,
  allocateCoreSubjects,
  allocateOptionalSubjects,
} from "./commonTimetableUtils";

/**
 * Generate a timetable for a single standard (non-CBE Senior) stream.
 */
export async function generateStandardStreamTimetable(
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

  const periodTimes = calculatePeriodTimes(
    unit.config.startTime,
    unit.config.lessonDurationMinutes,
    unit.config.lessonsPerDay,
    unit.config.breaks
  );

  // Create timetable matrix
  const timetableMatrix: Map<string, SubjectLessonAllocation | null> = new Map();
  for (const day of DAYS) {
    for (let period = 1; period <= unit.config.lessonsPerDay; period++) {
      timetableMatrix.set(`${day}-${period}`, null);
    }
  }

  // Separate core and optional
  const corePool = unit.subjectAllocations
    .filter((s) => s.isCore)
    .map((s) => ({ allocation: s, remaining: s.lessonsPerWeek }));

  const optionalPool = unit.subjectAllocations
    .filter((s) => !s.isCore)
    .map((s) => ({ allocation: s, remaining: s.lessonsPerWeek }));

  // Allocate core subjects (with cross-division aware conflict reporting)
  allocateCoreSubjects(
    corePool, timetableMatrix, DAYS, unit.config.lessonsPerDay,
    periodTimes, globalTracker, subjectMaxPeriodMap, label, unit.gradeCurriculum, conflicts, warnings,
    unit.roomId, roomTracker
  );

  // Allocate optional subjects
  allocateOptionalSubjects(
    optionalPool, timetableMatrix, DAYS, unit.config.lessonsPerDay,
    periodTimes, globalTracker, subjectMaxPeriodMap, label, unit.gradeCurriculum, warnings,
    unit.roomId, roomTracker
  );

  // Create timetable record
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

  // Build slots
  const slots: TimetableSlotInsert[] = [];
  let coreSlots = 0;
  let optionalSlots = 0;
  let freeSlots = 0;

  for (const day of DAYS) {
    for (const periodTime of periodTimes) {
      const slotKey = `${day}-${periodTime.period}`;
      const allocation = timetableMatrix.get(slotKey);

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

  return {
    gradeName: unit.gradeName,
    streamName: unit.streamName,
    timetableId: newTimetable.id,
    success: true,
    message: `${coreSlots} core, ${optionalSlots} optional, ${freeSlots} free`,
    coreSlots,
    optionalSlots,
    freeSlots,
  };
}
