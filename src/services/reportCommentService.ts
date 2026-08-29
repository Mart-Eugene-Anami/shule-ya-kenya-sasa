import { supabase } from "@/integrations/supabase/client";

export type CommentType = 'subject_teacher' | 'class_teacher' | 'head_teacher';

export interface ReportComment {
  id: string;
  student_id: string;
  exam_id: string;
  comment_type: CommentType;
  subject: string | null;
  comment: string;
  commented_by: string;
  created_at: string;
  updated_at: string;
}

export const PRESET_COMMENTS: Record<CommentType, string[]> = {
  subject_teacher: [
    "Excellent performance. Keep it up!",
    "Good work but can improve with more practice.",
    "Average performance. Needs to put in more effort.",
    "Below average. Requires extra attention and revision.",
    "Shows great potential. Should participate more in class.",
    "Hardworking and consistent. Well done!",
    "Needs to complete assignments on time.",
    "Good understanding of concepts but careless in exams.",
    "Outstanding improvement from last term.",
    "Should seek help when facing difficulties.",
  ],
  class_teacher: [
    "An exemplary student. Keep up the excellent work!",
    "Shows good discipline and is well-behaved in class.",
    "A hardworking student who needs to be more consistent.",
    "Has shown great improvement this term. Keep it up!",
    "Needs to improve on discipline and time management.",
    "A well-rounded student. Participates well in school activities.",
    "Should aim higher and put in more effort next term.",
    "Good academic performance but should improve on conduct.",
    "Reliable and responsible. A good role model to peers.",
    "Needs close supervision to achieve better results.",
  ],
  head_teacher: [
    "Congratulations on your excellent performance!",
    "Keep working hard and aim for the best.",
    "Good progress. Continue with the same spirit.",
    "There is room for improvement. Work harder next term.",
    "Well done. The school is proud of you.",
    "More effort is needed to achieve your potential.",
    "An outstanding student. Keep it up!",
    "I encourage you to be more disciplined and focused.",
    "Your improvement is noted. Keep pushing forward.",
    "Wishing you the best in the coming term.",
  ],
};

/**
 * Grade-based preset comments mapped to rubric performance levels.
 * Keys are the actual_level codes (e.g., "EE1", "A", "B+").
 * Falls back to performance_level grouping if exact level not found.
 */
export const GRADE_BASED_COMMENTS: Record<string, string> = {
  // CBE levels
  EE1: "Outstanding performance! Exceeding all expectations. Keep up the excellent work.",
  EE2: "Excellent work. Consistently exceeding expectations in this subject.",
  ME1: "Good performance. Meeting expectations well. Keep it up!",
  ME2: "Satisfactory performance. Meeting expectations. A little more effort will help you excel.",
  AE1: "Approaching the expected standard. More practice and revision needed.",
  AE2: "Below the expected standard. Needs to put in more effort and seek help.",
  BE1: "Struggling with key concepts. Extra support and revision required.",
  BE2: "Significant improvement needed. Requires close attention and remedial work.",
  // 8-4-4 levels
  A: "Excellent performance! Outstanding mastery of the subject.",
  "A-": "Very strong performance. Keep up the great work.",
  "B+": "Very good work. Shows strong understanding of the subject.",
  B: "Good performance. Continue working hard.",
  "B-": "Good effort. A little more consistency needed.",
  "C+": "Fair performance. More dedication will yield better results.",
  C: "Average performance. Needs to put in more effort.",
  "C-": "Below average. Should seek extra help and revise more.",
  "D+": "Weak performance. Requires significant improvement.",
  D: "Poor performance. Needs close supervision and remedial support.",
  "D-": "Very weak. Urgent remedial attention needed.",
  E: "Critical. Requires intensive remedial intervention.",
  F: "Fail. Immediate intervention required.",
};

/** Get the appropriate comment for a student's grade level */
export function getCommentForGrade(actualLevel: string): string {
  return GRADE_BASED_COMMENTS[actualLevel] || "Continue working hard to improve your performance.";
}

