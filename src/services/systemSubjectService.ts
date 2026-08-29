import { supabase } from "@/integrations/supabase/client";

export interface SystemSubject {
  id: string;
  name: string;
  curriculum: string;
  division_type: string;
  pathway: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SystemSubjectsByDivision {
  curriculum: string;
  divisionType: string;
  divisionLabel: string;
  subjects: SystemSubject[];
}

// Division type labels for display
export const divisionTypeLabels: Record<string, string> = {
  lower_primary: "Lower Primary (Grade 1-3)",
  upper_primary: "Upper Primary (Grade 4-6)",
  junior_secondary: "Junior Secondary (Grade 7-9)",
  senior_secondary: "Senior Secondary (Grade 10-12)",
  secondary: "Secondary (Form 1-4)",
};

// Get curriculum label
export const getCurriculumLabel = (curriculum: string): string => {
  switch (curriculum) {
     case "cbc":
       return "CBE";
     case "cbc-senior":
       return "CBE Senior";
    case "8-4-4":
      return "8-4-4";
    default:
      return curriculum.toUpperCase();
  }
};

// Pathway labels
export const pathwayLabels: Record<string, string> = {
  core: "Core Subjects",
  stem: "STEM Pathway",
  arts_sports: "Arts & Sports Science",
  social_sciences: "Social Sciences",
};

/**
 * Get all system subjects
 */
export async function getAllSystemSubjects(): Promise<SystemSubject[]> {
  const { data, error } = await supabase
    .from("system_subjects")
    .select("*")
    .order("curriculum")
    .order("division_type")
    .order("display_order");

  if (error) {
    console.error("Error fetching system subjects:", error);
    throw error;
  }

  return data as SystemSubject[];
}

/**
 * Get system subjects grouped by curriculum and division
 */
export async function getSystemSubjectsGrouped(): Promise<SystemSubjectsByDivision[]> {
  const subjects = await getAllSystemSubjects();
  
  // Group by curriculum and division_type
  const groupMap = new Map<string, SystemSubjectsByDivision>();
  
  subjects.forEach((subject) => {
    const key = `${subject.curriculum}-${subject.division_type}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        curriculum: subject.curriculum,
        divisionType: subject.division_type,
        divisionLabel: divisionTypeLabels[subject.division_type] || subject.division_type,
        subjects: [],
      });
    }
    groupMap.get(key)!.subjects.push(subject);
  });
  
  return Array.from(groupMap.values());
}

/**
 * Get system subjects by curriculum
 */
export async function getSystemSubjectsByCurriculum(curriculum: string): Promise<SystemSubject[]> {
  const { data, error } = await supabase
    .from("system_subjects")
    .select("*")
    .eq("curriculum", curriculum)
    .eq("is_active", true)
    .order("division_type")
    .order("display_order");

  if (error) {
    console.error("Error fetching system subjects by curriculum:", error);
    throw error;
  }

  return data as SystemSubject[];
}

/**
 * Get system subjects by division type
 */
export async function getSystemSubjectsByDivisionType(
  curriculum: string,
  divisionType: string
): Promise<SystemSubject[]> {
  const { data, error } = await supabase
    .from("system_subjects")
    .select("*")
    .eq("curriculum", curriculum)
    .eq("division_type", divisionType)
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    console.error("Error fetching system subjects by division:", error);
    throw error;
  }

  return data as SystemSubject[];
}

/**
 * Create a new system subject
 */
export async function createSystemSubject(
  name: string,
  curriculum: string,
  divisionType: string,
  pathway?: string
): Promise<SystemSubject> {
  // Get max display_order for this curriculum/division
  const { data: existing } = await supabase
    .from("system_subjects")
    .select("display_order")
    .eq("curriculum", curriculum)
    .eq("division_type", divisionType)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

  const { data, error } = await supabase
    .from("system_subjects")
    .insert({
      name,
      curriculum,
      division_type: divisionType,
      pathway: pathway || null,
      display_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating system subject:", error);
    throw error;
  }

  return data as SystemSubject;
}

/**
 * Update a system subject
 */
export async function updateSystemSubject(
  id: string,
  updates: Partial<Pick<SystemSubject, "name" | "pathway" | "is_active" | "display_order">>
): Promise<SystemSubject> {
  const { data, error } = await supabase
    .from("system_subjects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating system subject:", error);
    throw error;
  }

  return data as SystemSubject;
}

/**
 * Delete a system subject
 */
export async function deleteSystemSubject(id: string): Promise<void> {
  const { error } = await supabase
    .from("system_subjects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting system subject:", error);
    throw error;
  }
}

/**
 * Toggle subject active status
 */
export async function toggleSystemSubjectActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("system_subjects")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("Error toggling system subject:", error);
    throw error;
  }
}
