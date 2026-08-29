
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchoolData {
  name: string;
  location: string;
  phone: string;
  email: string;
}

export const useCreateSchool = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createSchool = async (data: SchoolData) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a school. Please log in and try again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: result, error } = await supabase.rpc(
        'create_school_with_admin',
        {
          p_school_name: data.name,
          p_school_location: data.location,
          p_school_phone: data.phone || '',
          p_school_email: data.email,
          p_admin_id: user.id,
          p_admin_name: user.name || user.email.split('@')[0],
          p_admin_email: user.email
        }
      );
      
      if (error) throw error;

      // Process curriculum data if available
      const storedData = localStorage.getItem("schoolSetupData");
      if (storedData) {
        try {
          const { curriculumInfo } = JSON.parse(storedData);
          
          if (curriculumInfo && curriculumInfo.type) {
            const { error: curriculumError } = await supabase
              .from("schools")
              .update({ 
                curriculum_types: [curriculumInfo.type],
                updated_at: new Date().toISOString()
              })
              .eq("id", result);
              
            if (curriculumError) {
              console.error("Error saving curriculum data:", curriculumError);
            }
          }
        } catch (error) {
          console.error("Error processing curriculum data:", error);
        }
        
        // Clean up stored data after school creation
        localStorage.removeItem("schoolSetupData");
      }
      
      // Refresh the user profile to get the updated school information
      await refreshProfile();
      
      toast({
        title: "School created",
        description: "Your school has been created successfully!",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createSchool,
    isLoading
  };
};
