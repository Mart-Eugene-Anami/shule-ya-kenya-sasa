import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface SimpleMarkEntryProps {
  examId: string;
  streamId: string;
  gradeId: string;
  subject: string;
  onBack: () => void;
}

export const SimpleMarkEntry = ({
  examId,
  streamId,
  gradeId,
  subject,
  onBack
}: SimpleMarkEntryProps) => {
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch students filtered by both stream AND grade for data integrity
        let query = supabase
          .from('students')
          .select('id, name, admission_no')
          .eq('stream_id', streamId);
        
        if (gradeId) {
          query = query.eq('grade_id', gradeId);
        }

        const { data: studentsData, error: studentsError } = await query.order('name');
          
        if (studentsError) {
          console.error('Error fetching students:', studentsError);
          toast({
            title: "Error",
            description: "Failed to load students for this grade and stream.",
            variant: "destructive",
          });
          setStudents([]);
        } else {
          setStudents(studentsData || []);
        }
        
        // Fetch existing marks for this exam/subject
        if (studentsData && studentsData.length > 0) {
          const studentIds = studentsData.map(s => s.id);
          const { data: existingMarks } = await supabase
            .from('marks')
            .select('student_id, score')
            .eq('exam_id', examId)
            .eq('subject', subject)
            .in('student_id', studentIds);

          const initialMarks: Record<string, number | null> = {};
          studentsData.forEach((student: any) => {
            const existing = existingMarks?.find(m => m.student_id === student.id);
            initialMarks[student.id] = existing ? existing.score : null;
          });
          setMarks(initialMarks);
        }
        
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load mark entry data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [examId, streamId, gradeId, subject]);
  
  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = value === "" ? null : Number(value);
    
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
      toast({
        title: "Invalid mark",
        description: "Marks must be numbers between 0 and 100",
        variant: "destructive"
      });
      return;
    }
    
    setMarks(prev => ({
      ...prev,
      [studentId]: numValue
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        toast({ title: "Error", description: "You must be logged in to save marks", variant: "destructive" });
        return;
      }
      
      const marksToSave = Object.entries(marks)
        .filter(([_, score]) => score !== null && score !== undefined)
        .map(([studentId, score]) => ({
          student_id: studentId,
          exam_id: examId,
          subject: subject,
          score: score as number,
          out_of: 100,
          recorded_by: authUser.id,
        }));

      if (marksToSave.length === 0) {
        toast({ title: "No marks", description: "Enter at least one mark before saving" });
        return;
      }

      const { error } = await supabase
        .from('marks')
        .upsert(marksToSave, {
          onConflict: 'student_id,exam_id,subject',
        });

      if (error) throw error;

      toast({ title: "Marks Saved", description: `${marksToSave.length} marks saved successfully.` });
    } catch (error: any) {
      console.error("Error saving marks:", error);
      toast({ title: "Error", description: error.message || "Failed to save marks", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading students...</span>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{subject}</CardTitle>
            <CardDescription>Enter marks for each student (0-100)</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {students.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No students found in this grade and stream.
          </p>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.admission_no}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="—"
                  className="w-20 text-center"
                  value={marks[student.id] ?? ""}
                  onChange={(e) => handleMarkChange(student.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {students.length > 0 && (
        <CardFooter>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Marks
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
