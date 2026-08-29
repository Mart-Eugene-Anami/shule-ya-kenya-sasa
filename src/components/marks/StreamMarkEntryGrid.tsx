import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info } from 'lucide-react';
import { rubricService } from '@/services/rubricService';
import { Rubric, RubricGradeRange } from '@/types/marks';
import type { Database } from '@/integrations/supabase/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Student = Database['public']['Tables']['students']['Row'];
type Mark = Database['public']['Tables']['marks']['Row'];
type AssessmentType = Database['public']['Tables']['assessment_types']['Row'];

interface StreamMarkEntryGridProps {
  streamId: string;
  gradeId: string;
  examId: string;
  subject: string;
  assessmentTypeId: string;
}

interface StudentMark extends Student {
  currentMark?: Mark;
}

interface GradeResult {
  actualLevel: string;
  performanceLevel: string;
  points: number;
}

// Performance level colors for badges
const LEVEL_COLORS: Record<string, string> = {
  EE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ME: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  AE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  BE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const getLevelColor = (actualLevel: string): string => {
  const prefix = actualLevel.replace(/[0-9]/g, "");
  return LEVEL_COLORS[prefix] || "bg-muted text-muted-foreground";
};

export default function StreamMarkEntryGrid({
  streamId,
  gradeId,
  examId,
  subject,
  assessmentTypeId
}: StreamMarkEntryGridProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!user?.schoolId) return;

    try {
      setLoading(true);

      // Load rubric using the rubric service
      const rubricData = await rubricService.getRubricBySubject(user.schoolId, subject);
      setRubric(rubricData);

      // Load assessment type
      const { data: assessmentData } = await supabase
        .from('assessment_types')
        .select('*')
        .eq('id', assessmentTypeId)
        .maybeSingle();
      
      setAssessmentType(assessmentData);

      // Load students in the stream AND grade
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('stream_id', streamId)
        .eq('grade_id', gradeId)
        .eq('status', 'active')
        .order('name');

      if (studentsError) throw studentsError;

      // Load existing marks for these students
      const studentIds = studentsData?.map(s => s.id) || [];
      const { data: marksData } = await supabase
        .from('marks')
        .select('*')
        .eq('exam_id', examId)
        .eq('subject', subject)
        .in('student_id', studentIds);

      // Combine students with their marks
      const studentsWithMarks = (studentsData || []).map(student => ({
        ...student,
        currentMark: marksData?.find(m => m.student_id === student.id)
      }));

      setStudents(studentsWithMarks);

      // Initialize marks state
      const initialMarks: Record<string, number> = {};
      studentsWithMarks.forEach(student => {
        if (student.currentMark) {
          initialMarks[student.id] = student.currentMark.score;
        }
      });
      setMarks(initialMarks);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load student data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [streamId, gradeId, examId, subject, assessmentTypeId, user?.schoolId]);

  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) || value === '') {
      setMarks(prev => ({
        ...prev,
        [studentId]: value === '' ? 0 : numValue
      }));
    }
  };

  // Calculate grade using the rubric service
  const calculateGrade = (score: number): GradeResult | null => {
    if (!rubric?.grade_ranges) {
      return null;
    }
    return rubricService.calculateGrade(score, rubric.grade_ranges);
  };

  const handleSaveMarks = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const marksToSave = Object.entries(marks).map(([studentId, score]) => {
        const gradeResult = rubric ? calculateGrade(score) : null;
        
        return {
          student_id: studentId,
          exam_id: examId,
          subject: subject,
          score: score,
          out_of: assessmentType?.max_marks || 100,
          assessment_type_id: assessmentTypeId && assessmentTypeId !== '' ? assessmentTypeId : null,
          raw_mark: score,
          computed_score: gradeResult?.points || null,
          grade: gradeResult?.actualLevel || null,
          rubric_id: rubric?.id && rubric.id !== '' ? rubric.id : null,
          is_draft: false,
          recorded_by: user.id,
        };
      });

      // Delete existing marks first
      const { error: deleteError } = await supabase
        .from('marks')
        .delete()
        .eq('exam_id', examId)
        .eq('subject', subject)
        .in('student_id', Object.keys(marks));

      if (deleteError) throw deleteError;

      // Insert new marks
      const { data: insertedMarks, error: insertError } = await supabase
        .from('marks')
        .insert(marksToSave)
        .select();

      if (insertError) throw insertError;

      // Verify marks were saved
      const savedCount = insertedMarks?.length || 0;
      
      toast({
        title: "✓ Marks Saved Successfully",
        description: `${savedCount} student mark${savedCount !== 1 ? 's' : ''} saved with ${rubric ? 'CBC rubric grading' : 'no rubric applied'}`,
        duration: 5000,
      });

      // Reload data to reflect changes
      await loadData();

    } catch (error: any) {
      console.error('Error saving marks:', error);
      toast({
        title: "Error Saving Marks",
        description: error.message || "Failed to save marks. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mark Entry - {subject}</span>
          <div className="flex gap-2 items-center">
            <Badge variant="outline">
              {students.length} Students
            </Badge>
            {assessmentType && (
              <Badge variant="outline">
                Max: {assessmentType.max_marks} marks
              </Badge>
            )}
            {rubric ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="default" className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {rubric.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-2">CBC Grading Scale:</p>
                    <div className="text-xs space-y-1">
                      {rubric.grade_ranges.slice(0, 4).map((range, idx) => (
                        <div key={idx} className="flex justify-between gap-4">
                          <span>{range.actual_level}</span>
                          <span>{range.min_mark}-{range.max_mark} = {range.points} pts</span>
                        </div>
                      ))}
                      <div className="text-muted-foreground mt-1">...and more</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge variant="secondary">No rubric assigned</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!rubric && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> No rubric is assigned for {subject}. Grades will not be calculated automatically. 
              Go to "Manage Rubrics" to create one.
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => {
              const gradeResult = marks[student.id] !== undefined ? calculateGrade(marks[student.id]) : null;
              
              return (
                <div key={student.id} className="p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.admission_no}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Enter marks"
                        value={marks[student.id] ?? ''}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                        max={assessmentType?.max_marks || 100}
                        min={0}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        / {assessmentType?.max_marks || 100}
                      </span>
                    </div>
                    {gradeResult && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getLevelColor(gradeResult.actualLevel)}>
                          {gradeResult.actualLevel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {gradeResult.points.toFixed(1)} pts
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{gradeResult.performanceLevel}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveMarks}
              disabled={saving || Object.keys(marks).length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save All Marks'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
