
import { CurriculumInfo } from "@/types/registration";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Curriculum, getCurriculumOptions, getGradesByCurriculum, getSubjectsByCurriculum } from "@/services/curriculumService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurriculumStepProps {
  curriculumInfo: CurriculumInfo;
  onInfoChange: (info: CurriculumInfo) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const CurriculumStep = ({
  curriculumInfo,
  onInfoChange,
  onNext,
  onBack,
  isSubmitting
}: CurriculumStepProps) => {
  
  const handleCurriculumChange = (value: string) => {
    const curriculumType = value as Curriculum;
    const grades = getGradesByCurriculum(curriculumType);
    const subjects = getSubjectsByCurriculum(curriculumType);
    
    onInfoChange({
      type: curriculumType,
      grades: grades.map(g => g.id),
      subjects: subjects.map(s => s.id),
      selectedGrades: grades.map(g => g.id),
      selectedSubjects: subjects.map(s => s.id)
    });
  };

  const validate = () => {
    return curriculumInfo.type && 
           curriculumInfo.selectedGrades.length > 0 && 
           curriculumInfo.selectedSubjects.length > 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curriculum Selection</CardTitle>
        <CardDescription>Select your school's curriculum and subjects</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="curriculum">Curriculum Type</Label>
          <Select 
            onValueChange={handleCurriculumChange}
            value={curriculumInfo.type}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a curriculum" />
            </SelectTrigger>
            <SelectContent>
              {getCurriculumOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This will automatically populate grade levels and subjects for your school
          </p>
        </div>
        
        {curriculumInfo.type && (
          <>
            <div className="space-y-3">
              <Label>Grade Levels</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {getGradesByCurriculum(curriculumInfo.type).map((grade) => (
                  <div key={grade.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`grade-${grade.id}`}
                      checked={curriculumInfo.selectedGrades.includes(grade.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onInfoChange({
                            ...curriculumInfo,
                            selectedGrades: [...curriculumInfo.selectedGrades, grade.id]
                          });
                        } else {
                          onInfoChange({
                            ...curriculumInfo,
                            selectedGrades: curriculumInfo.selectedGrades.filter(id => id !== grade.id)
                          });
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`grade-${grade.id}`}
                      className="text-sm font-normal"
                    >
                      {grade.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Subjects</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {getSubjectsByCurriculum(curriculumInfo.type).map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`subject-${subject.id}`}
                      checked={curriculumInfo.selectedSubjects.includes(subject.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onInfoChange({
                            ...curriculumInfo,
                            selectedSubjects: [...curriculumInfo.selectedSubjects, subject.id]
                          });
                        } else {
                          onInfoChange({
                            ...curriculumInfo,
                            selectedSubjects: curriculumInfo.selectedSubjects.filter(id => id !== subject.id)
                          });
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`subject-${subject.id}`}
                      className="text-sm font-normal"
                    >
                      {subject.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Previous
        </Button>
        <Button 
          onClick={onNext}
          disabled={isSubmitting || !validate()}
        >
          Next Step
        </Button>
      </CardFooter>
    </Card>
  );
};
