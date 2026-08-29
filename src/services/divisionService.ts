/**
 * Division Service
 *
 * Manages school divisions — organizational units that group grade levels
 * within a curriculum. For example:
 * - CBC: Lower Primary (1-3), Upper Primary (4-6), Junior Secondary (7-9)
 * - CBC Senior: Senior Secondary (10-12)
 * - 8-4-4: Forms 1-4
 *
 * Provides default configurations for each curriculum type and
 * CRUD operations for custom division management.
 */
import { supabase } from "@/integrations/supabase/client";

export type DivisionType = 
  | "lower_primary" 
  | "upper_primary" 
  | "junior_secondary" 
  | "senior_secondary" 
  | "8-4-4";

export interface SchoolDivision {
  id: string;
  school_id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  curriculum: string;
  grade_level_start: number;
  grade_level_end: number;
  division_type: DivisionType;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DivisionConfig {
  type: DivisionType;
  name: string;
  shortName: string;
  description: string;
  curriculum: string;
  gradeLevelStart: number;
  gradeLevelEnd: number;
  displayOrder: number;
}

// Default division configurations for CBE Primary/Junior Secondary
export const cbcDivisionConfigs: DivisionConfig[] = [
  {
    type: "lower_primary",
    name: "Lower Primary",
    shortName: "LP",
    description: "Grade 1 to Grade 3 - Foundation years with activity-based learning",
    curriculum: "cbc",
    gradeLevelStart: 1,
    gradeLevelEnd: 3,
    displayOrder: 1,
  },
  {
    type: "upper_primary",
    name: "Upper Primary",
    shortName: "UP",
    description: "Grade 4 to Grade 6 - Transition to structured learning",
    curriculum: "cbc",
    gradeLevelStart: 4,
    gradeLevelEnd: 6,
    displayOrder: 2,
  },
  {
    type: "junior_secondary",
    name: "Junior Secondary",
    shortName: "JS",
    description: "Grade 7 to Grade 9 - Preparation for senior secondary",
    curriculum: "cbc",
    gradeLevelStart: 7,
    gradeLevelEnd: 9,
    displayOrder: 3,
  },
];

// Default division configuration for CBE Senior Secondary
export const cbcSeniorDivisionConfig: DivisionConfig = {
  type: "senior_secondary",
  name: "Senior Secondary",
  shortName: "SS",
  description: "Grade 10 to Grade 12 - Pathway-based specialization",
  curriculum: "cbc-senior",
  gradeLevelStart: 10,
  gradeLevelEnd: 12,
  displayOrder: 4,
};

// Default division configuration for 8-4-4 System
export const system844DivisionConfig: DivisionConfig = {
  type: "8-4-4",
  name: "8-4-4 Secondary",
  shortName: "844",
  description: "Form 1 to Form 4 - Traditional secondary curriculum",
  curriculum: "8-4-4",
  gradeLevelStart: 1,
  gradeLevelEnd: 4,
  displayOrder: 5,
};

/**
 * Get default divisions based on curriculum types
 */
export function getDefaultDivisionsForCurricula(curriculumTypes: string[]): DivisionConfig[] {
  const divisions: DivisionConfig[] = [];
  
  if (curriculumTypes.includes("cbc")) {
    divisions.push(...cbcDivisionConfigs);
  }
  
  if (curriculumTypes.includes("cbc-senior")) {
    divisions.push(cbcSeniorDivisionConfig);
  }
  
  if (curriculumTypes.includes("8-4-4")) {
    divisions.push(system844DivisionConfig);
  }
  
  return divisions.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Create default divisions for a school based on its curriculum types
 */
export async function createDefaultDivisions(
  schoolId: string, 
  curriculumTypes: string[]
): Promise<SchoolDivision[]> {
  const defaultConfigs = getDefaultDivisionsForCurricula(curriculumTypes);
  
  const divisionsToInsert = defaultConfigs.map(config => ({
    school_id: schoolId,
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    curriculum: config.curriculum,
    grade_level_start: config.gradeLevelStart,
    grade_level_end: config.gradeLevelEnd,
    division_type: config.type,
    display_order: config.displayOrder,
    is_active: true,
  }));
  
  const { data, error } = await supabase
    .from("school_divisions")
    .insert(divisionsToInsert)
    .select();
    
  if (error) {
    console.error("Error creating default divisions:", error);
    throw error;
  }
  
  return data as SchoolDivision[];
}

/**
 * Get all divisions for a school
 */
export async function getSchoolDivisions(schoolId: string): Promise<SchoolDivision[]> {
  const { data, error } = await supabase
    .from("school_divisions")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("display_order");
    
  if (error) {
    console.error("Error fetching school divisions:", error);
    throw error;
  }
  
  return data as SchoolDivision[];
}

/**
 * Get a specific division by ID
 */
export async function getDivisionById(divisionId: string): Promise<SchoolDivision | null> {
  const { data, error } = await supabase
    .from("school_divisions")
    .select("*")
    .eq("id", divisionId)
    .single();
    
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error fetching division:", error);
    throw error;
  }
  
  return data as SchoolDivision;
}

/**
 * Update a division
 */
export async function updateDivision(
  divisionId: string, 
  updates: Partial<Omit<SchoolDivision, "id" | "school_id" | "created_at" | "updated_at">>
): Promise<SchoolDivision> {
  const { data, error } = await supabase
    .from("school_divisions")
    .update(updates)
    .eq("id", divisionId)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating division:", error);
    throw error;
  }
  
