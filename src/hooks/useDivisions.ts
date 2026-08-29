import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  SchoolDivision, 
  getSchoolDivisions, 
  getDivisionForGradeLevel,
  hasDivisionsConfigured,
  createDefaultDivisions,
} from "@/services/divisionService";
import { supabase } from "@/integrations/supabase/client";

interface UseDivisionsResult {
  divisions: SchoolDivision[];
  loading: boolean;
  error: Error | null;
  hasDivisions: boolean;
  refetch: () => Promise<void>;
  getDivisionForGrade: (gradeLevel: number, curriculum: string) => SchoolDivision | null;
  initializeDivisions: () => Promise<void>;
}

/**
 * Hook to manage school divisions
 */
export function useDivisions(): UseDivisionsResult {
  const { user } = useAuth();
  const [divisions, setDivisions] = useState<SchoolDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasDivisions, setHasDivisions] = useState(false);

  const fetchDivisions = async () => {
    if (!user?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await getSchoolDivisions(user.schoolId);
      setDivisions(data);
      setHasDivisions(data.length > 0);
    } catch (err) {
      console.error("Error fetching divisions:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch divisions"));
    } finally {
      setLoading(false);
    }
  };

  const initializeDivisions = async () => {
    if (!user?.schoolId) return;

    try {
      // Check if divisions already exist
      const exists = await hasDivisionsConfigured(user.schoolId);
      if (exists) {
        await fetchDivisions();
        return;
      }

      // Get school curriculum types
      const { data: school } = await supabase
        .from("schools")
        .select("curriculum_types")
        .eq("id", user.schoolId)
        .single();

      if (school?.curriculum_types && school.curriculum_types.length > 0) {
        await createDefaultDivisions(user.schoolId, school.curriculum_types);
        await fetchDivisions();
      }
    } catch (err) {
      console.error("Error initializing divisions:", err);
      setError(err instanceof Error ? err : new Error("Failed to initialize divisions"));
    }
  };

  const getDivisionForGrade = (gradeLevel: number, curriculum: string): SchoolDivision | null => {
    return divisions.find(
      div => 
        div.curriculum === curriculum && 
        gradeLevel >= div.grade_level_start && 
        gradeLevel <= div.grade_level_end
    ) || null;
  };

  useEffect(() => {
    fetchDivisions();
  }, [user?.schoolId]);

  return {
    divisions,
    loading,
    error,
    hasDivisions,
    refetch: fetchDivisions,
    getDivisionForGrade,
    initializeDivisions,
  };
}

export default useDivisions;