/** Determine grade level from score using rubric grade ranges */
export function getGradeLevelFromScore(
  score: number,
  gradeRanges: Array<{ actual_level: string; min_mark: number; max_mark: number }>
): string | null {
  for (const range of gradeRanges) {
    if (score >= range.min_mark && score <= range.max_mark) {
      return range.actual_level;
    }
  }
  return null;
}

/**
 * Bulk auto-apply grade-based comments for all students in a stream/exam/subject.
 * Looks up each student's mark, determines grade, and upserts the comment.
 */
export async function bulkAutoApplyComments(
  examId: string,
  streamId: string,
  gradeId: string,
  subject: string,
  commentedBy: string,
  gradeRanges: Array<{ actual_level: string; min_mark: number; max_mark: number }>,
  customMappings?: Record<string, string>
): Promise<{ applied: number; skipped: number }> {
  // 1. Get students in the stream/grade
  const { data: students, error: studentsErr } = await supabase
    .from("students")
    .select("id")
    .eq("stream_id", streamId)
    .eq("grade_id", gradeId);

  if (studentsErr) throw studentsErr;
  if (!students || students.length === 0) return { applied: 0, skipped: 0 };

  const studentIds = students.map((s) => s.id);

  // 2. Get marks for these students in this exam/subject
  const { data: marks, error: marksErr } = await supabase
    .from("marks")
    .select("student_id, score, out_of")
    .eq("exam_id", examId)
    .eq("subject", subject)
    .in("student_id", studentIds);

  if (marksErr) throw marksErr;

  const markMap = new Map<string, number>();
  for (const m of marks || []) {
    // Normalize to percentage
    const pct = m.out_of > 0 ? (m.score / m.out_of) * 100 : m.score;
    markMap.set(m.student_id, pct);
  }

  let applied = 0;
  let skipped = 0;

  // 3. For each student, determine grade and upsert comment
  for (const studentId of studentIds) {
    const score = markMap.get(studentId);
    if (score === undefined) {
      skipped++;
      continue;
    }

    const level = getGradeLevelFromScore(score, gradeRanges);
    if (!level) {
      skipped++;
      continue;
    }

    const comment = customMappings?.[level] || getCommentForGrade(level);
    await upsertComment(studentId, examId, "subject_teacher", comment, commentedBy, subject);
    applied++;
  }

  return { applied, skipped };
}

export async function getCommentsForStudent(
  studentId: string,
  examId: string
): Promise<ReportComment[]> {
  const { data, error } = await supabase
    .from("report_card_comments" as any)
    .select("*")
    .eq("student_id", studentId)
    .eq("exam_id", examId);

  if (error) throw error;
  return (data || []) as unknown as ReportComment[];
}

export async function upsertComment(
  studentId: string,
  examId: string,
  commentType: CommentType,
  comment: string,
  commentedBy: string,
  subject?: string
): Promise<void> {
  // Use upsert with the unique constraint
  const record: Record<string, unknown> = {
    student_id: studentId,
    exam_id: examId,
    comment_type: commentType,
    comment,
    commented_by: commentedBy,
    subject: subject || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("report_card_comments" as any)
    .upsert(record as any, {
      onConflict: "student_id,exam_id,comment_type,subject",
    });

  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("report_card_comments" as any)
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}

export async function getBulkComments(
  studentIds: string[],
  examId: string
): Promise<Record<string, ReportComment[]>> {
  if (studentIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from("report_card_comments" as any)
    .select("*")
    .eq("exam_id", examId)
    .in("student_id", studentIds);

  if (error) throw error;

  const grouped: Record<string, ReportComment[]> = {};
  for (const comment of ((data || []) as unknown as ReportComment[])) {
    if (!grouped[comment.student_id]) grouped[comment.student_id] = [];
    grouped[comment.student_id].push(comment);
  }
  return grouped;
}
