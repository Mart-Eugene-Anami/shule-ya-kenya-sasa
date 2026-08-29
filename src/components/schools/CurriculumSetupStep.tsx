import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, GraduationCap, ArrowRight, Info, School, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  getCurriculumOptions, 
  getGradesByCurriculum, 
  getSubjectsByCurriculum,
  type Curriculum,
  type Grade,
} from "@/services/curriculumService";
import { 
  getDefaultDivisionsForCurricula,
  createDefaultDivisions,
  type DivisionConfig 
} from "@/services/divisionService";
import { createGrade } from "@/services/academicService";
import { supabase } from "@/integrations/supabase/client";
import { DivisionSubjectSelector } from "@/components/subjects/DivisionSubjectSelector";

interface CurriculumSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const CurriculumSetupStep = ({ onComplete, onSkip }: CurriculumSetupStepProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"curriculum" | "grades" | "subjects">("curriculum");
  const [selectedCurricula, setSelectedCurricula] = useState<Curriculum[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [subjectsByDivision, setSubjectsByDivision] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [divisions, setDivisions] = useState<DivisionConfig[]>([]);

  const curriculumOptions = getCurriculumOptions();

  // Update divisions when curricula change
  useEffect(() => {
    const divs = getDefaultDivisionsForCurricula(selectedCurricula);
    setDivisions(divs);
  }, [selectedCurricula]);
  
  const handleCurriculumToggle = (curriculum: Curriculum, checked: boolean) => {
    if (checked) {
      setSelectedCurricula([...selectedCurricula, curriculum]);
    } else {
      setSelectedCurricula(selectedCurricula.filter(c => c !== curriculum));
      // Remove grades from unchecked curriculum
      const gradesForCurriculum = getGradesByCurriculum(curriculum).map(g => g.id);
      setSelectedGrades(selectedGrades.filter(id => !gradesForCurriculum.includes(id)));
    }
  };

  // Group grades by curriculum for display
  const gradesByCurriculum = selectedCurricula.reduce((acc, c) => {
    acc[c] = getGradesByCurriculum(c);
    return acc;
  }, {} as Record<Curriculum, Grade[]>);

  const handleGradeToggle = (gradeId: string, checked: boolean) => {
    if (checked) {
      setSelectedGrades([...selectedGrades, gradeId]);
    } else {
      setSelectedGrades(selectedGrades.filter(id => id !== gradeId));
    }
  };

   // Check if school has both 8-4-4 and CBE Senior selected (transition period)
   const isTransitionSchool = selectedCurricula.includes("8-4-4") && selectedCurricula.includes("cbc-senior");

  const getTotalSelectedSubjects = () => {
    return Object.values(subjectsByDivision).reduce((sum, arr) => sum + arr.length, 0);
  };

  const handleSetupCurriculum = async () => {
    if (!user?.schoolId || selectedCurricula.length === 0 || selectedGrades.length === 0) {
      toast({
        title: "Incomplete Selection",
        description: "Please select at least one curriculum and grades",
        variant: "destructive"
      });
      return;
    }

    const totalSubjects = getTotalSelectedSubjects();
    if (totalSubjects === 0) {
      toast({
        title: "No Subjects Selected",
        description: "Please select at least one subject for your school divisions",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Update school curriculum (supports multiple curricula)
      await supabase
        .from('schools')
        .update({ 
          curriculum_types: selectedCurricula
        })
        .eq('id', user.schoolId);

      // Create default divisions
      const createdDivisions = await createDefaultDivisions(user.schoolId, selectedCurricula);
      
      // Create a mapping from division type to created division ID
      const divisionTypeToId = createdDivisions.reduce((acc, div) => {
        acc[div.division_type] = div.id;
        return acc;
      }, {} as Record<string, string>);

      // Combine all grades
      const allGrades: Grade[] = [];
      selectedCurricula.forEach(c => {
        allGrades.push(...getGradesByCurriculum(c));
      });

      // Create grades with division assignments
      const gradePromises = selectedGrades.map(async (gradeId) => {
        const gradeInfo = allGrades.find(g => g.id === gradeId);
        if (gradeInfo) {
          // Find the division for this grade
          const division = divisions.find(d => 
            d.curriculum === gradeInfo.curriculum &&
            gradeInfo.level >= d.gradeLevelStart &&
            gradeInfo.level <= d.gradeLevelEnd
          );
          
          return createGrade({
            name: gradeInfo.name,
            level: gradeInfo.level,
            curriculum: gradeInfo.curriculum,
            schoolId: user.schoolId!,
            divisionId: division ? divisionTypeToId[division.type] : undefined
          });
        }
      });

      await Promise.all(gradePromises);

      // Create subjects for each division
      
      for (const [divisionType, subjectIds] of Object.entries(subjectsByDivision)) {
        const division = divisions.find(d => d.type === divisionType);
        if (!division) continue;
        
        const divisionId = divisionTypeToId[divisionType];
        const curriculumSubjects = getSubjectsByCurriculum(division.curriculum as Curriculum);
        
        for (const subjectId of subjectIds) {
          const subjectInfo = curriculumSubjects.find(s => s.id === subjectId);
          if (subjectInfo) {
            await supabase
              .from('subjects')
              .insert({
                name: subjectInfo.name,
                curriculum: subjectInfo.curriculum,
                school_id: user.schoolId,
                division_id: divisionId,
                is_active: true,
                subject_type: subjectInfo.subjectType || 'core',
                pathway: subjectInfo.pathway === 'core' ? null : (subjectInfo.pathway || null),
              });
          }
        }
      }

      const curriculumLabels = selectedCurricula.map(c => {
        const opt = curriculumOptions.find(o => o.value === c);
        return opt?.label || c;
      }).join(", ");

      toast({
        title: "Curriculum Setup Complete!",
        description: `Successfully configured ${selectedGrades.length} grades, ${createdDivisions.length} divisions, and ${totalSubjects} subjects`,
      });

      onComplete();
    } catch (error: any) {
      console.error("Error setting up curriculum:", error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up curriculum. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurriculumBadgeColor = (curriculum: string) => {
    switch (curriculum) {
      case "cbc":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cbc-senior":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "8-4-4":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const canProceedToGrades = selectedCurricula.length > 0;
  const canProceedToSubjects = selectedGrades.length > 0;
  const canComplete = getTotalSelectedSubjects() > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Curriculum Setup
        </h1>
        <p className="text-muted-foreground">
          Configure your school's curriculum, grades, divisions, and subjects.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2">
        {["curriculum", "grades", "subjects"].map((s, index) => (
          <div key={s} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s 
                  ? "bg-primary text-primary-foreground" 
                  : index < ["curriculum", "grades", "subjects"].indexOf(step)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>
            {index < 2 && (
              <div className={`w-12 h-0.5 ${
                index < ["curriculum", "grades", "subjects"].indexOf(step)
                  ? "bg-primary"
                  : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Curriculum Selection */}
      {step === "curriculum" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Select School Curriculum(s)
            </CardTitle>
            <CardDescription>
              Schools can support multiple curricula. High schools can run both 8-4-4 and CBE Senior during the transition.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {curriculumOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    selectedCurricula.includes(option.value as Curriculum)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleCurriculumToggle(
                    option.value as Curriculum, 
                    !selectedCurricula.includes(option.value as Curriculum)
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCurricula.includes(option.value as Curriculum)}
                        onCheckedChange={(checked) => handleCurriculumToggle(option.value as Curriculum, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{option.label}</h3>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {isTransitionSchool && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Transition Period:</strong> Your school will run both 8-4-4 and CBE Senior Secondary concurrently.
                </AlertDescription>
              </Alert>
            )}

            {/* Show divisions that will be created */}
            {divisions.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Divisions that will be created:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {divisions.map((div) => (
                    <Badge key={div.type} variant="secondary">
                      {div.name} ({div.curriculum.toUpperCase()})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onSkip}>Skip for Now</Button>
              <Button 
                onClick={() => setStep("grades")}
                disabled={!canProceedToGrades}
              >
                Next: Select Grades <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Grades Selection */}
      {step === "grades" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Select Grade Levels
            </CardTitle>
            <CardDescription>
              Choose which grades your school offers. Grades will be automatically assigned to their respective divisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(gradesByCurriculum).map(([curriculum, grades]) => {
              const division = divisions.find(d => d.curriculum === curriculum);
              return (
                <div key={curriculum} className="mb-6 last:mb-0">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Badge className={getCurriculumBadgeColor(curriculum)}>
                      {curriculumOptions.find(o => o.value === curriculum)?.label || curriculum}
                    </Badge>
                    {division && (
                      <span className="text-sm text-muted-foreground">
                        → {division.name}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {grades.map((grade) => (
                      <div key={grade.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={grade.id}
                          checked={selectedGrades.includes(grade.id)}
                          onCheckedChange={(checked) => handleGradeToggle(grade.id, !!checked)}
                        />
                        <label
                          htmlFor={grade.id}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {grade.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selected: {selectedGrades.length} grades
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("curriculum")}>
                Back
              </Button>
              <Button 
                onClick={() => setStep("subjects")}
                disabled={!canProceedToSubjects}
              >
                Next: Select Subjects <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Subjects Selection by Division */}
      {step === "subjects" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Configure Subjects by Division
            </CardTitle>
            <CardDescription>
              Each division can have different subjects. Select the appropriate subjects for each school section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DivisionSubjectSelector
              selectedCurricula={selectedCurricula}
              onSubjectsChange={setSubjectsByDivision}
              initialSubjects={subjectsByDivision}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("grades")}>
                Back
              </Button>
              <Button 
                onClick={handleSetupCurriculum}
                disabled={isLoading || !canComplete}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
