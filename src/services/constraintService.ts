import { supabase } from "@/integrations/supabase/client";
import {
  TimetableConstraint,
  SubjectRoomRequirement,
  SubjectConfig,
  TeacherWithConstraints,
  RoomWithType,
} from "@/types/timetable";

// Fetch all constraints for a school
export const getTimetableConstraints = async (schoolId: string): Promise<TimetableConstraint[]> => {
  const { data, error } = await supabase
    .from("timetable_constraints")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true);

  if (error) throw error;

  return (data || []).map((c) => ({
    id: c.id,
    schoolId: c.school_id,
    constraintType: c.constraint_type as TimetableConstraint["constraintType"],
    entityId: c.entity_id,
    entityName: c.entity_name,
    maxValue: c.max_value,
    isActive: c.is_active,
  }));
};

// Create a new constraint
export const createTimetableConstraint = async (
  constraint: Omit<TimetableConstraint, "id">
): Promise<TimetableConstraint> => {
  const { data, error } = await supabase
    .from("timetable_constraints")
    .insert({
      school_id: constraint.schoolId,
      constraint_type: constraint.constraintType,
      entity_id: constraint.entityId,
      entity_name: constraint.entityName,
      max_value: constraint.maxValue,
      is_active: constraint.isActive,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    schoolId: data.school_id,
    constraintType: data.constraint_type as TimetableConstraint["constraintType"],
    entityId: data.entity_id,
    entityName: data.entity_name,
    maxValue: data.max_value,
    isActive: data.is_active,
  };
};

// Update a constraint
export const updateTimetableConstraint = async (
  id: string,
  updates: Partial<TimetableConstraint>
): Promise<TimetableConstraint> => {
  const { data, error } = await supabase
    .from("timetable_constraints")
    .update({
      max_value: updates.maxValue,
      is_active: updates.isActive,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    schoolId: data.school_id,
    constraintType: data.constraint_type as TimetableConstraint["constraintType"],
    entityId: data.entity_id,
    entityName: data.entity_name,
    maxValue: data.max_value,
    isActive: data.is_active,
  };
};

// Delete a constraint
export const deleteTimetableConstraint = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("timetable_constraints").delete().eq("id", id);
  if (error) throw error;
  return true;
};

// Get subject room requirements
export const getSubjectRoomRequirements = async (
  schoolId: string
): Promise<SubjectRoomRequirement[]> => {
  const { data, error } = await supabase
    .from("subject_room_requirements")
    .select("*")
    .eq("school_id", schoolId);

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    schoolId: r.school_id,
    subjectId: r.subject_id,
    roomId: r.room_id,
    roomType: r.room_type,
    isMandatory: r.is_mandatory,
  }));
};

// Create subject room requirement
export const createSubjectRoomRequirement = async (
  requirement: Omit<SubjectRoomRequirement, "id">
): Promise<SubjectRoomRequirement> => {
  const { data, error } = await supabase
    .from("subject_room_requirements")
    .insert({
      school_id: requirement.schoolId,
      subject_id: requirement.subjectId,
      room_id: requirement.roomId,
      room_type: requirement.roomType,
      is_mandatory: requirement.isMandatory,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    schoolId: data.school_id,
    subjectId: data.subject_id,
    roomId: data.room_id,
    roomType: data.room_type,
    isMandatory: data.is_mandatory,
  };
};

// Delete subject room requirement
export const deleteSubjectRoomRequirement = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("subject_room_requirements").delete().eq("id", id);
  if (error) throw error;
  return true;
};

// Get enhanced subjects with type and pathway info
export const getEnhancedSubjects = async (
  schoolId: string,
  divisionId?: string | null
): Promise<SubjectConfig[]> => {
  let query = supabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true);

  // Filter by division if provided
  if (divisionId) {
    query = query.eq("division_id", divisionId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Deduplicate by name (in case of duplicates)
  const seen = new Set<string>();
  const dedupedData = (data || []).filter((s) => {
    const key = `${s.name}-${s.division_id || "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return dedupedData.map((s) => ({
    id: s.id,
    name: s.name,
    subjectType: (s.subject_type || "core") as SubjectConfig["subjectType"],
    pathway: s.pathway as SubjectConfig["pathway"],
    maxLessonsPerWeek: s.max_lessons_per_week || 10,
    requiresSpecialRoom: s.requires_special_room || false,
    specialRoomType: s.special_room_type,
    curriculum: s.curriculum,
  }));
};

// Update subject type and configuration
export const updateSubjectConfig = async (
  id: string,
  config: Partial<SubjectConfig>
): Promise<void> => {
  const { error } = await supabase
    .from("subjects")
    .update({
      subject_type: config.subjectType,
      pathway: config.pathway,
      max_lessons_per_week: config.maxLessonsPerWeek,
      requires_special_room: config.requiresSpecialRoom,
      special_room_type: config.specialRoomType,
    })
    .eq("id", id);

  if (error) throw error;
};

// Get teachers with constraint info
export const getTeachersWithConstraints = async (
  schoolId: string
): Promise<TeacherWithConstraints[]> => {
  const { data, error } = await supabase
    .from("teachers")
    .select("id, name, max_lessons_per_week, subjects_taught, subject")
    .eq("school_id", schoolId)
    .eq("status", "active");

  if (error) throw error;

  return (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    maxLessonsPerWeek: t.max_lessons_per_week || 30,
    currentWeeklyLessons: 0, // Will be calculated during generation
    subjectsTaught: t.subjects_taught || [t.subject],
  }));
};

// Update teacher max lessons
export const updateTeacherMaxLessons = async (
  teacherId: string,
  maxLessons: number
): Promise<void> => {
  const { error } = await supabase
    .from("teachers")
    .update({ max_lessons_per_week: maxLessons })
    .eq("id", teacherId);

  if (error) throw error;
};

// Get rooms with type info
export const getRoomsWithType = async (schoolId: string): Promise<RoomWithType[]> => {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, room_type, is_shared, capacity")
    .eq("school_id", schoolId);

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    roomType: r.room_type,
    isShared: r.is_shared || false,
    capacity: r.capacity,
  }));
};

// Validate constraints before generation
export const validateConstraints = (
  teachers: TeacherWithConstraints[],
  subjects: SubjectConfig[],
  lessonCounts: Record<string, number>,
  totalSlotsPerWeek: number
): string[] => {
  const warnings: string[] = [];

  // Calculate total required lessons
  let totalRequiredLessons = 0;
  Object.values(lessonCounts).forEach((count) => {
    totalRequiredLessons += count;
  });

  if (totalRequiredLessons > totalSlotsPerWeek) {
    warnings.push(
      `Total required lessons (${totalRequiredLessons}) exceeds available slots (${totalSlotsPerWeek}). Some subjects may not fit.`
    );
  }

  // Check teacher availability
  const teacherSubjectMap: Record<string, string[]> = {};
  teachers.forEach((t) => {
    t.subjectsTaught.forEach((s) => {
      if (!teacherSubjectMap[s]) teacherSubjectMap[s] = [];
      teacherSubjectMap[s].push(t.name);
    });
  });

  subjects.forEach((subject) => {
    if (!teacherSubjectMap[subject.name] || teacherSubjectMap[subject.name].length === 0) {
      warnings.push(`No teacher available for ${subject.name}.`);
    }
  });

  return warnings;
};