  return data as SchoolDivision;
}

/**
 * Delete a division (soft delete by setting is_active to false)
 */
export async function deleteDivision(divisionId: string): Promise<void> {
  const { error } = await supabase
    .from("school_divisions")
    .update({ is_active: false })
    .eq("id", divisionId);
    
  if (error) {
    console.error("Error deleting division:", error);
    throw error;
  }
}

/**
 * Get division for a specific grade level
 */
export async function getDivisionForGradeLevel(
  schoolId: string, 
  gradeLevel: number,
  curriculum: string
): Promise<SchoolDivision | null> {
  const { data, error } = await supabase
    .from("school_divisions")
    .select("*")
    .eq("school_id", schoolId)
    .eq("curriculum", curriculum)
    .eq("is_active", true)
    .lte("grade_level_start", gradeLevel)
    .gte("grade_level_end", gradeLevel)
    .single();
    
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error fetching division for grade:", error);
    throw error;
  }
  
  return data as SchoolDivision;
}

/**
 * Assign a grade to a division
 */
export async function assignGradeToDivision(
  gradeId: string, 
  divisionId: string
): Promise<void> {
  const { error } = await supabase
    .from("grades")
    .update({ division_id: divisionId })
    .eq("id", gradeId);
    
  if (error) {
    console.error("Error assigning grade to division:", error);
    throw error;
  }
}

/**
 * Assign a teacher to a division
 */
export async function assignTeacherToDivision(
  teacherId: string, 
  divisionId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("teachers")
    .update({ division_id: divisionId })
    .eq("id", teacherId);
    
  if (error) {
    console.error("Error assigning teacher to division:", error);
    throw error;
  }
}

/**
 * Get teachers by division
 */
export async function getTeachersByDivision(
  schoolId: string, 
  divisionId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("school_id", schoolId)
    .eq("division_id", divisionId)
    .eq("status", "active");
    
  if (error) {
    console.error("Error fetching teachers by division:", error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get grades by division
 */
export async function getGradesByDivision(divisionId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .eq("division_id", divisionId)
    .eq("is_active", true)
    .order("level");
    
  if (error) {
    console.error("Error fetching grades by division:", error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get subjects by division
 */
export async function getSubjectsByDivision(
  schoolId: string, 
  divisionId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .eq("division_id", divisionId)
    .eq("is_active", true);
    
  if (error) {
    console.error("Error fetching subjects by division:", error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get timetable configurations by division
 */
export async function getTimetableConfigsByDivision(
  schoolId: string, 
  divisionId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("timetable_configurations")
    .select("*")
    .eq("school_id", schoolId)
    .eq("division_id", divisionId)
    .eq("is_active", true);
    
  if (error) {
    console.error("Error fetching timetable configs by division:", error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get division display name with grade range
 */
export function getDivisionDisplayName(division: SchoolDivision): string {
  const gradeTerm = division.curriculum === "8-4-4" ? "Form" : "Grade";
  return `${division.name} (${gradeTerm} ${division.grade_level_start}-${division.grade_level_end})`;
}

/**
 * Check if a school has divisions configured
 */
export async function hasDivisionsConfigured(schoolId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("school_divisions")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", true);
    
  if (error) {
    console.error("Error checking divisions:", error);
    return false;
  }
  
  return (count || 0) > 0;
}

/**
 * Get divisions for dropdown selection
 */
export async function getDivisionsForDropdown(
  schoolId: string
): Promise<{ value: string; label: string; shortName: string }[]> {
  const divisions = await getSchoolDivisions(schoolId);
  
  return divisions.map(div => ({
    value: div.id,
    label: getDivisionDisplayName(div),
    shortName: div.short_name || div.name.substring(0, 2).toUpperCase(),
  }));
}
