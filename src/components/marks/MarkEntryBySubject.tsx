import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface Student {
  id: string;
  name: string;
  admission_no: string;
}

interface MarkEntryBySubjectProps {
  examId: string;
  streamId: string;
  gradeId: string;
  subject: string;
  onBack: () => void;
}

export const MarkEntryBySubject = ({
  examId,
  streamId,
  gradeId,
  subject,
  onBack
}: MarkEntryBySubjectProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, number | null>>({});
  const [examInfo, setExamInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [streamInfo, setStreamInfo] = useState<any>(null);
  
  // Fetch students and existing marks
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch exam details
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();
          
        if (examError) throw examError;
        setExamInfo(examData);
        
        // Fetch stream details
        const { data: streamData, error: streamError } = await supabase
          .from('streams')
          .select('*')
          .eq('id', streamId)
          .single();
          
        if (streamError) throw streamError;
        setStreamInfo(streamData);
        
        // Fetch all students in this stream AND grade
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, admission_no')
          .eq('stream_id', streamId)
          .eq('grade_id', gradeId)
          .order('name');
          
        if (studentsError) throw studentsError;
        
        // Transform to match the Student interface
        const transformedStudents = studentsData?.map(student => ({
          id: student.id,
          name: student.name,
          admission_no: student.admission_no
        })) || [];
        
        setStudents(transformedStudents);
        
        // Fetch existing marks for this exam, stream, and subject
        const { data: existingMarks, error: marksError } = await supabase
          .from('marks')
          .select('student_id, score')
          .eq('exam_id', examId)
          .eq('subject', subject);
          
        if (marksError) {
          console.log('No existing marks found, starting fresh');
        }
        
        // Initialize marks state with existing marks
        const marksMap: Record<string, number | null> = {};
        if (existingMarks) {
          existingMarks.forEach(mark => {
            marksMap[mark.student_id] = mark.score;
          });
        }
        
        // Initialize remaining students with null
        transformedStudents.forEach(student => {
          if (marksMap[student.id] === undefined) {
            marksMap[student.id] = null;
          }
        });
        
        setMarks(marksMap);
        
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Failed to load data",
          description: error.message || "There was an error loading the required data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [examId, streamId, gradeId, subject]);
  
  const handleMarkChange = (studentId: string, value: string) => {
    // Convert input to number or set to null if empty
    const numValue = value === "" ? null : Number(value);
    
    // Validation
    if (numValue !== null) {
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        toast({
          title: "Invalid mark",
          description: "Marks must be numbers between 0 and 100",
          variant: "destructive"
        });
        return;
      }
    }
    
    setMarks(prevMarks => ({
      ...prevMarks,
      [studentId]: numValue
    }));
  };
  
  const handleSaveMarks = async () => {
    try {
      setIsSaving(true);
      
      // Get current user for recorded_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Prepare marks data for insertion/update
      const marksToSave = Object.entries(marks).map(([studentId, score]) => {
        if (score === null) return null; // Skip null scores
        
        return {
          exam_id: examId,
          student_id: studentId,
          subject: subject,
          score: score,
          out_of: 100,
          recorded_by: user.id,
          created_at: new Date().toISOString(),
          recorded_at: new Date().toISOString()
        };
      }).filter(Boolean); // Remove null items
      
      if (marksToSave.length === 0) {
        toast({
          title: "No marks to save",
          description: "Please enter marks for at least one student",
          variant: "destructive"
        });
        return;
      }
      
      // First, delete any existing marks for this exam and these students
      const studentIds = Object.keys(marks);
      await supabase
        .from('marks')
        .delete()
        .eq('exam_id', examId)
        .eq('subject', subject)
        .in('student_id', studentIds);
      
      // Then insert the new marks
      const { error } = await supabase
        .from('marks')
        .insert(marksToSave);
        
      if (error) throw error;
      
      toast({
        title: "Marks saved successfully",
        description: `Saved ${marksToSave.length} marks for ${subject}`
      });
      
    } catch (error: any) {
      console.error("Error saving marks:", error);
      toast({
        title: "Failed to save marks",
        description: error.message || "An error occurred while saving the marks",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading student data...</span>
      </div>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center mb-2">
          <Button variant="ghost" onClick={onBack} className="mr-2 p-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle>Mark Entry: {subject}</CardTitle>
            <CardDescription>
              {examInfo?.name} | {streamInfo?.name} | {students.length} Students
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Admission No.</th>
                <th className="text-left py-2 px-4">Student Name</th>
                <th className="text-left py-2 px-4">Marks (out of 100)</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    No students found in this stream
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{student.admission_no}</td>
                    <td className="py-3 px-4">{student.name}</td>
                    <td className="py-3 px-4 w-40">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={marks[student.id] === null ? '' : marks[student.id]}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                        className="w-full"
                        placeholder="0-100"
                        disabled={isSaving}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSaveMarks} disabled={isSaving || students.length === 0}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Marks
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};