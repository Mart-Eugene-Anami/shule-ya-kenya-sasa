
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CreateSchoolForm } from "@/components/schools/CreateSchoolForm";
import { useCreateSchool } from "@/hooks/useCreateSchool";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const CreateSchool = () => {
  const [initialData, setInitialData] = useState<{
    name: string;
    location: string;
    email: string;
  } | undefined>();
  
  const [processingWizard, setProcessingWizard] = useState(false);
  const { user } = useAuth();
  const { createSchool, isLoading } = useCreateSchool();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      return; // Wait for user data to be available
    }
    
    const storedData = localStorage.getItem("schoolSetupData");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        const { schoolInfo, isFromWizard } = parsedData;
        
        if (isFromWizard && schoolInfo) {
          setProcessingWizard(true);
          
          const schoolData = {
            name: schoolInfo.name || "",
            location: [schoolInfo.town, schoolInfo.county, schoolInfo.country]
              .filter(Boolean)
              .join(", "),
            phone: schoolInfo.phone || "",
            email: user?.email || ""
          };
          
          // Small delay to ensure all auth processes have completed
          setTimeout(() => {
            createSchool(schoolData);
          }, 300);
          
          return;
        }
        
        if (schoolInfo) {
          setInitialData({
            name: schoolInfo.name || "",
            location: [schoolInfo.town, schoolInfo.county, schoolInfo.country]
              .filter(Boolean)
              .join(", "),
            email: user?.email || ""
          });
        }
      } catch (error) {
        console.error("Error parsing stored school data:", error);
      }
    }
  }, [user, createSchool]);
  
  if (processingWizard || (isLoading && !initialData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-school-light p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold text-school-primary">Sabby School</h1>
            <p className="mt-2 text-gray-600">Setting up your school...</p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-school-primary" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-school-light p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-school-primary">Sabby School</h1>
          <p className="mt-2 text-gray-600">Set up your school</p>
        </div>
        
        <CreateSchoolForm
          initialData={initialData}
          isLoading={isLoading}
          onSubmit={createSchool}
        />
      </div>
    </div>
  );
};

export default CreateSchool;
