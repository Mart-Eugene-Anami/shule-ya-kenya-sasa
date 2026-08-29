/**
 * Stream Service (Override Hierarchy)
 *
 * Manages streams (class sections like "Alpha", "Blue") with a 3-tier
 * override hierarchy:
 *   1. School-level: Default streams applied to all grades
 *   2. Division-level: Override for grades within a specific division
 *   3. Grade-level: Override for a single grade
 *
 * When resolving streams for a grade, the system checks grade → division → school
 * and uses the first level with defined streams. This allows schools to have
 * uniform streams while enabling exceptions for specific grades/divisions.
 */
import { supabase } from "@/integrations/supabase/client";
import { Stream } from "@/types";

export type StreamLevel = 'school' | 'division' | 'grade';

interface StreamWithLevel {
  id: string;
  name: string;
  school_id: string;
  grade_id: string | null;
  division_id: string | null;
  override_level: StreamLevel;
  created_at: string;
}

// Fetch streams by level
export const getStreamsByLevel = async (
  schoolId: string,
  level: StreamLevel,
  targetId?: string // divisionId or gradeId depending on level
): Promise<StreamWithLevel[]> => {
  let query = supabase
    .from("streams")
    .select("*")
    .eq("school_id", schoolId)
    .eq("override_level", level)
    .order("name");

  if (level === 'school') {
    query = query.is("grade_id", null).is("division_id", null);
  } else if (level === 'division' && targetId) {
    query = query.eq("division_id", targetId);
  } else if (level === 'grade' && targetId) {
    query = query.eq("grade_id", targetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as StreamWithLevel[];
};

// Create a stream at a specific level
export const createStreamAtLevel = async (params: {
  name: string;
  schoolId: string;
  level: StreamLevel;
  divisionId?: string;
  gradeId?: string;
}): Promise<StreamWithLevel> => {
  const { data, error } = await supabase
    .from("streams")
    .insert({
      name: params.name.trim(),
      school_id: params.schoolId,
      override_level: params.level,
      division_id: params.divisionId || null,
      grade_id: params.gradeId || null,
    })
    .select()
    .single();

  if (error) throw error;

  // For school-level streams, apply to all grades that don't have overrides
  if (params.level === 'school') {
    await applySchoolStreamToGrades(data.id, params.schoolId);
  }
  // For division-level streams, apply to all grades in that division
  else if (params.level === 'division' && params.divisionId) {
    await applyDivisionStreamToGrades(data.id, params.schoolId, params.divisionId);
  }
  // For grade-level streams, apply directly to that grade
  else if (params.level === 'grade' && params.gradeId) {
    await applyGradeStream(data.id, params.gradeId);
  }

  return data as unknown as StreamWithLevel;
};

// Apply school-level stream to all grades that don't have division or grade overrides
const applySchoolStreamToGrades = async (streamId: string, schoolId: string) => {
  // Get all grades
  const { data: grades } = await supabase
    .from("grades")
    .select("id, division_id")
    .eq("school_id", schoolId);

  if (!grades) return;

  // Check which divisions have overrides
  const { data: divisionOverrides } = await supabase
    .from("streams")
    .select("division_id")
    .eq("school_id", schoolId)
    .eq("override_level", "division")
    .not("division_id", "is", null);

  const overriddenDivisionIds = new Set(divisionOverrides?.map(d => d.division_id) || []);

  // Check which grades have direct overrides
  const { data: gradeOverrides } = await supabase
    .from("streams")
    .select("grade_id")
    .eq("school_id", schoolId)
    .eq("override_level", "grade")
    .not("grade_id", "is", null);

  const overriddenGradeIds = new Set(gradeOverrides?.map(g => g.grade_id) || []);

  // Apply to grades that have no overrides
  for (const grade of grades) {
    if (overriddenGradeIds.has(grade.id)) continue;
    if (grade.division_id && overriddenDivisionIds.has(grade.division_id)) continue;

    await supabase
      .from("grade_streams")
      .insert({ grade_id: grade.id, stream_id: streamId })
      .select(); // ignore duplicates via unique constraint
  }
};

// Apply division-level stream to grades in that division
const applyDivisionStreamToGrades = async (streamId: string, schoolId: string, divisionId: string) => {
  const { data: grades } = await supabase
    .from("grades")
    .select("id")
    .eq("school_id", schoolId)
    .eq("division_id", divisionId);

  if (!grades) return;

  // Check which grades have direct overrides
  const { data: gradeOverrides } = await supabase
    .from("streams")
    .select("grade_id")
    .eq("school_id", schoolId)
    .eq("override_level", "grade")
    .not("grade_id", "is", null);

  const overriddenGradeIds = new Set(gradeOverrides?.map(g => g.grade_id) || []);

  for (const grade of grades) {
    if (overriddenGradeIds.has(grade.id)) continue;

    await supabase
      .from("grade_streams")
      .insert({ grade_id: grade.id, stream_id: streamId })
      .select();
  }
};

// Apply grade-level stream directly
const applyGradeStream = async (streamId: string, gradeId: string) => {
  await supabase
    .from("grade_streams")
    .insert({ grade_id: gradeId, stream_id: streamId })
    .select();
};

// Get the effective streams for a specific grade (respecting override hierarchy)
export const getEffectiveStreamsForGrade = async (
  gradeId: string,
  schoolId: string,
  divisionId?: string | null
): Promise<StreamWithLevel[]> => {
  // 1. Check for grade-level overrides first
  const gradeStreams = await getStreamsByLevel(schoolId, 'grade', gradeId);
  if (gradeStreams.length > 0) return gradeStreams;

  // 2. Check for division-level overrides
  if (divisionId) {
    const divisionStreams = await getStreamsByLevel(schoolId, 'division', divisionId);
    if (divisionStreams.length > 0) return divisionStreams;
  }

  // 3. Fall back to school-level
  return getStreamsByLevel(schoolId, 'school');
};

// When enabling division override: remove school-level grade_streams for affected grades,
// add division stream grade_streams instead
export const enableDivisionOverride = async (
  schoolId: string,
  divisionId: string
) => {
  // Get grades in this division
  const { data: grades } = await supabase
    .from("grades")
    .select("id")
    .eq("school_id", schoolId)
    .eq("division_id", divisionId);

  if (!grades?.length) return;

  const gradeIds = grades.map(g => g.id);

  // Remove school-level stream associations for these grades
  const { data: schoolStreams } = await supabase
    .from("streams")
    .select("id")
    .eq("school_id", schoolId)
    .eq("override_level", "school");

  if (schoolStreams?.length) {
    const schoolStreamIds = schoolStreams.map(s => s.id);
    for (const gradeId of gradeIds) {
      // Check if grade has its own override - skip if so
      const gradeOverrides = await getStreamsByLevel(schoolId, 'grade', gradeId);
      if (gradeOverrides.length > 0) continue;

      await supabase
        .from("grade_streams")
        .delete()
        .eq("grade_id", gradeId)
        .in("stream_id", schoolStreamIds);
    }
  }

  // Apply division streams to these grades
  const divisionStreams = await getStreamsByLevel(schoolId, 'division', divisionId);
  for (const stream of divisionStreams) {
    for (const gradeId of gradeIds) {
      const gradeOverrides = await getStreamsByLevel(schoolId, 'grade', gradeId);
      if (gradeOverrides.length > 0) continue;

      await supabase
        .from("grade_streams")
        .insert({ grade_id: gradeId, stream_id: stream.id })
        .select();
    }
  }
};

// When enabling grade override: remove division/school grade_streams for that grade,
// add grade-level stream associations instead
export const enableGradeOverride = async (
  schoolId: string,
  gradeId: string
) => {
  // Remove all existing grade_streams for this grade
  await supabase
    .from("grade_streams")
    .delete()
    .eq("grade_id", gradeId);

  // Apply grade-level streams
  const gradeStreams = await getStreamsByLevel(schoolId, 'grade', gradeId);
  for (const stream of gradeStreams) {
    await supabase
      .from("grade_streams")
      .insert({ grade_id: gradeId, stream_id: stream.id })
      .select();
  }
};

// Delete a stream and clean up grade_streams
export const deleteStreamAtLevel = async (streamId: string) => {
  // Remove from grade_streams first
  await supabase
    .from("grade_streams")
    .delete()
    .eq("stream_id", streamId);

  const { error } = await supabase
    .from("streams")
    .delete()
    .eq("id", streamId);

  if (error) throw error;
};

// Update stream name
export const updateStreamAtLevel = async (streamId: string, name: string) => {
  const { error } = await supabase
    .from("streams")
    .update({ name: name.trim() })
    .eq("id", streamId);

  if (error) throw error;
};

// Check if a division has stream overrides
export const hasDivisionStreamOverride = async (schoolId: string, divisionId: string): Promise<boolean> => {
  const streams = await getStreamsByLevel(schoolId, 'division', divisionId);
  return streams.length > 0;
};

// Check if a grade has stream overrides
export const hasGradeStreamOverride = async (schoolId: string, gradeId: string): Promise<boolean> => {
  const streams = await getStreamsByLevel(schoolId, 'grade', gradeId);
  return streams.length > 0;
};

// Recalculate grade_streams for a specific grade based on the override hierarchy
export const recalculateGradeStreams = async (
  gradeId: string,
  schoolId: string,
  divisionId?: string | null
) => {
  // Clear existing
  await supabase.from("grade_streams").delete().eq("grade_id", gradeId);

  // Get effective streams
  const effectiveStreams = await getEffectiveStreamsForGrade(gradeId, schoolId, divisionId);

  // Apply them
  for (const stream of effectiveStreams) {
    await supabase
      .from("grade_streams")
      .insert({ grade_id: gradeId, stream_id: stream.id })
      .select();
  }
};
