import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CurriculumSetupStep } from "@/components/schools/CurriculumSetupStep";
import { getActiveAcademicYear } from "@/services/academicService";
import { supabase } from "@/integrations/supabase/client";

const CurriculumSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRequirements = async () => {
      if (user?.role === 'super_admin') {
        navigate("/super-admin");
        return;
      }

      if (!user?.schoolId || user?.role !== 'school_admin') {
        navigate("/dashboard");
        return;
      }

      try {
        // Check if academic year exists
        const academicYear = await getActiveAcademicYear(user.schoolId);
        if (!academicYear) {
          navigate("/academic-setup");
          return;
        }

        // Check if curriculum is already set up (has grades)
        const { data: grades } = await supabase
          .from('grades')
          .select('id')
          .eq('school_id', user.schoolId)
          .limit(1);

        if (grades && grades.length > 0) {
          navigate("/dashboard");
          return;
        }

      } catch (error) {
        console.error("Error checking setup requirements:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkRequirements();
    }
  }, [user, navigate]);

  const handleComplete = () => {
    navigate("/dashboard");
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Curriculum Setup">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading curriculum setup...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Curriculum Setup">
      <CurriculumSetupStep onComplete={handleComplete} onSkip={handleSkip} />
    </DashboardLayout>
  );
};

export default CurriculumSetup;