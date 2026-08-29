
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Stepper } from "@/components/ui/stepper";
import { useToast } from "@/hooks/use-toast";
import { useRegistrationState } from "@/hooks/useRegistrationState";
import { PersonalDetailsStep } from "@/components/registration/PersonalDetailsStep";
import { SchoolInformationStep } from "@/components/registration/SchoolInformationStep";
import { CurriculumStep } from "@/components/registration/CurriculumStep";
import { ReviewStep } from "@/components/registration/ReviewStep";

const MultiStepRegister = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  
  const {
    currentStep,
    setCurrentStep,
    isSubmitting,
    setIsSubmitting,
    personalInfo,
    setPersonalInfo,
    schoolInfo,
    setSchoolInfo,
    curriculumInfo,
    setCurriculumInfo,
    steps
  } = useRegistrationState();
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const user = await register(personalInfo.name, personalInfo.email, personalInfo.password);
      
      if (user) {
        // Store school setup data for school creation process
        localStorage.setItem("schoolSetupData", JSON.stringify({
          schoolInfo,
          curriculumInfo,
          isFromWizard: true
        }));
        
        toast({
          title: "Registration successful",
          description: "Setting up your school...",
        });
        
        // Navigate to the school creation page, which will auto-process the wizard data
        navigate("/schools/create");
      } else {
        toast({
          title: "Registration error",
          description: "There was a problem with your registration. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "There was a problem with your registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-school-light p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left sidebar with steps */}
        <div className="hidden md:block">
          <div className="sticky top-8">
            <h1 className="text-2xl font-bold text-school-primary mb-6">
              Shule ya Kenya Sasa
            </h1>
            <Stepper 
              steps={steps}
              currentStep={currentStep}
              className="ml-2"
            />
          </div>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-2 space-y-8">
          {/* Mobile stepper (visible on small screens) */}
          <div className="md:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-school-primary mb-2">
              Shule ya Kenya Sasa
            </h1>
            <p className="text-sm text-gray-600 mb-4">Step {currentStep + 1} of {steps.length}</p>
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <div 
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? "w-8 bg-school-primary" 
                      : index < currentStep 
                        ? "w-4 bg-school-primary/60" 
                        : "w-4 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Step Components */}
          {currentStep === 0 && (
            <PersonalDetailsStep
              personalInfo={personalInfo}
              onInfoChange={setPersonalInfo}
              onNext={() => setCurrentStep(prev => prev + 1)}
              isSubmitting={isSubmitting}
            />
          )}
          
          {currentStep === 1 && (
            <SchoolInformationStep
              schoolInfo={schoolInfo}
              onInfoChange={setSchoolInfo}
              onNext={() => setCurrentStep(prev => prev + 1)}
              onBack={() => setCurrentStep(prev => prev - 1)}
              isSubmitting={isSubmitting}
            />
          )}
          
          {currentStep === 2 && (
            <CurriculumStep
              curriculumInfo={curriculumInfo}
              onInfoChange={setCurriculumInfo}
              onNext={() => setCurrentStep(prev => prev + 1)}
              onBack={() => setCurrentStep(prev => prev - 1)}
              isSubmitting={isSubmitting}
            />
          )}
          
          {currentStep === 3 && (
            <ReviewStep
              personalInfo={personalInfo}
              schoolInfo={schoolInfo}
              curriculumInfo={curriculumInfo}
              onSubmit={handleSubmit}
              onBack={() => setCurrentStep(prev => prev - 1)}
              isSubmitting={isSubmitting}
            />
          )}
          
          {/* Login link */}
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-school-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
              >
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStepRegister;
