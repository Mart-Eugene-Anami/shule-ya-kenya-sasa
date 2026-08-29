import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { SimpleMarkEntry } from "./SimpleMarkEntry";
import { useAuth } from "@/contexts/AuthContext";
import { getSchoolStreamGradeCombinations } from "@/services/academicService";

interface StreamGradeCombination {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
  displayName: string;
}

export const SimpleMarkEntrySelector = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [combinations, setCombinations] = useState<StreamGradeCombination[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedCombination, setSelectedCombination] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMarkEntry, setShowMarkEntry] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.schoolId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch active exams for this school
        const { data: examsData, error: examsError } = await supabase
          .from('exams')
          .select('id, name, subjects, grades, is_active')
          .eq('is_active', true)
          .eq('school_id', user.schoolId)
          .order('name');
          
        if (examsError) throw examsError;
        setExams(examsData || []);

        // Derive unique subjects from all exams
        const allSubjects = (examsData || []).flatMap(exam => exam.subjects || []);
        setSubjects([...new Set(allSubjects)].sort());

        // Load grade-stream combinations
        const combos = await getSchoolStreamGradeCombinations(user.schoolId);
        setCombinations(combos);
        
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load exam data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.schoolId]);

  // Filter combinations by selected exam's grades
  const availableCombinations = (() => {
    if (!selectedExam) return combinations;
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam?.grades?.length) return combinations;
    return combinations.filter(c => exam.grades.includes(c.gradeId));
  })();

  // Filter subjects by selected exam's subjects
  const availableSubjects = (() => {
    if (!selectedExam) return subjects;
    const exam = exams.find(e => e.id === selectedExam);
    return exam?.subjects || subjects;
  })();

  // Clear selections when exam changes
  useEffect(() => {
    setSelectedCombination("");
    setSelectedSubject("");
  }, [selectedExam]);

  const handleStartMarkEntry = () => {
    if (!selectedExam || !selectedCombination || !selectedSubject) {
      toast({
        title: "Missing Selection",
        description: "Please select an exam, grade/stream, and subject to continue",
        variant: "destructive"
      });
      return;
    }
    setShowMarkEntry(true);
  };

  if (showMarkEntry) {
    const combo = combinations.find(c => c.id === selectedCombination);
    return (
      <SimpleMarkEntry
        examId={selectedExam}
        streamId={combo?.streamId || ""}
        gradeId={combo?.gradeId || ""}
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
          Select the exam, grade/stream, and subject to start entering marks
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
              {availableCombinations.map(combo => (
                <SelectItem key={combo.id} value={combo.id}>
                  {combo.displayName}
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
                <SelectItem key={subject} value={subject}>
                  {subject}
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
