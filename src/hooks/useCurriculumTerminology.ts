import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  CurriculumType, 
  TerminologyConfig, 
  getTerminology,
  inferCurriculumFromGradeName 
} from "@/utils/curriculumTerminology";

interface UseCurriculumTerminologyResult {
  curriculum: CurriculumType;
  curricula: CurriculumType[]; // All curricula the school uses
  terminology: TerminologyConfig;
  loading: boolean;
  hasCBCSenior: boolean; // Quick check if school has CBC Senior
  has844: boolean; // Quick check if school has 8-4-4
}

/**
 * Hook to get curriculum type and terminology for the current school
 */
export function useCurriculumTerminology(): UseCurriculumTerminologyResult {
  const { user } = useAuth();
  const [curriculum, setCurriculum] = useState<CurriculumType>("cbc");
  const [curricula, setCurricula] = useState<CurriculumType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurriculum = async () => {
      if (!user?.schoolId) {
        setLoading(false);
        return;
      }

      try {
        // First try to get curriculum from school settings
        const { data: school } = await supabase
          .from("schools")
          .select("curriculum_types")
          .eq("id", user.schoolId)
          .single();

        if (school?.curriculum_types && school.curriculum_types.length > 0) {
          // Store all curricula
          setCurricula(school.curriculum_types as CurriculumType[]);
          // Use the first curriculum type (primary curriculum) for terminology
          setCurriculum(school.curriculum_types[0] as CurriculumType);
        } else {
          // Fallback: infer from grade names
          const { data: grades } = await supabase
            .from("grades")
            .select("name, curriculum")
            .eq("school_id", user.schoolId)
            .limit(1);

          if (grades && grades.length > 0) {
            // Use the grade's curriculum field or infer from name
            const gradeCurriculum = grades[0].curriculum || inferCurriculumFromGradeName(grades[0].name);
            setCurriculum(gradeCurriculum as CurriculumType);
            setCurricula([gradeCurriculum as CurriculumType]);
          }
        }
      } catch (error) {
        console.error("Error loading curriculum:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCurriculum();
  }, [user?.schoolId]);

  return {
    curriculum,
    curricula,
    terminology: getTerminology(curriculum),
    loading,
    hasCBCSenior: curricula.includes("cbc-senior"),
    has844: curricula.includes("8-4-4"),
  };
}

export default useCurriculumTerminology;
