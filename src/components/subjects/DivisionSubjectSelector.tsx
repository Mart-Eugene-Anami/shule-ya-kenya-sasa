import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Info, Check } from "lucide-react";
import { 
  getSubjectsByCurriculum, 
  type Subject,
  type Curriculum 
} from "@/services/curriculumService";
import { 
  getDefaultDivisionsForCurricula, 
  type DivisionConfig 
} from "@/services/divisionService";

interface DivisionSubjectSelectorProps {
  selectedCurricula: Curriculum[];
  onSubjectsChange: (subjectsByDivision: Record<string, string[]>) => void;
  initialSubjects?: Record<string, string[]>;
}

export function DivisionSubjectSelector({ 
  selectedCurricula, 
  onSubjectsChange,
  initialSubjects = {}
}: DivisionSubjectSelectorProps) {
  const [divisions, setDivisions] = useState<DivisionConfig[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string[]>>(initialSubjects);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    // Get divisions based on selected curricula
    const divs = getDefaultDivisionsForCurricula(selectedCurricula);
    setDivisions(divs);
    
    // Set first tab as active
    if (divs.length > 0 && !activeTab) {
      setActiveTab(divs[0].type);
    }

    // Initialize subjects for new divisions
    const newSelected: Record<string, string[]> = { ...selectedSubjects };
    divs.forEach(div => {
      if (!newSelected[div.type]) {
        newSelected[div.type] = [];
      }
    });
    
    // Remove subjects from divisions that no longer exist
    Object.keys(newSelected).forEach(key => {
      if (!divs.some(d => d.type === key)) {
        delete newSelected[key];
      }
    });
    
    setSelectedSubjects(newSelected);
  }, [selectedCurricula]);

  useEffect(() => {
    onSubjectsChange(selectedSubjects);
  }, [selectedSubjects]);

  const getSubjectsForDivision = (division: DivisionConfig): Subject[] => {
    return getSubjectsByCurriculum(division.curriculum as Curriculum);
  };

  const handleToggleSubject = (divisionType: string, subjectId: string, checked: boolean) => {
    setSelectedSubjects(prev => {
      const divisionSubjects = prev[divisionType] || [];
      if (checked) {
        return { ...prev, [divisionType]: [...divisionSubjects, subjectId] };
      } else {
        return { ...prev, [divisionType]: divisionSubjects.filter(id => id !== subjectId) };
      }
    });
  };

  const handleSelectAll = (divisionType: string, subjects: Subject[]) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [divisionType]: subjects.map(s => s.id)
    }));
  };

  const handleDeselectAll = (divisionType: string) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [divisionType]: []
    }));
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

  const getTotalSelectedCount = () => {
    return Object.values(selectedSubjects).reduce((sum, arr) => sum + arr.length, 0);
  };

  if (selectedCurricula.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Please select at least one curriculum to configure subjects.
        </AlertDescription>
      </Alert>
    );
  }

  if (divisions.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No divisions available for the selected curricula.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Selection by Division
          </h3>
          <p className="text-sm text-muted-foreground">
            Select subjects for each school division. Each division can have different subjects.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {getTotalSelectedCount()} subjects selected
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {divisions.map((division) => {
            const count = selectedSubjects[division.type]?.length || 0;
            return (
              <TabsTrigger key={division.type} value={division.type} className="gap-2">
                {division.shortName}
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {divisions.map((division) => {
          const subjects = getSubjectsForDivision(division);
          const selected = selectedSubjects[division.type] || [];
          
          return (
            <TabsContent key={division.type} value={division.type} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {division.name}
                        <Badge className={getCurriculumBadgeColor(division.curriculum)}>
                          {division.curriculum.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {division.description} • Grade {division.gradeLevelStart}-{division.gradeLevelEnd}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAll(division.type, subjects)}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeselectAll(division.type)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {subjects.map((subject) => {
                        const isSelected = selected.includes(subject.id);
                        return (
                          <div
                            key={subject.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 border-primary' 
                                : 'hover:bg-muted/50 border-transparent'
                            }`}
                            onClick={() => handleToggleSubject(division.type, subject.id, !isSelected)}
                          >
                            <Checkbox
                              id={`${division.type}-${subject.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleToggleSubject(division.type, subject.id, !!checked)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label
                              htmlFor={`${division.type}-${subject.id}`}
                              className="text-sm font-medium leading-none cursor-pointer flex-1"
                            >
                              {subject.name}
                            </label>
                            <Badge 
                              variant={subject.subjectType === "core" ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {subject.subjectType === "core" ? "Core" : "Optional"}
                            </Badge>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Selected: {selected.length} of {subjects.length} subjects
                    </p>
                    {selected.length === subjects.length && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        All selected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
