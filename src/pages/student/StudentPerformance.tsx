import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectComparisonChart } from "@/components/analytics/SubjectComparisonChart";

interface ExamResult {
  examId: string;
  examName: string;
  examDate: string;
  subjects: {
    name: string;
    score: number;
    outOf: number;
    grade: string | null;
    percentage: number;
  }[];
  average: number;
  totalScore: number;
  totalOutOf: number;
}

interface Exam {
  id: string;
  name: string;
}

interface TrendData {
  name: string;
  [key: string]: string | number;
}

const StudentPerformance = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [subjects, setSubjects] = useState<{ name: string; dataKey: string; color: string }[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchStudentAndResults();
    }
  }, [user?.id]);

  useEffect(() => {
    const examId = searchParams.get('examId');
    if (examId) {
      setSelectedExam(examId);
    }
  }, [searchParams]);

  const colors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

  const fetchStudentAndResults = async () => {
    try {
      // Get student ID from user
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!student) {
        setLoading(false);
        return;
      }

      setStudentId(student.id);

      // Fetch all marks with exam info
      const { data: marks } = await supabase
        .from('marks')
        .select(`
          exam_id,
          subject,
          score,
          out_of,
          grade,
          exams!marks_exam_id_fkey(id, name, start_date)
        `)
        .eq('student_id', student.id)
        .order('recorded_at', { ascending: false });

      if (marks && marks.length > 0) {
        // Get unique exams
        const uniqueExams = new Map<string, Exam>();
        marks.forEach((mark: any) => {
          if (mark.exams && !uniqueExams.has(mark.exam_id)) {
            uniqueExams.set(mark.exam_id, {
              id: mark.exam_id,
              name: mark.exams.name
            });
          }
        });
        setExams(Array.from(uniqueExams.values()));

        // Group marks by exam
        const examMap = new Map<string, ExamResult>();
        const allSubjects = new Set<string>();
        
        marks.forEach((mark: any) => {
          const examId = mark.exam_id;
          allSubjects.add(mark.subject);
          
          if (!examMap.has(examId)) {
            examMap.set(examId, {
              examId,
              examName: mark.exams?.name || 'Unknown',
              examDate: mark.exams?.start_date || '',
              subjects: [],
              average: 0,
              totalScore: 0,
              totalOutOf: 0
            });
          }
          
          const exam = examMap.get(examId)!;
          const percentage = mark.out_of > 0 ? (mark.score / mark.out_of) * 100 : 0;
          
          exam.subjects.push({
            name: mark.subject,
            score: mark.score,
            outOf: mark.out_of,
            grade: mark.grade,
            percentage: Math.round(percentage * 10) / 10
          });
          exam.totalScore += mark.score;
          exam.totalOutOf += mark.out_of;
        });

        // Calculate averages
        examMap.forEach((exam) => {
          exam.average = exam.totalOutOf > 0 
            ? Math.round((exam.totalScore / exam.totalOutOf) * 1000) / 10 
            : 0;
        });

        const results = Array.from(examMap.values());
        results.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
        setExamResults(results);

        // Build trend data for chart
        const subjectsList = Array.from(allSubjects);
        setSubjects(subjectsList.map((name, idx) => ({
          name,
          dataKey: name,
          color: colors[idx % colors.length]
        })));

        // Create trend data (exam-by-exam comparison)
        const trend: TrendData[] = results.reverse().map(exam => {
          const data: TrendData = { name: exam.examName };
          exam.subjects.forEach(sub => {
            data[sub.name] = sub.percentage;
          });
          return data;
        });
        setTrendData(trend);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    if (percentage >= 40) return "outline";
    return "destructive";
  };

  const filteredResults = selectedExam === "all" 
    ? examResults 
    : examResults.filter(r => r.examId === selectedExam);

  if (loading) {
    return (
      <DashboardLayout title="My Performance">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Performance">
      <div className="space-y-6">
        {/* Summary Stats */}
        {examResults.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg p-3 bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-2xl">{examResults[0]?.average}%</h3>
                    <p className="text-sm text-muted-foreground">Latest Average</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg p-3 bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-2xl">{examResults.length}</h3>
                    <p className="text-sm text-muted-foreground">Exams Taken</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg p-3 bg-green-100">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-2xl">
                      {examResults[0]?.subjects.length || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground">Subjects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different views */}
        <Tabs defaultValue="results" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="results">Exam Results</TabsTrigger>
              <TabsTrigger value="trends">Performance Trends</TabsTrigger>
            </TabsList>
            
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="results" className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No exam results found.</p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((exam) => (
                <Card key={exam.examId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{exam.examName}</CardTitle>
                        <CardDescription>
                          {exam.examDate && new Date(exam.examDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={getGradeBadgeVariant(exam.average)}
                        className="text-lg px-4 py-1"
                      >
                        {exam.average}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">Out Of</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                          <TableHead className="text-right">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exam.subjects.map((subject, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell className="text-right">{subject.score}</TableCell>
                            <TableCell className="text-right">{subject.outOf}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getGradeBadgeVariant(subject.percentage)}>
                                {subject.percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {subject.grade || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">{exam.totalScore}</TableCell>
                          <TableCell className="text-right">{exam.totalOutOf}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getGradeBadgeVariant(exam.average)}>
                              {exam.average}%
                            </Badge>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="trends">
            {trendData.length > 1 ? (
              <SubjectComparisonChart
                title="Performance Over Time"
                description="Your scores across different exams"
                data={trendData}
                subjects={subjects}
                height={400}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Not enough exam data to show trends. Complete more exams to see your progress over time.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentPerformance;
