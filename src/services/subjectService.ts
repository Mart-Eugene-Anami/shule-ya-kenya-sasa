 import { supabase } from "@/integrations/supabase/client";
 import { getSubjectsByCurriculum, type Subject as CurriculumSubject, type CBCSeniorPathway } from "./curriculumService";
 
 export type SubjectType = "core" | "optional" | "elective";
 
 export interface SchoolSubject {
   id: string;
   school_id: string;
   name: string;
   curriculum: string;
   division_id: string | null;
   is_active: boolean;
   created_at: string;
   updated_at: string;
  subject_type: string;
  pathway: string | null;
  max_lessons_per_week: number | null;
 }
 
 export interface SubjectsByDivision {
   divisionId: string;
   divisionName: string;
   curriculum: string;
   subjects: SchoolSubject[];
 }
 
 /**
  * Get unique subject names for a school (deduplicated across divisions).
  * Subjects with the same name in different divisions are treated as the same subject.
  */
 export function getUniqueSubjectNames(subjects: SchoolSubject[]): string[] {
   return [...new Set(subjects.map(s => s.name))].sort();
 }

 /**
  * Get all subjects for a school
  */
 export async function getSchoolSubjects(schoolId: string): Promise<SchoolSubject[]> {
   const { data, error } = await supabase
     .from("subjects")
     .select("*")
     .eq("school_id", schoolId)
     .eq("is_active", true)
     .order("name");

   if (error) {
     console.error("Error fetching school subjects:", error);
     throw error;
   }

   return data as SchoolSubject[];
 }
 
 /**
  * Get subjects by division
  */
 export async function getSubjectsByDivision(
   schoolId: string,
   divisionId: string
 ): Promise<SchoolSubject[]> {
   const { data, error } = await supabase
     .from("subjects")
     .select("*")
     .eq("school_id", schoolId)
     .eq("division_id", divisionId)
     .eq("is_active", true)
     .order("name");
 
   if (error) {
     console.error("Error fetching subjects by division:", error);
     throw error;
   }
 
   return data as SchoolSubject[];
 }
 
 /**
  * Get subjects grouped by division
  */
 export async function getSubjectsGroupedByDivision(
   schoolId: string
 ): Promise<SubjectsByDivision[]> {
   const { data: divisions, error: divError } = await supabase
     .from("school_divisions")
     .select("*")
     .eq("school_id", schoolId)
     .eq("is_active", true)
     .order("display_order");
 
   if (divError) {
     console.error("Error fetching divisions:", divError);
     throw divError;
   }
 
   const { data: subjects, error: subError } = await supabase
     .from("subjects")
     .select("*")
     .eq("school_id", schoolId)
     .eq("is_active", true)
     .order("name");
 
   if (subError) {
     console.error("Error fetching subjects:", subError);
     throw subError;
   }
 
   const grouped: SubjectsByDivision[] = divisions?.map((div) => ({
     divisionId: div.id,
     divisionName: div.name,
     curriculum: div.curriculum,
     subjects: subjects?.filter((s) => s.division_id === div.id) || [],
   })) || [];
 
   const unassignedSubjects = subjects?.filter((s) => !s.division_id) || [];
   if (unassignedSubjects.length > 0) {
     grouped.push({
       divisionId: "unassigned",
       divisionName: "Unassigned Subjects",
       curriculum: "mixed",
       subjects: unassignedSubjects,
     });
   }
 
   return grouped;
 }
 
 /**
  * Create a subject for a school
  */
 export async function createSubject(
   schoolId: string,
   name: string,
   curriculum: string,
   divisionId?: string,
   subjectType: SubjectType = "core",
   pathway?: CBCSeniorPathway | null
 ): Promise<SchoolSubject> {
   const { data, error } = await supabase
     .from("subjects")
     .insert({
       school_id: schoolId,
       name,
       curriculum,
       division_id: divisionId || null,
       is_active: true,
       subject_type: subjectType,
       pathway: pathway || null,
     })
     .select()
     .single();
 
   if (error) {
     console.error("Error creating subject:", error);
     throw error;
   }
 
   return data as SchoolSubject;
 }
 
 /**
  * Create multiple subjects for a division
  */
 export async function createSubjectsForDivision(
   schoolId: string,
   divisionId: string,
   curriculum: string,
   subjectNames: string[],
   subjectType: SubjectType = "core",
   pathway?: CBCSeniorPathway | null
 ): Promise<SchoolSubject[]> {
   const subjectsToInsert = subjectNames.map((name) => ({
     school_id: schoolId,
     name,
     curriculum,
     division_id: divisionId,
     is_active: true,
     subject_type: subjectType,
     pathway: pathway || null,
   }));
 
   const { data, error } = await supabase
     .from("subjects")
     .insert(subjectsToInsert)
     .select();
 
   if (error) {
     console.error("Error creating subjects for division:", error);
     throw error;
   }
 
   return data as SchoolSubject[];
 }
 
 /**
  * Update a subject
  */
 export async function updateSubject(
   subjectId: string,
   updates: Partial<Pick<SchoolSubject, "name" | "curriculum" | "division_id" | "is_active" | "subject_type" | "pathway">>
 ): Promise<SchoolSubject> {
   const { data, error } = await supabase
     .from("subjects")
     .update(updates)
     .eq("id", subjectId)
     .select()
     .single();
 
   if (error) {
     console.error("Error updating subject:", error);
     throw error;
   }
 
   return data as SchoolSubject;
 }
 
 /**
  * Delete a subject (soft delete)
  */
 export async function deleteSubject(subjectId: string): Promise<void> {
   const { error } = await supabase
     .from("subjects")
     .update({ is_active: false })
     .eq("id", subjectId);
 
   if (error) {
     console.error("Error deleting subject:", error);
     throw error;
   }
 }
 
 /**
  * Assign subject to a division
  */
 export async function assignSubjectToDivision(
   subjectId: string,
   divisionId: string | null
 ): Promise<void> {
   const { error } = await supabase
     .from("subjects")
     .update({ division_id: divisionId })
     .eq("id", subjectId);
 
   if (error) {
     console.error("Error assigning subject to division:", error);
     throw error;
   }
 }
 
 /**
  * Get default subjects for a curriculum (from curriculumService)
  */
 export function getDefaultSubjectsForCurriculum(curriculum: string): CurriculumSubject[] {
   return getSubjectsByCurriculum(curriculum as any);
 }
 
 /**
  * Bulk assign subjects to division
  */
 export async function bulkAssignSubjectsToDivision(
   subjectIds: string[],
   divisionId: string
 ): Promise<void> {
   const { error } = await supabase
     .from("subjects")
     .update({ division_id: divisionId })
     .in("id", subjectIds);
 
   if (error) {
     console.error("Error bulk assigning subjects:", error);
     throw error;
   }
 }
 
 /**
  * Get CBE Senior subjects grouped by type and pathway
  */
 export async function getCBCSeniorSubjects(
   schoolId: string,
   divisionId: string
 ): Promise<{
   coreSubjects: SchoolSubject[];
  optionalByPathway: Record<string, SchoolSubject[]>;
 }> {
   const { data, error } = await supabase
     .from("subjects")
     .select("*")
     .eq("school_id", schoolId)
     .eq("division_id", divisionId)
     .eq("curriculum", "cbc-senior")
     .eq("is_active", true)
     .order("name");
 
   if (error) {
     console.error("Error fetching CBE Senior subjects:", error);
     throw error;
   }
 
   const subjects = data as SchoolSubject[];
   
   const coreSubjects = subjects.filter(s => s.subject_type === "core");
  const optionalByPathway: Record<string, SchoolSubject[]> = {
     stem: subjects.filter(s => s.subject_type !== "core" && s.pathway === "stem"),
     arts_sports: subjects.filter(s => s.subject_type !== "core" && s.pathway === "arts_sports"),
     social_sciences: subjects.filter(s => s.subject_type !== "core" && s.pathway === "social_sciences"),
   };
 
   return { coreSubjects, optionalByPathway };
 }