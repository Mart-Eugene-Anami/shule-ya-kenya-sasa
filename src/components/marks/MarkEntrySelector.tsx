import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { MarkEntryBySubject } from "./MarkEntryBySubject";
import { getSchoolStreamGradeCombinations } from "@/services/academicService";
import { useAuth } from "@/contexts/AuthContext";

interface Exam {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  subjects: string[];
  grades: string[];
  is_active: boolean;
}

interface Subject {
  subject_id: string;
  name: string;
  code: string;
}

interface StreamGradeCombination {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  gradeLevel: number;
  gradeCurriculum: string;
  streamName: string;
  displayName: string;
  teacherId?: string;
}

interface MarkEntrySelectorProps {
  onSelection?: (data: { examId: string; streamId: string; gradeId: string; subject: string; assessmentTypeId: string }) => void;
}

export const MarkEntrySelector = ({ onSelection }: MarkEntrySelectorProps = {}) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [streamGradeCombinations, setStreamGradeCombinations] = useState<StreamGradeCombination[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedCombination, setSelectedCombination] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMarkEntry, setShowMarkEntry] = useState(false);

  // Fetch division and grade data for subject filtering
  const [grades, setGrades] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.schoolId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch exams
        const { data: examsData, error: examsError } = await supabase
          .from('exams')
          .select('id, name, description, start_date, end_date, subjects, grades, is_active')
          .eq('is_active', true)
          .eq('school_id', user.schoolId)
          .order('name');
          
        if (!examsError && examsData) {
          setExams(examsData);
        }

        // Fetch all active subjects with division info
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('id, name, division_id, curriculum')
          .eq('school_id', user.schoolId)
          .eq('is_active', true)
          .order('name');
        setAllSubjects(subjectsData || []);

        // Fetch grades with division_id
        const { data: gradesData } = await supabase
          .from('grades')
          .select('id, name, division_id, curriculum, level')
          .eq('school_id', user.schoolId);
        setGrades(gradesData || []);

        // Load stream-grade combinations
        const combinations = await getSchoolStreamGradeCombinations(user.schoolId);
        setStreamGradeCombinations(combinations);
        
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load exam data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.schoolId]);

  const handleStartMarkEntry = () => {
    if (!selectedExam || !selectedCombination || !selectedSubject) {
      toast({
        title: "Missing Selection",
        description: "Please select an exam, grade/stream, and subject to continue",
        variant: "destructive"
      });
      return;
    }
    
    const combination = streamGradeCombinations.find(c => c.id === selectedCombination);
    if (!combination) return;
    
    if (onSelection) {
      onSelection({
        examId: selectedExam,
        streamId: combination.streamId,
        gradeId: combination.gradeId,
        subject: selectedSubject,
        assessmentTypeId: '' // Default empty, can be enhanced later
      });
    } else {
      setShowMarkEntry(true);
    }
  };

  // Filter combinations based on selected exam grades
  const availableCombinations = useMemo(() => {
    if (!selectedExam) return streamGradeCombinations;
    
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam || !exam.grades || exam.grades.length === 0) return streamGradeCombinations;
    
    return streamGradeCombinations.filter(combination => 
      exam.grades.includes(combination.gradeId)
    );
  }, [selectedExam, exams, streamGradeCombinations]);

  // Filter subjects: intersection of exam subjects and subjects valid for the selected grade's division
  const availableSubjects = useMemo(() => {
    const exam = exams.find(e => e.id === selectedExam);
    const examSubjectNames = exam?.subjects || [];
    
    if (!selectedCombination) {
      // No grade selected yet — show all exam subjects
      return examSubjectNames.map((name: string, i: number) => ({
        subject_id: String(i),
        name,
        code: name.toUpperCase().substring(0, 4),
      }));
    }

    const combo = streamGradeCombinations.find(c => c.id === selectedCombination);
    if (!combo) return [];

    // Resolve the grade's division
    const grade = grades.find(g => g.id === combo.gradeId);
    const divisionId = grade?.division_id;

    // Filter subjects that belong to this grade's division AND are in the exam's subject list
    let validNames: Set<string>;
    if (divisionId) {
      validNames = new Set(
        allSubjects
          .filter(s => s.division_id === divisionId)
          .map(s => s.name)
      );
    } else {
      // Fallback: all subjects are valid
      validNames = new Set(allSubjects.map(s => s.name));
    }

    const filtered = examSubjectNames.filter((name: string) => validNames.has(name));
    return filtered.map((name: string, i: number) => ({
      subject_id: String(i),
      name,
      code: name.toUpperCase().substring(0, 4),
    }));
  }, [selectedExam, selectedCombination, exams, streamGradeCombinations, grades, allSubjects]);

  // Clear subject when grade changes (subject list depends on grade's division)
  useEffect(() => {
    setSelectedSubject("");
  }, [selectedCombination]);

  if (showMarkEntry) {
    const combination = streamGradeCombinations.find(c => c.id === selectedCombination);
    return (
      <MarkEntryBySubject
        examId={selectedExam}
        streamId={combination?.streamId || ""}
        gradeId={combination?.gradeId || ""}
        subject={selectedSubject}
        onBack={() => setShowMarkEntry(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading data...</span>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Mark Entry Setup</CardTitle>
        <CardDescription>
          Select the exam, stream, and subject to start entering marks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Exam</label>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map(exam => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Grade & Stream</label>
          <Select value={selectedCombination} onValueChange={setSelectedCombination}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a grade and stream" />
            </SelectTrigger>
            <SelectContent>
            {availableCombinations.map(combination => (
              <SelectItem key={combination.id} value={combination.id}>
                {combination.displayName}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Subject</label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map(subject => (
                <SelectItem key={subject.subject_id} value={subject.name}>
                  {subject.name} ({subject.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleStartMarkEntry}
          className="w-full"
          disabled={!selectedExam || !selectedCombination || !selectedSubject}
        >
          Start Mark Entry
        </Button>
      </CardContent>
    </Card>
  );
};