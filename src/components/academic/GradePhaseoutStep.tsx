import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Trash2, 
  Info, 
  GraduationCap,
  Users,
  BookOpen
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Grade {
  id: string;
  name: string;
  level: number;
  curriculum: string;
  studentCount: number;
  streamCount: number;
}

interface GradePhaseoutStepProps {
  grades: Grade[];
  selectedGradesToRemove: string[];
  onGradeToggle: (gradeId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const GradePhaseoutStep = ({
  grades,
  selectedGradesToRemove,
  onGradeToggle,
  onContinue,
  onBack,
}: GradePhaseoutStepProps) => {
  const [confirmPhaseout, setConfirmPhaseout] = useState(false);

  const gradesToRemove = grades.filter((g) => selectedGradesToRemove.includes(g.id));
  const affectedStudentsCount = gradesToRemove.reduce((sum, g) => sum + g.studentCount, 0);
  const hasStudentsInRemovedGrades = affectedStudentsCount > 0;

  // Group grades by curriculum
  const gradesByCurriculum = grades.reduce((acc, grade) => {
    const key = grade.curriculum;
    if (!acc[key]) acc[key] = [];
    acc[key].push(grade);
    return acc;
  }, {} as Record<string, Grade[]>);

  const getCurriculumLabel = (curriculum: string) => {
    switch (curriculum) {
       case "cbc":
         return "CBE (Primary & Junior Secondary)";
       case "cbc-senior":
         return "CBE Senior Secondary";
      case "8-4-4":
        return "8-4-4 System";
      default:
        return curriculum.toUpperCase();
    }
  };

  const getCurriculumBadgeColor = (curriculum: string) => {
    switch (curriculum) {
      case "cbc":
        return "bg-blue-100 text-blue-800";
      case "cbc-senior":
        return "bg-purple-100 text-purple-800";
      case "8-4-4":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Grade/Form Management for New Academic Year</AlertTitle>
        <AlertDescription>
          As part of the 8-4-4 to CBE transition, you can choose to phase out certain grades or forms 
          that will no longer be needed in the upcoming academic year. This is optional - select only 
          the grades you want to remove.
        </AlertDescription>
      </Alert>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{grades.length}</p>
                <p className="text-sm text-muted-foreground">Total Grades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={selectedGradesToRemove.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Trash2 className={`h-5 w-5 ${selectedGradesToRemove.length > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{selectedGradesToRemove.length}</p>
                <p className="text-sm text-muted-foreground">To Remove</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={hasStudentsInRemovedGrades ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className={`h-5 w-5 ${hasStudentsInRemovedGrades ? "text-amber-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{affectedStudentsCount}</p>
                <p className="text-sm text-muted-foreground">Affected Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning for students in removed grades */}
      {hasStudentsInRemovedGrades && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Students in Selected Grades</AlertTitle>
          <AlertDescription>
            <strong>{affectedStudentsCount}</strong> students are currently enrolled in grades you've selected for removal. 
            These students should be handled during promotion (either graduate them or move them to appropriate grades) 
            before removing these grades.
          </AlertDescription>
        </Alert>
      )}

      {/* Grade selection by curriculum */}
      <Card>
        <CardHeader>
          <CardTitle>Select Grades to Phase Out</CardTitle>
          <CardDescription>
            Check the grades or forms you want to remove for the upcoming academic year.
            Typically, this applies to 8-4-4 forms being phased out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-6">
              {Object.entries(gradesByCurriculum).map(([curriculum, curriculumGrades]) => (
                <div key={curriculum} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getCurriculumBadgeColor(curriculum)}>
                      {getCurriculumLabel(curriculum)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({curriculumGrades.length} grades)
                    </span>
                  </div>
                  
                  <div className="grid gap-2 pl-2">
                    {curriculumGrades
                      .sort((a, b) => a.level - b.level)
                      .map((grade) => {
                        const isSelected = selectedGradesToRemove.includes(grade.id);
                        const hasStudents = grade.studentCount > 0;
                        
                        return (
                          <div
                            key={grade.id}
                            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                              isSelected 
                                ? "border-red-300 bg-red-50" 
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={grade.id}
                                checked={isSelected}
                                onCheckedChange={() => onGradeToggle(grade.id)}
                              />
                              <label
                                htmlFor={grade.id}
                                className="flex cursor-pointer items-center gap-2"
                              >
                                <span className="font-medium">{grade.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  (Level {grade.level})
                                </span>
                              </label>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className={hasStudents ? "font-medium text-amber-600" : "text-muted-foreground"}>
                                  {grade.studentCount} students
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {grade.streamCount} streams
                              </Badge>
                              {isSelected && (
                                <Badge variant="destructive" className="text-xs">
                                  Remove
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirmation checkbox when grades are selected */}
      {selectedGradesToRemove.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Checkbox
            id="confirm-phaseout"
            checked={confirmPhaseout}
            onCheckedChange={(checked) => setConfirmPhaseout(checked === true)}
          />
          <label htmlFor="confirm-phaseout" className="cursor-pointer text-sm">
            <span className="font-medium text-amber-800">
              I understand that removing these grades will:
            </span>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-amber-700">
              <li>Permanently delete the grade and its associated streams</li>
              <li>Remove all timetables and configurations for these grades</li>
              <li>This action cannot be undone after the reset is complete</li>
              {hasStudentsInRemovedGrades && (
                <li className="font-medium">Students must be promoted/graduated first before grades can be removed</li>
              )}
            </ul>
          </label>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {selectedGradesToRemove.length === 0 ? (
            <Button onClick={onContinue}>
              Skip - Keep All Grades
            </Button>
          ) : (
            <Button
              onClick={onContinue}
              disabled={!confirmPhaseout || hasStudentsInRemovedGrades}
              className={hasStudentsInRemovedGrades ? "bg-muted text-muted-foreground" : ""}
            >
              Continue with {selectedGradesToRemove.length} Grade{selectedGradesToRemove.length > 1 ? "s" : ""} Removed
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradePhaseoutStep;
