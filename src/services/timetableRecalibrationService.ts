import { supabase } from "@/integrations/supabase/client";
import { TimetableSlot } from "@/types";

export interface TimetableConflict {
  slotId: string;
  day: string;
  period: number;
  subject: string;
  teacherId: string | null;
  teacherName: string;
  reason: string;
}

export interface RecalibrationResult {
  timetableId: string;
  conflicts: TimetableConflict[];
  slotsCleared: number;
  unchanged: number;
}

/**
 * Validate timetable slots against current teacher-subject assignments
 * Returns conflicts where a teacher is assigned to teach a subject they're not assigned to
 */
export async function validateTimetableAgainstAssignments(
  timetableId: string,
  gradeStreamId: string,
  academicYearId: string
): Promise<TimetableConflict[]> {
  // Fetch timetable slots with teacher info
  const { data: slots, error: slotsError } = await supabase
    .from("timetable_slots")
    .select(`
      id,
      day,
      period,
      subject,
      teacher_id,
      teachers(id, name)
    `)
    .eq("timetable_id", timetableId);

  if (slotsError) throw slotsError;

  // Fetch teacher assignments for this grade-stream
  const { data: assignments, error: assignmentsError } = await supabase
    .from("teacher_subject_assignments")
    .select("teacher_id, subject")
    .eq("grade_stream_id", gradeStreamId)
    .eq("academic_year_id", academicYearId);

  if (assignmentsError) throw assignmentsError;

  // Build a map of valid teacher-subject pairs
  const validAssignments = new Set(
    (assignments || []).map((a: any) => `${a.teacher_id}-${a.subject}`)
  );

  const conflicts: TimetableConflict[] = [];

  for (const slot of slots || []) {
    if (slot.teacher_id && slot.subject) {
      const key = `${slot.teacher_id}-${slot.subject}`;
      if (!validAssignments.has(key)) {
        conflicts.push({
          slotId: slot.id,
          day: slot.day,
          period: slot.period,
          subject: slot.subject,
          teacherId: slot.teacher_id,
          teacherName: (slot.teachers as any)?.name || "Unknown",
          reason: `Teacher is no longer assigned to teach ${slot.subject} in this class`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Recalibrate timetable by clearing slots with invalid teacher-subject assignments
 * Only clears slots that have conflicts, leaves valid ones unchanged
 */
export async function recalibrateTimetable(
  timetableId: string,
  gradeStreamId: string,
  academicYearId: string
): Promise<RecalibrationResult> {
  const conflicts = await validateTimetableAgainstAssignments(
    timetableId,
    gradeStreamId,
    academicYearId
  );

  // Count total slots
  const { count: totalSlots } = await supabase
    .from("timetable_slots")
    .select("*", { count: "exact", head: true })
    .eq("timetable_id", timetableId);

  let slotsCleared = 0;

  // Clear teacher from conflicting slots (keep the slot structure, just remove invalid teacher)
  for (const conflict of conflicts) {
    const { error } = await supabase
      .from("timetable_slots")
      .update({ teacher_id: null })
      .eq("id", conflict.slotId);

    if (!error) {
      slotsCleared++;
    }
  }

  return {
    timetableId,
    conflicts,
    slotsCleared,
    unchanged: (totalSlots || 0) - slotsCleared,
  };
}

/**
 * Recalibrate all timetables for a term
 */
export async function recalibrateTermTimetables(
  schoolId: string,
  termId: string,
  academicYearId: string
): Promise<RecalibrationResult[]> {
  // Fetch all timetables for the term
  const { data: timetables, error: timetablesError } = await supabase
    .from("timetables")
    .select(`
      id,
      grade_id,
      stream_id,
      grade_streams!inner(id)
    `)
    .eq("school_id", schoolId)
    .eq("term_id", termId)
    .eq("academic_year_id", academicYearId);

  if (timetablesError) throw timetablesError;

  const results: RecalibrationResult[] = [];

  for (const timetable of timetables || []) {
    // Find the grade_stream_id for this timetable
    const { data: gradeStream } = await supabase
      .from("grade_streams")
      .select("id")
      .eq("grade_id", timetable.grade_id)
      .eq("stream_id", timetable.stream_id)
      .single();

    if (gradeStream) {
      const result = await recalibrateTimetable(
        timetable.id,
        gradeStream.id,
        academicYearId
      );
      results.push(result);
    }
  }

  return results;
}

/**
 * Delete all timetables and slots for a term (for term reset)
 */
export async function clearTermTimetables(
  schoolId: string,
  termId: string
): Promise<number> {
  // Get all timetables for this term
  const { data: timetables, error: fetchError } = await supabase
    .from("timetables")
    .select("id")
    .eq("school_id", schoolId)
    .eq("term_id", termId);

  if (fetchError) throw fetchError;

  let deleted = 0;

  for (const timetable of timetables || []) {
    // Delete slots first
    await supabase
      .from("timetable_slots")
      .delete()
      .eq("timetable_id", timetable.id);

    // Delete timetable
    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", timetable.id);

    if (!error) deleted++;
  }

  return deleted;
}
