
import { PersonalInfo, SchoolInfo, CurriculumInfo } from "@/types/registration";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getCurriculumOptions, getGradesByCurriculum, getSubjectsByCurriculum } from "@/services/curriculumService";

interface ReviewStepProps {
  personalInfo: PersonalInfo;
  schoolInfo: SchoolInfo;
  curriculumInfo: CurriculumInfo;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const ReviewStep = ({
  personalInfo,
  schoolInfo,
  curriculumInfo,
  onSubmit,
  onBack,
  isSubmitting
}: ReviewStepProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Your Information</CardTitle>
        <CardDescription>Please confirm that everything is correct before proceeding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Personal Details</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Name:</div>
            <div>{personalInfo.name}</div>
            
            <div className="font-medium">Email:</div>
            <div>{personalInfo.email}</div>
            
            {personalInfo.phone && (
              <>
                <div className="font-medium">Phone:</div>
                <div>{personalInfo.phone}</div>
              </>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium">School Information</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">School Name:</div>
            <div>{schoolInfo.name}</div>
            
            <div className="font-medium">Location:</div>
            <div>{schoolInfo.town}, {schoolInfo.county}, {schoolInfo.country}</div>
            
            {schoolInfo.address && (
              <>
                <div className="font-medium">Address:</div>
                <div>{schoolInfo.address}</div>
              </>
            )}
            
            {schoolInfo.motto && (
              <>
                <div className="font-medium">Motto:</div>
                <div>{schoolInfo.motto}</div>
              </>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium">Curriculum</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Type:</div>
            <div>
              {getCurriculumOptions().find(c => c.value === curriculumInfo.type)?.label || curriculumInfo.type}
            </div>
            
            <div className="font-medium">Grades:</div>
            <div>
              {getGradesByCurriculum(curriculumInfo.type)
                .filter(grade => curriculumInfo.selectedGrades.includes(grade.id))
                .map(grade => grade.name)
                .join(", ")}
            </div>
            
            <div className="font-medium">Subjects:</div>
            <div>
              {getSubjectsByCurriculum(curriculumInfo.type)
                .filter(subject => curriculumInfo.selectedSubjects.includes(subject.id))
                .map(subject => subject.name)
                .join(", ")}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Previous
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
            </>
          ) : (
            "Complete Registration"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
