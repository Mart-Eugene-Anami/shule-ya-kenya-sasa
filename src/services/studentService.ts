import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types";
import { handleSupabaseError, ValidationError, NotFoundError, AppError } from "@/lib/errors";
import { applyPagination, formatPaginatedResponse, PaginationOptions, PaginatedResponse } from "@/lib/pagination";

// Helper function to parse various date formats into YYYY-MM-DD
const parseFlexibleDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return trimmed;
    return null;
  }
  
  // MM/DD/YYYY or M/D/YYYY format (US format)
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    const formatted = `${year}-${paddedMonth}-${paddedDay}`;
    const date = new Date(formatted);
    if (!isNaN(date.getTime())) return formatted;
    return null;
  }
  
  // DD/MM/YYYY or D/M/YYYY format (UK format) - less common
  // We'll assume US format by default since that's what the sample shows
  
  // Try parsing as generic date string
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

export const getStudents = async (schoolId: string, options?: PaginationOptions): Promise<PaginatedResponse<Student>> => {
  // Build base query
  let query = supabase
    .from("students")
    .select(`
      *,
      grade:grades!students_grade_id_fkey (
        id,
        name,
        level,
        curriculum,
        school_id
      ),
      stream:streams!students_stream_id_fkey (
        id,
        name,
        grade_id
      )
    `, { count: 'exact' })
    .eq("school_id", schoolId);

  // Apply pagination
  query = applyPagination(query, options);

  const { data, error, count } = await query;
  
  if (error) {
    throw handleSupabaseError(error);
  }
  
  const students = (data || []).map((student: any) => {
    // Handle potentially array-typed relations
    const gradeData = Array.isArray(student.grade) ? student.grade[0] : student.grade;
    const streamData = Array.isArray(student.stream) ? student.stream[0] : student.stream;
    
    return {
      id: student.id,
      admissionNo: student.admission_no,
      name: student.name,
      email: student.email,
      gradeId: student.grade_id,
      streamId: student.stream_id,
      schoolId: student.school_id,
      userId: student.user_id,
      dateOfBirth: student.date_of_birth,
      enrollmentDate: student.enrollment_date,
      gender: student.gender,
      guardianName: student.guardian_name,
      guardianPhone: student.guardian_phone,
      guardianEmail: student.guardian_email,
      status: student.status,
      pathway: student.pathway,
      createdAt: student.created_at,
      updatedAt: student.updated_at,
      grade: gradeData ? {
        id: gradeData.id,
        name: gradeData.name,
        level: gradeData.level,
        curriculum: gradeData.curriculum,
        schoolId: gradeData.school_id
      } : undefined,
      stream: streamData ? {
        id: streamData.id,
        name: streamData.name,
        gradeId: streamData.grade_id
      } : undefined
    };
  }) as Student[];

  return formatPaginatedResponse(
    students,
    options?.page || 1,
    options?.pageSize || 20,
    count || 0
  );
};

export const createStudent = async (studentData: {
  admissionNo: string;
  name: string;
  email?: string;
  gradeId: string;
  streamId: string;
  schoolId: string;
  pathway?: string;
  trackId?: string;
}) => {
  
  const { data, error } = await supabase
    .from("students")
    .insert({
      admission_no: studentData.admissionNo,
      name: studentData.name,
      email: studentData.email || null,
      grade_id: studentData.gradeId,
      stream_id: studentData.streamId,
      school_id: studentData.schoolId,
      status: 'active',
      enrollment_date: new Date().toISOString().split('T')[0],
      pathway: studentData.pathway || null,
      track_id: studentData.trackId || null,
    })
    .select(`
      *,
      grade:grades!students_grade_id_fkey (
        id,
        name,
        level,
        curriculum,
        school_id
      ),
      stream:streams!students_stream_id_fkey (
        id,
        name,
        grade_id
      )
    `)
    .single();
    
  if (error) {
    throw handleSupabaseError(error);
  }
  
  // Handle potentially array-typed relations
  const gradeData = Array.isArray((data as any).grade) ? (data as any).grade[0] : (data as any).grade;
  const streamData = Array.isArray((data as any).stream) ? (data as any).stream[0] : (data as any).stream;
  
  return {
    id: (data as any).id,
    admissionNo: (data as any).admission_no,
    name: (data as any).name,
    email: (data as any).email,
    gradeId: (data as any).grade_id,
    streamId: (data as any).stream_id,
    schoolId: (data as any).school_id,
    pathway: (data as any).pathway,
    grade: gradeData ? {
      id: gradeData.id,
      name: gradeData.name,
      level: gradeData.level,
      curriculum: gradeData.curriculum,
      schoolId: gradeData.school_id
    } : undefined,
    stream: streamData ? {
      id: streamData.id,
      name: streamData.name,
      gradeId: streamData.grade_id
    } : undefined
  } as Student;
};

export const updateStudent = async (
  studentId: string,
  updates: Partial<{
    admissionNo: string;
    name: string;
    email: string;
    gradeId: string;
    streamId: string;
    pathway: string;
  }>
) => {
  
  const updateData: Record<string, any> = {};
  if (updates.admissionNo) updateData.admission_no = updates.admissionNo;
  if (updates.name) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.gradeId) updateData.grade_id = updates.gradeId;
  if (updates.streamId) updateData.stream_id = updates.streamId;
  if (updates.pathway !== undefined) updateData.pathway = updates.pathway;
  
  const { data, error } = await supabase
    .from("students")
    .update(updateData)
    .eq("id", studentId)
    .select(`
      *,
      grade:grades!students_grade_id_fkey (
        id,
        name,
        level,
        curriculum,
        school_id
      ),
      stream:streams!students_stream_id_fkey (
        id,
        name,
        grade_id
      )
    `)
    .single();
    
  if (error) {
    throw handleSupabaseError(error);
  }
  
  // Handle potentially array-typed relations
  const gradeData = Array.isArray((data as any).grade) ? (data as any).grade[0] : (data as any).grade;
  const streamData = Array.isArray((data as any).stream) ? (data as any).stream[0] : (data as any).stream;
  
  return {
    id: (data as any).id,
    admissionNo: (data as any).admission_no,
    name: (data as any).name,
    email: (data as any).email,
    gradeId: (data as any).grade_id,
    streamId: (data as any).stream_id,
    schoolId: (data as any).school_id,
    grade: gradeData ? {
      id: gradeData.id,
      name: gradeData.name,
      level: gradeData.level,
      curriculum: gradeData.curriculum,
      schoolId: gradeData.school_id
    } : undefined,
    stream: streamData ? {
      id: streamData.id,
      name: streamData.name,
      gradeId: streamData.grade_id
    } : undefined
  } as Student;
};

export const deleteStudent = async (studentId: string) => {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);
    
  if (error) {
    throw handleSupabaseError(error);
  }
};

