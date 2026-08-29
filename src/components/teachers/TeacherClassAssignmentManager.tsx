import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeacherSubjectAssignment } from "@/components/timetable/TeacherSubjectAssignment";
import {
  getTeacherAssignments,
  createTeacherAssignment,
  deleteTeacherAssignment,
  replaceTeacherAssignmentsForStream,
} from "@/services/teacherAssignmentService";
import { getTeachers, getActiveAcademicYear } from "@/services/academicService";
import { Teacher } from "@/types";

export function TeacherClassAssignmentManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const schoolId = user?.schoolId || "";

  const { data: academicYear } = useQuery({
    queryKey: ["activeAcademicYear", schoolId],
    queryFn: () => getActiveAcademicYear(schoolId),
    enabled: !!schoolId,
  });


  const { data: dbSubjects = [] } = useQuery({
    queryKey: ["subjects", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, curriculum, division_id")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch grades with level, curriculum, and division_id
  const { data: grades = [] } = useQuery({
    queryKey: ["grades", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("id, division_id, level, curriculum")
        .eq("school_id", schoolId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch school divisions to resolve grades without division_id
  const { data: divisions = [] } = useQuery({
    queryKey: ["schoolDivisions", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_divisions")
        .select("id, curriculum, grade_level_start, grade_level_end")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Build a map: gradeId -> division_id (resolving nulls via level/curriculum match)
  const gradeDivisionMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const g of grades) {
      if (g.division_id) {
        map[g.id] = g.division_id;
      } else {
        // Find matching division by grade level and curriculum
        const matchedDiv = divisions.find(
          (d) =>
            d.curriculum === g.curriculum &&
            g.level >= d.grade_level_start &&
            g.level <= d.grade_level_end
        );
        map[g.id] = matchedDiv?.id || null;
      }
    }
    return map;
  }, [grades, divisions]);

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: () => getTeachers(schoolId),
    enabled: !!schoolId,
  });

  const { data: gradeStreams = [] } = useQuery({
    queryKey: ["gradeStreams", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_streams")
        .select(`
          id, grade_id, stream_id,
          grades!inner(id, name, school_id),
          streams!inner(id, name)
        `)
        .eq("grades.school_id", schoolId);
      if (error) throw error;
      return (data || []).map((gs: any) => ({
        id: gs.id,
        gradeId: gs.grade_id,
        streamId: gs.stream_id,
        gradeName: gs.grades?.name || "",
        streamName: gs.streams?.name || "",
      }));
    },
    enabled: !!schoolId,
  });

  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ["teacherAssignments", schoolId, academicYear?.id],
    queryFn: () => getTeacherAssignments(schoolId, academicYear?.id || ""),
    enabled: !!schoolId && !!academicYear?.id,
  });

  const handleAddAssignment = async (assignment: any) => {
    await createTeacherAssignment(assignment);
  };

  const handleDeleteAssignment = async (id: string) => {
    await deleteTeacherAssignment(id);
  };

  const handleReplaceAssignmentsBatch = async (
    gradeStreamId: string,
    assignments: Array<{ subject: string; teacherId: string }>
  ) => {
    await replaceTeacherAssignmentsForStream({
      gradeStreamId,
      academicYearId: academicYear.id,
      assignments,
    });
  };

  if (!academicYear) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active academic year found. Please set up an academic year first.
      </div>
    );
  }

  return (
    <TeacherSubjectAssignment
      gradeStreams={gradeStreams}
      teachers={teachers.map((t: Teacher) => ({
        id: t.id,
        name: t.name,
        email: t.email || "",
        subject: t.subject || "",
        subjectsTaught: t.subjectsTaught,
      }))}
      allSubjects={dbSubjects}
      gradeDivisionMap={gradeDivisionMap}
      academicYearId={academicYear.id}
      assignments={teacherAssignments}
      onAddAssignment={handleAddAssignment}
      onDeleteAssignment={handleDeleteAssignment}
      onReplaceAssignmentsBatch={handleReplaceAssignmentsBatch}
      onRefreshAssignments={() => {
        queryClient.invalidateQueries({ queryKey: ["teacherAssignments", schoolId, academicYear.id] });
      }}
    />
  );
}
