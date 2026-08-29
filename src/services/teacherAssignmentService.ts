import { supabase } from "@/integrations/supabase/client";

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  gradeStreamId: string;
  subject: string;
  academicYearId: string;
  teacherName: string;
  gradeName: string;
  streamName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherAssignment {
  teacherId: string;
  gradeStreamId: string;
  subject: string;
  academicYearId: string;
}

/**
 * Get all teacher-subject assignments for a school's academic year
 */
export async function getTeacherAssignments(
  schoolId: string,
  academicYearId: string
): Promise<TeacherAssignment[]> {
  const { data, error } = await supabase
    .from("teacher_subject_assignments")
    .select(`
      id,
      teacher_id,
      grade_stream_id,
      subject,
      academic_year_id,
      created_at,
      updated_at,
      teachers!inner(id, name, school_id),
      grade_streams!inner(
        id,
        grades!inner(id, name, school_id),
        streams!inner(id, name)
      )
    `)
    .eq("academic_year_id", academicYearId)
    .eq("teachers.school_id", schoolId);

  if (error) {
    console.error("Error fetching teacher assignments:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    teacherId: item.teacher_id,
    gradeStreamId: item.grade_stream_id,
    subject: item.subject,
    academicYearId: item.academic_year_id,
    teacherName: item.teachers?.name || "Unknown",
    gradeName: item.grade_streams?.grades?.name || "Unknown",
    streamName: item.grade_streams?.streams?.name || "Unknown",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

/**
 * Create a new teacher-subject assignment
 */
export async function createTeacherAssignment(
  assignment: CreateTeacherAssignment
): Promise<TeacherAssignment> {
  const { data, error } = await supabase
    .from("teacher_subject_assignments")
    .insert({
      teacher_id: assignment.teacherId,
      grade_stream_id: assignment.gradeStreamId,
      subject: assignment.subject,
      academic_year_id: assignment.academicYearId,
    })
    .select(`
      id,
      teacher_id,
      grade_stream_id,
      subject,
      academic_year_id,
      created_at,
      updated_at,
      teachers!inner(id, name),
      grade_streams!inner(
        id,
        grades!inner(id, name),
        streams!inner(id, name)
      )
    `)
    .single();

  if (error) {
    console.error("Error creating teacher assignment:", error);
    throw error;
  }

  return {
    id: data.id,
    teacherId: data.teacher_id,
    gradeStreamId: data.grade_stream_id,
    subject: data.subject,
    academicYearId: data.academic_year_id,
    teacherName: (data.teachers as any)?.name || "Unknown",
    gradeName: (data.grade_streams as any)?.grades?.name || "Unknown",
    streamName: (data.grade_streams as any)?.streams?.name || "Unknown",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Replace assignments for a grade-stream in a single bulk operation.
 * This avoids many per-subject network calls on mobile devices.
 */
export async function replaceTeacherAssignmentsForStream(params: {
  gradeStreamId: string;
  academicYearId: string;
  assignments: Array<{ subject: string; teacherId: string }>;
}): Promise<void> {
  const { gradeStreamId, academicYearId, assignments } = params;

  if (assignments.length === 0) return;

  const subjects = [...new Set(assignments.map((a) => a.subject))];

  const { error: deleteError } = await supabase
    .from("teacher_subject_assignments")
    .delete()
    .eq("grade_stream_id", gradeStreamId)
    .eq("academic_year_id", academicYearId)
    .in("subject", subjects);

  if (deleteError) {
    console.error("Error deleting existing teacher assignments in bulk:", deleteError);
    throw deleteError;
  }

  const { error: insertError } = await supabase
    .from("teacher_subject_assignments")
    .insert(
      assignments.map((a) => ({
        teacher_id: a.teacherId,
        grade_stream_id: gradeStreamId,
        subject: a.subject,
        academic_year_id: academicYearId,
      }))
    );

  if (insertError) {
    console.error("Error creating teacher assignments in bulk:", insertError);
    throw insertError;
  }
}

/**
 * Delete a teacher-subject assignment
 */
export async function deleteTeacherAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from("teacher_subject_assignments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting teacher assignment:", error);
    throw error;
  }
}

/**
 * Get assignments for a specific teacher
 */
export async function getTeacherAssignmentsByTeacher(
  teacherId: string,
  academicYearId: string
): Promise<TeacherAssignment[]> {
  const { data, error } = await supabase
    .from("teacher_subject_assignments")
    .select(`
      id,
      teacher_id,
      grade_stream_id,
      subject,
      academic_year_id,
      created_at,
      updated_at,
      teachers!inner(id, name),
      grade_streams!inner(
        id,
        grades!inner(id, name),
        streams!inner(id, name)
      )
    `)
    .eq("teacher_id", teacherId)
    .eq("academic_year_id", academicYearId);

  if (error) {
    console.error("Error fetching teacher assignments:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    teacherId: item.teacher_id,
    gradeStreamId: item.grade_stream_id,
    subject: item.subject,
    academicYearId: item.academic_year_id,
    teacherName: item.teachers?.name || "Unknown",
    gradeName: item.grade_streams?.grades?.name || "Unknown",
    streamName: item.grade_streams?.streams?.name || "Unknown",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}
