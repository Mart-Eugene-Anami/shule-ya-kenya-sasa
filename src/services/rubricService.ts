import { supabase } from "@/integrations/supabase/client";
import { Rubric, RubricGradeRange, DEFAULT_RUBRIC_TEMPLATE } from "@/types/marks";

interface RubricInput {
  name: string;
  subject: string;
  school_id: string;
  grade_ranges: RubricGradeRange[];
  is_active?: boolean;
  is_multi_subject?: boolean;
  subjects?: string[];
  created_by: string;
}

// Transform database row to Rubric type
const transformRubric = (row: any): Rubric => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  school_id: row.school_id,
  grade_ranges: row.grade_ranges as RubricGradeRange[],
  is_active: row.is_active ?? true,
  is_multi_subject: row.is_multi_subject ?? false,
  subjects: row.subjects ?? [],
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const rubricService = {
  // Get all rubrics for a school
  async getRubrics(schoolId: string): Promise<Rubric[]> {
    const { data, error } = await supabase
      .from("rubrics")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(transformRubric);
  },

  // Get active rubrics for a school
  async getActiveRubrics(schoolId: string): Promise<Rubric[]> {
    const { data, error } = await supabase
      .from("rubrics")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return (data || []).map(transformRubric);
  },

  // Get rubric by subject - checks individual rubric first, then falls back to multi-subject rubric
  async getRubricBySubject(schoolId: string, subject: string): Promise<Rubric | null> {
    // First try: individual rubric for this specific subject
    const { data: individual, error: err1 } = await supabase
      .from("rubrics")
      .select("*")
      .eq("school_id", schoolId)
      .eq("subject", subject)
      .eq("is_active", true)
      .eq("is_multi_subject", false)
      .single();

    if (individual && !err1) return transformRubric(individual);
    if (err1 && err1.code !== "PGRST116") throw err1;

    // Fallback: multi-subject rubric that contains this subject
    const { data: multiRubrics, error: err2 } = await supabase
      .from("rubrics")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .eq("is_multi_subject", true)
      .contains("subjects", [subject]);

    if (err2) throw err2;
    return multiRubrics && multiRubrics.length > 0 ? transformRubric(multiRubrics[0]) : null;
  },

  // Get rubric by ID
  async getRubricById(id: string): Promise<Rubric | null> {
    const { data, error } = await supabase
      .from("rubrics")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? transformRubric(data) : null;
  },

  // Create a new rubric
  async createRubric(input: RubricInput): Promise<Rubric> {
    const { data, error } = await supabase
      .from("rubrics")
      .insert([{
        name: input.name,
        subject: input.subject,
        school_id: input.school_id,
        grade_ranges: input.grade_ranges as unknown as import("@/integrations/supabase/types").Json,
        is_active: input.is_active ?? true,
        is_multi_subject: input.is_multi_subject ?? false,
        subjects: input.subjects ?? [],
        created_by: input.created_by,
      }])
      .select()
      .single();

    if (error) throw error;
    return transformRubric(data);
  },

  // Create default rubric for a subject
  async createDefaultRubric(schoolId: string, subject: string, createdBy: string): Promise<Rubric> {
    return this.createRubric({
      name: `${subject} - CBE Rubric`,
      subject,
      school_id: schoolId,
      grade_ranges: DEFAULT_RUBRIC_TEMPLATE,
      is_active: true,
      created_by: createdBy,
    });
  },

  // Update a rubric
  async updateRubric(id: string, updates: Partial<RubricInput>): Promise<Rubric> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.grade_ranges !== undefined) updateData.grade_ranges = updates.grade_ranges;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.is_multi_subject !== undefined) updateData.is_multi_subject = updates.is_multi_subject;
    if (updates.subjects !== undefined) updateData.subjects = updates.subjects;

    const { data, error } = await supabase
      .from("rubrics")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return transformRubric(data);
  },

  // Toggle rubric active status
  async toggleRubricStatus(id: string, isActive: boolean): Promise<Rubric> {
    return this.updateRubric(id, { is_active: isActive });
  },

  // Delete a rubric
  async deleteRubric(id: string): Promise<void> {
    const { error } = await supabase
      .from("rubrics")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Calculate grade from raw mark using rubric
  calculateGrade(rawMark: number, gradeRanges: RubricGradeRange[]): { 
    actualLevel: string; 
    performanceLevel: string;
    points: number 
  } | null {
    for (const range of gradeRanges) {
      if (rawMark >= range.min_mark && rawMark <= range.max_mark) {
        return {
          actualLevel: range.actual_level,
          performanceLevel: range.performance_level,
          points: range.points,
        };
      }
    }
    return null;
  },

  // Get default template
  getDefaultTemplate(): RubricGradeRange[] {
    return [...DEFAULT_RUBRIC_TEMPLATE];
  },
};
