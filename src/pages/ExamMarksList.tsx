import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ClipboardList, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Mark {
  id: string;
  score: number;
  subject: string;
  grade: string | null;
  students: {
    name: string;
    admission_no: string;
    grade_id: string;
    stream_id: string;
  };
  grades?: { name: string };
  streams?: { name: string };
}

interface GroupedMarks {
  [gradeName: string]: {
    [streamName: string]: {
      [subject: string]: Mark[];
    };
  };
}

const ExamMarksList = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<any>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [groupedMarks, setGroupedMarks] = useState<GroupedMarks>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  useEffect(() => {
    fetchData();
  }, [examId]);

  useEffect(() => {
    if (marks.length > 0) {
      organizeMarks();
    }
  }, [marks, selectedGrade, selectedSubject]);

  const fetchData = async () => {
    if (!examId) return;
    
    try {
      setIsLoading(true);
      
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, terms!exams_term_id_fkey(name)')
        .eq('id', examId)
        .single();
        
      if (examError) throw examError;
      setExam(examData);

      // Fetch all marks for this exam with student, grade, and stream info
      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select(`
          id,
          score,
          subject,
          grade,
          students!marks_student_id_fkey(
            name,
            admission_no,
            grade_id,
            stream_id,
            grades!students_grade_id_fkey(name),
            streams!students_stream_id_fkey(name)
          )
        `)
        .eq('exam_id', examId)
        .order('subject');
        
      if (marksError) throw marksError;
      
      setMarks(marksData || []);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Failed to load marks",
        description: error.message || "There was an error loading the marks",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const organizeMarks = () => {
    const organized: GroupedMarks = {};
    
    marks.forEach((mark) => {
      const student = mark.students as any;
      const gradeName = student.grades?.name || 'Unknown Grade';
      const streamName = student.streams?.name || 'Unknown Stream';
      const subject = mark.subject;
      
      // Apply filters
      if (selectedGrade !== "all" && gradeName !== selectedGrade) return;
      if (selectedSubject !== "all" && subject !== selectedSubject) return;
      
      if (!organized[gradeName]) {
        organized[gradeName] = {};
      }
      if (!organized[gradeName][streamName]) {
        organized[gradeName][streamName] = {};
      }
      if (!organized[gradeName][streamName][subject]) {
        organized[gradeName][streamName][subject] = [];
      }
      
      organized[gradeName][streamName][subject].push(mark);
    });
    
    setGroupedMarks(organized);
  };

  const calculateStats = (marks: Mark[]) => {
    if (marks.length === 0) return { avg: 0, highest: 0, lowest: 0, count: 0 };
    
    const scores = marks.map(m => m.score);
    return {
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      count: marks.length
    };
  };

  const uniqueGrades = Array.from(new Set(marks.map(m => (m.students as any).grades?.name))).filter(Boolean);
  const uniqueSubjects = Array.from(new Set(marks.map(m => m.subject))).sort();

  if (isLoading) {
    return (
      <DashboardLayout title="Loading Marks...">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout title="Exam Not Found">
        <div className="text-center py-10">
          <ClipboardList className="h-16 w-16 mx-auto text-muted mb-4" />
          <h2 className="text-2xl font-bold mb-2">Exam Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested exam could not be found</p>
          <Button onClick={() => navigate("/exams")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Exams
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Marks - ${exam.name}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/exams")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Exams
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/exam-marks/${examId}`)}>
              <FileText className="mr-2 h-4 w-4" />
              Enter Marks
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Exam Details</span>
              <Badge variant="secondary">{marks.length} Total Marks</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Exam Name</p>
                <p className="font-medium">{exam.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Term</p>
                <p className="font-medium">{exam.terms?.name || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date Range</p>
                <p className="font-medium">
                  {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map(grade => (
                <SelectItem key={grade} value={grade!}>{grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {Object.keys(groupedMarks).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-16 w-16 mx-auto text-muted mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Marks Found</h3>
              <p className="text-muted-foreground mb-4">
                No marks have been entered for this exam yet with the selected filters.
              </p>
              <Button onClick={() => navigate(`/exam-marks/${examId}`)}>
                <FileText className="mr-2 h-4 w-4" />
                Start Entering Marks
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={Object.keys(groupedMarks)[0]} className="space-y-4">
            <TabsList>
              {Object.keys(groupedMarks).map(gradeName => (
                <TabsTrigger key={gradeName} value={gradeName}>
                  {gradeName}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(groupedMarks).map(([gradeName, streamData]) => (
              <TabsContent key={gradeName} value={gradeName} className="space-y-6">
                {Object.entries(streamData).map(([streamName, subjectData]) => (
                  <Card key={streamName}>
                    <CardHeader>
                      <CardTitle>{streamName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(subjectData).map(([subject, subjectMarks]) => {
                        const stats = calculateStats(subjectMarks);
                        return (
                          <div key={subject} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-lg">{subject}</h4>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Students: {stats.count}</span>
                                <span>Avg: {stats.avg}</span>
                                <span>High: {stats.highest}</span>
                                <span>Low: {stats.lowest}</span>
                              </div>
                            </div>
                            
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Admission No</TableHead>
                                  <TableHead>Student Name</TableHead>
                                  <TableHead className="text-center">Score</TableHead>
                                  <TableHead className="text-center">Grade</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {subjectMarks
                                  .sort((a, b) => b.score - a.score)
                                  .map((mark) => {
                                    const student = mark.students as any;
                                    return (
                                      <TableRow key={mark.id}>
                                        <TableCell>{student.admission_no}</TableCell>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant={mark.score >= 50 ? "default" : "destructive"}>
                                            {mark.score}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {mark.grade || 'N/A'}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExamMarksList;
