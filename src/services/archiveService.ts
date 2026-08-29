import { supabase } from "@/integrations/supabase/client";

/**
 * Archives all academic data for a given academic year before reset
 * This includes marks, attendance, exams, student assignments, and teacher assignments
 */
export const archiveAcademicYearData = async (
  schoolId: string,
  academicYearId: string,
  userId: string
): Promise<{ success: boolean; error?: string; stats?: ArchiveStats }> => {
  console.log("=== STARTING ACADEMIC YEAR ARCHIVE ===");
  console.log("School ID:", schoolId);
  console.log("Academic Year ID:", academicYearId);
  
  const stats: ArchiveStats = {
    marksArchived: 0,
    attendanceArchived: 0,
    examsArchived: 0,
    studentsArchived: 0,
    teachersArchived: 0,
  };

  try {
    // Get academic year details
    const { data: academicYear, error: yearError } = await supabase
      .from("academic_years")
      .select("*")
      .eq("id", academicYearId)
      .single();

    if (yearError || !academicYear) {
      throw new Error("Academic year not found");
    }

    // Get all terms for this academic year
    const { data: terms } = await supabase
      .from("terms")
      .select("*")
      .eq("academic_year_id", academicYearId);

    const termMap = new Map(terms?.map((t) => [t.id, t.name]) || []);

    // Get all grades for the school
    const { data: grades } = await supabase
      .from("grades")
      .select("id, name")
      .eq("school_id", schoolId);

    const gradeMap = new Map(grades?.map((g) => [g.id, g.name]) || []);

    // Get all streams for the school
    const { data: streams } = await supabase
      .from("streams")
      .select("id, name")
      .eq("school_id", schoolId);

    const streamMap = new Map(streams?.map((s) => [s.id, s.name]) || []);

    // Archive exams
    console.log("Archiving exams...");
    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .eq("school_id", schoolId)
      .in("term_id", terms?.map((t) => t.id) || []);

    if (exams && exams.length > 0) {
      const examArchives = exams.map((exam) => ({
        original_exam_id: exam.id,
        name: exam.name,
        description: exam.description,
        grades: exam.grades,
        subjects: exam.subjects,
        start_date: exam.start_date,
        end_date: exam.end_date,
        school_id: schoolId,
        academic_year_id: academicYearId,
        term_id: exam.term_id,
        term_name: exam.term_id ? termMap.get(exam.term_id) : null,
        created_by: exam.created_by,
        created_at: exam.created_at,
      }));

      const { error: examArchiveError } = await supabase
        .from("archived_exams")
        .insert(examArchives);

      if (examArchiveError) {
        console.error("Error archiving exams:", examArchiveError);
      } else {
        stats.examsArchived = exams.length;
        console.log(`Archived ${exams.length} exams`);
      }
    }

    // Archive marks with student and exam details
    console.log("Archiving marks...");
    const examIds = exams?.map((e) => e.id) || [];
    if (examIds.length > 0) {
      const { data: marks } = await supabase
        .from("marks")
        .select(`
          *,
          student:students (name, admission_no, grade_id, stream_id)
        `)
        .in("exam_id", examIds);

      if (marks && marks.length > 0) {
        // Find exam names
        const examMap = new Map(exams?.map((e) => [e.id, { name: e.name, termId: e.term_id }]) || []);

        const markArchives = marks.map((mark: any) => ({
          original_mark_id: mark.id,
          student_id: mark.student_id,
          student_name: mark.student?.name || "Unknown",
          admission_no: mark.student?.admission_no || "",
          exam_id: mark.exam_id,
          exam_name: examMap.get(mark.exam_id)?.name || "Unknown Exam",
          subject: mark.subject,
          score: mark.score,
          out_of: mark.out_of,
          grade: mark.grade,
          academic_year_id: academicYearId,
          term_id: examMap.get(mark.exam_id)?.termId,
          term_name: examMap.get(mark.exam_id)?.termId
            ? termMap.get(examMap.get(mark.exam_id)?.termId!)
            : null,
          grade_id: mark.student?.grade_id,
          grade_name: gradeMap.get(mark.student?.grade_id) || "Unknown Grade",
          stream_id: mark.student?.stream_id,
          stream_name: streamMap.get(mark.student?.stream_id) || "Unknown Stream",
          school_id: schoolId,
          recorded_by: mark.recorded_by,
          recorded_at: mark.recorded_at,
        }));

        // Insert in batches to avoid payload limits
        const batchSize = 500;
        for (let i = 0; i < markArchives.length; i += batchSize) {
          const batch = markArchives.slice(i, i + batchSize);
          const { error: markArchiveError } = await supabase
            .from("archived_marks")
            .insert(batch);

          if (markArchiveError) {
            console.error("Error archiving marks batch:", markArchiveError);
          }
        }
        stats.marksArchived = marks.length;
        console.log(`Archived ${marks.length} marks`);
      }
    }

    // Archive attendance
    console.log("Archiving attendance...");
    const termIds = terms?.map((t) => t.id) || [];
    if (termIds.length > 0) {
      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          *,
          student:students (name, admission_no, grade_id, stream_id)
        `)
        .in("term_id", termIds);

      if (attendance && attendance.length > 0) {
        const attendanceArchives = attendance.map((record: any) => ({
          original_attendance_id: record.id,
          student_id: record.student_id,
          student_name: record.student?.name || "Unknown",
          admission_no: record.student?.admission_no || "",
          date: record.date,
          status: record.status,
          academic_year_id: academicYearId,
          term_id: record.term_id,
          term_name: record.term_id ? termMap.get(record.term_id) : null,
          grade_id: record.student?.grade_id,
          grade_name: gradeMap.get(record.student?.grade_id) || "Unknown Grade",
          stream_id: record.stream_id,
          stream_name: streamMap.get(record.stream_id) || "Unknown Stream",
          school_id: schoolId,
          recorded_by: record.recorded_by,
          recorded_at: record.recorded_at,
        }));

        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < attendanceArchives.length; i += batchSize) {
          const batch = attendanceArchives.slice(i, i + batchSize);
          const { error: attendanceArchiveError } = await supabase
            .from("archived_attendance")
            .insert(batch);

          if (attendanceArchiveError) {
            console.error("Error archiving attendance batch:", attendanceArchiveError);
          }
        }
        stats.attendanceArchived = attendance.length;
        console.log(`Archived ${attendance.length} attendance records`);
      }
    }

    // Archive student assignments (class placements)
    console.log("Archiving student assignments...");
    const { data: students } = await supabase
      .from("students")
      .select("id, name, admission_no, grade_id, stream_id")
      .eq("school_id", schoolId);

    if (students && students.length > 0) {
      const studentArchives = students.map((student) => ({
        student_id: student.id,
        academic_year_id: academicYearId,
        grade_id: student.grade_id,
        stream_id: student.stream_id,
        grade_name: gradeMap.get(student.grade_id) || "Unknown Grade",
        stream_name: streamMap.get(student.stream_id) || "Unknown Stream",
      }));

      const { error: studentArchiveError } = await supabase
        .from("archived_student_assignments")
        .insert(studentArchives);

      if (studentArchiveError) {
        console.error("Error archiving student assignments:", studentArchiveError);
      } else {
        stats.studentsArchived = students.length;
        console.log(`Archived ${students.length} student assignments`);
      }
    }

    // Archive teacher assignments
    console.log("Archiving teacher assignments...");
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, subjects_taught, is_stream_teacher")
      .eq("school_id", schoolId);

    // Get stream teacher assignments from grade_streams
    const { data: gradeStreamTeachers } = await supabase
      .from("grade_streams")
      .select("grade_id, stream_id, teacher_id")
      .in("grade_id", grades?.map((g) => g.id) || [])
      .not("teacher_id", "is", null);

    if (teachers && teachers.length > 0) {
      const teacherArchives = teachers.map((teacher) => {
        // Find stream teacher assignment
        const streamAssignment = gradeStreamTeachers?.find(
          (gs) => gs.teacher_id === teacher.id
        );

        return {
          teacher_id: teacher.id,
          academic_year_id: academicYearId,
          stream_id: streamAssignment?.stream_id || null,
          grade_id: streamAssignment?.grade_id || null,
          subjects_taught: teacher.subjects_taught || [],
          is_stream_teacher: teacher.is_stream_teacher || false,
        };
      });

      const { error: teacherArchiveError } = await supabase
        .from("archived_teacher_assignments")
        .insert(teacherArchives);

      if (teacherArchiveError) {
        console.error("Error archiving teacher assignments:", teacherArchiveError);
      } else {
        stats.teachersArchived = teachers.length;
        console.log(`Archived ${teachers.length} teacher assignments`);
      }
    }

    // Create the main archived academic year record
    console.log("Creating main archive record...");
    const archiveRecord = {
      original_academic_year_id: academicYearId,
      school_id: schoolId,
      year: academicYear.year,
      archived_by: userId,
      archive_data: {
        terms: terms?.map((t) => ({ id: t.id, name: t.name, startDate: t.start_date, endDate: t.end_date })),
        stats,
        archivedAt: new Date().toISOString(),
      },
    };
    
    const { error: mainArchiveError } = await supabase
      .from("archived_academic_years")
      .insert(archiveRecord as any);

    if (mainArchiveError) {
      console.error("Error creating main archive record:", mainArchiveError);
      throw mainArchiveError;
    }

    console.log("=== ACADEMIC YEAR ARCHIVE COMPLETE ===");
    console.log("Stats:", stats);

    return { success: true, stats };
  } catch (error: any) {
    console.error("Archive error:", error);
    return { success: false, error: error.message };
  }
};

export interface ArchiveStats {
  marksArchived: number;
  attendanceArchived: number;
  examsArchived: number;
  studentsArchived: number;
  teachersArchived: number;
}

/**
 * Check if an academic year has already been archived
 */
export const isYearArchived = async (
  schoolId: string,
  academicYearId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("archived_academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("original_academic_year_id", academicYearId)
    .maybeSingle();

  return !error && data !== null;
};

/**
 * Get archived years for a school
 */
export const getArchivedYears = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("archived_academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("archived_at", { ascending: false });

  if (error) throw error;
  return data || [];
};
