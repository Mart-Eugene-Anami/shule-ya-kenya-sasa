
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createAcademicYear, createTerm, getActiveAcademicYear } from "@/services/academicService";
import { format } from "date-fns";

const AcademicSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingSetup, setHasExistingSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  
  // Academic Year Data
  const [academicYear, setAcademicYear] = useState("");
  
  // Terms Data
  const [terms, setTerms] = useState([
    { name: "Term 1", startDate: "", endDate: "" },
    { name: "Term 2", startDate: "", endDate: "" },
    { name: "Term 3", startDate: "", endDate: "" }
  ]);

  useEffect(() => {
    const checkExistingSetup = async () => {
      // Super admins should be redirected to their dashboard, not academic setup
      if (user?.role === 'super_admin') {
        console.log("Super admin detected, redirecting to super admin dashboard");
        navigate("/super-admin");
        return;
      }
      
      // Only school admins with schoolId should check for existing setup
      if (!user?.schoolId || user?.role !== 'school_admin') {
        setCheckingSetup(false);
        return;
      }
      
      try {
        setCheckingSetup(true);
        const existingYear = await getActiveAcademicYear(user.schoolId);
        if (existingYear) {
          setHasExistingSetup(true);
          console.log("Academic setup already exists, redirecting to dashboard");
          navigate("/dashboard");
        }
      } catch (error) {
        console.log("No existing setup found, proceeding with setup");
      } finally {
        setCheckingSetup(false);
      }
    };

    // Only run check if user is loaded
    if (user) {
      checkExistingSetup();
    }
  }, [user, navigate]);

  const validateForm = () => {
    if (!academicYear.trim()) {
      toast({
        title: "Validation Error",
        description: "Academic year is required (e.g., 2024-2025)",
        variant: "destructive"
      });
      return false;
    }

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if (!term.startDate || !term.endDate) {
        toast({
          title: "Validation Error",
          description: `Please set start and end dates for ${term.name}`,
          variant: "destructive"
        });
        return false;
      }
      
      if (new Date(term.startDate) >= new Date(term.endDate)) {
        toast({
          title: "Validation Error",
          description: `${term.name} end date must be after start date`,
          variant: "destructive"
        });
        return false;
      }
    }

    // Check for overlapping terms
    for (let i = 0; i < terms.length - 1; i++) {
      const currentTerm = terms[i];
      const nextTerm = terms[i + 1];
      
      if (new Date(currentTerm.endDate) >= new Date(nextTerm.startDate)) {
        toast({
          title: "Validation Error",
          description: `${nextTerm.name} start date must be after ${currentTerm.name} end date`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user?.schoolId || !validateForm()) return;

    try {
      setIsLoading(true);
      
      // Create academic year
      const createdAcademicYear = await createAcademicYear({
        year: academicYear,
        isActive: true,
        schoolId: user.schoolId
      });

      // Create terms
      for (const termData of terms) {
        await createTerm({
          name: termData.name,
          startDate: termData.startDate,
          endDate: termData.endDate,
          academicYearId: createdAcademicYear.id,
          isActive: termData.name === "Term 1", // Make first term active by default
          schoolId: user.schoolId
        });
      }

      toast({
        title: "Academic Setup Complete!",
        description: "Academic year and terms have been configured successfully.",
      });

      navigate("/curriculum-setup");
    } catch (error: any) {
      console.error("Error setting up academic year and terms:", error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up academic year and terms. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTerm = (index: number, field: string, value: string) => {
    const updatedTerms = [...terms];
    updatedTerms[index] = { ...updatedTerms[index], [field]: value };
    setTerms(updatedTerms);
  };

  const generateSuggestedDates = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    setAcademicYear(`${currentYear}-${nextYear}`);
    setTerms([
      { 
        name: "Term 1", 
        startDate: `${currentYear}-01-15`, 
        endDate: `${currentYear}-04-15` 
      },
      { 
        name: "Term 2", 
        startDate: `${currentYear}-05-01`, 
        endDate: `${currentYear}-08-15` 
      },
      { 
        name: "Term 3", 
        startDate: `${currentYear}-09-01`, 
        endDate: `${currentYear}-12-15` 
      }
    ]);
  };

  if (checkingSetup) {
    return (
      <DashboardLayout title="Academic Setup">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-school-primary" />
            <p className="text-gray-600">Checking existing academic setup...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (hasExistingSetup) {
    return (
      <DashboardLayout title="Academic Setup">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Setup Complete</h2>
              <p className="text-gray-600 mb-4">
                Your academic year and terms are already configured.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Academic Year & Term Setup">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Set Up Academic Year & Terms
          </h1>
          <p className="text-gray-600">
            Configure your school's academic calendar to get started with grades, students, and scheduling
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Academic Year Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Input
                  id="academicYear"
                  placeholder="e.g., 2024-2025"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button 
                variant="outline" 
                onClick={generateSuggestedDates}
                disabled={isLoading}
              >
                Use Suggested Dates
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Term Dates</h3>
              
              {terms.map((term, index) => (
                <Card key={index} className="border-l-4 border-l-school-primary">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">{term.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`start-${index}`}>Start Date *</Label>
                        <Input
                          id={`start-${index}`}
                          type="date"
                          value={term.startDate}
                          onChange={(e) => updateTerm(index, 'startDate', e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${index}`}>End Date *</Label>
                        <Input
                          id={`end-${index}`}
                          type="date"
                          value={term.endDate}
                          onChange={(e) => updateTerm(index, 'endDate', e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {term.startDate && term.endDate && (
                      <p className="text-sm text-gray-600 mt-2">
                        Duration: {format(new Date(term.startDate), "MMM d")} - {format(new Date(term.endDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Important Notes</h4>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    <li>• Term 1 will be automatically set as the active term</li>
                    <li>• The system will auto-transition between terms based on dates</li>
                    <li>• You'll be notified before each term transition</li>
                    <li>• All grades, students, and exams will reference these terms</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                disabled={isLoading}
              >
                Skip for Now
              </Button>
              
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-school-primary hover:bg-school-secondary"
              >
                {isLoading ? "Setting up..." : "Complete Academic Setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AcademicSetup;
