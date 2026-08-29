import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceCard } from "@/components/analytics/PerformanceCard";
import { ExamPerformanceChart } from "@/components/analytics/ExamPerformanceChart";
import { SubjectComparisonChart } from "@/components/analytics/SubjectComparisonChart";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, Users, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StreamAssignment {
  streamId: string;
  streamName: string;
  gradeId: string;
  gradeName: string;
  subject: string;
}

interface SubjectAnalyticsData {
  streamId: string;
  streamName: string;
  gradeName: string;
  subject: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  studentCount: number;
  passingRate: number;
  topStudents: {
    id: string;
    name: string;
    admissionNo: string;
    score: number;
  }[];
}

interface TeacherSubjectAnalyticsProps {
  teacherId: string;
  schoolId: string;
  assignments: StreamAssignment[];
}

export function TeacherSubjectAnalytics({
  teacherId,
  schoolId,
  assignments
}: TeacherSubjectAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<SubjectAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // Get unique subjects from assignments
  const uniqueSubjects = [...new Set(assignments.map(a => a.subject))];

  useEffect(() => {
    fetchExams();
  }, [schoolId]);

  useEffect(() => {
    if (assignments.length > 0) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [assignments, selectedExamId, selectedSubject]);

  const fetchExams = async () => {
    try {
      const { data } = await supabase
        .from("exams")
        .select("id, name")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false });

      setExams(data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const results: SubjectAnalyticsData[] = [];

      // Filter assignments based on selected subject
      const filteredAssignments = selectedSubject === "all" 
        ? assignments 
        : assignments.filter(a => a.subject === selectedSubject);

      for (const assignment of filteredAssignments) {
        // Get students in this stream and grade
        const { data: students } = await supabase
          .from("students")
          .select("id, name, admission_no")
          .eq("stream_id", assignment.streamId)
          .eq("grade_id", assignment.gradeId);

        if (!students || students.length === 0) continue;

        const studentIds = students.map(s => s.id);

        // Get marks for this subject and these students
        let marksQuery = supabase
          .from("marks")
          .select("student_id, score, computed_score")
          .in("student_id", studentIds)
          .eq("subject", assignment.subject);

        if (selectedExamId !== "all") {
          marksQuery = marksQuery.eq("exam_id", selectedExamId);
        }

        const { data: marks } = await marksQuery;

        if (!marks || marks.length === 0) continue;

        // Calculate analytics
        const scores = marks.map(m => m.computed_score || m.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);
        const passingRate = (scores.filter(s => s >= 50).length / scores.length) * 100;

        // Get top students
        const studentScores = new Map<string, number[]>();
        marks.forEach(m => {
          const score = m.computed_score || m.score;
          if (!studentScores.has(m.student_id)) {
            studentScores.set(m.student_id, []);
          }
          studentScores.get(m.student_id)!.push(score);
        });

        const topStudents = Array.from(studentScores.entries())
          .map(([studentId, scores]) => {
            const student = students.find(s => s.id === studentId);
            return {
              id: studentId,
              name: student?.name || "Unknown",
              admissionNo: student?.admission_no || "",
              score: scores.reduce((a, b) => a + b, 0) / scores.length
            };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        results.push({
          streamId: assignment.streamId,
          streamName: assignment.streamName,
          gradeName: assignment.gradeName,
          subject: assignment.subject,
          averageScore,
          highestScore,
          lowestScore,
          studentCount: studentScores.size,
          passingRate,
          topStudents
        });
      }

      setAnalyticsData(results);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No subject assignments found</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall statistics
  const totalStudents = analyticsData.reduce((sum, d) => sum + d.studentCount, 0);
  const overallAverage = analyticsData.length > 0
    ? analyticsData.reduce((sum, d) => sum + d.averageScore * d.studentCount, 0) / totalStudents
    : 0;
  const overallPassingRate = analyticsData.length > 0
    ? analyticsData.reduce((sum, d) => sum + d.passingRate * d.studentCount, 0) / totalStudents
    : 0;

  // Prepare chart data - performance by stream
  const streamChartData = analyticsData.map(d => ({
    name: `${d.gradeName} ${d.streamName}`.slice(0, 15),
    value: Math.round(d.averageScore * 10) / 10,
    subject: d.subject
  }));

  // Group by subject for comparison
  const subjectAverages = uniqueSubjects.map(subject => {
    const subjectData = analyticsData.filter(d => d.subject === subject);
    const totalStudents = subjectData.reduce((sum, d) => sum + d.studentCount, 0);
    const avg = totalStudents > 0
      ? subjectData.reduce((sum, d) => sum + d.averageScore * d.studentCount, 0) / totalStudents
      : 0;
    return { name: subject, value: Math.round(avg * 10) / 10 };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-base sm:text-lg font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
          Subject Analytics
        </h3>
        <div className="flex gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map(exam => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <PerformanceCard
          title="Overall Avg"
          value={`${Math.round(overallAverage * 10) / 10}%`}
          description="All streams"
        />
        <PerformanceCard
          title="Students"
          value={totalStudents}
          description="Assessed"
        />
        <PerformanceCard
          title="Pass Rate"
          value={`${Math.round(overallPassingRate)}%`}
          description="50%+"
        />
        <PerformanceCard
          title="Streams"
          value={analyticsData.length}
          description="Teaching"
        />
      </div>

      {/* Performance by Subject */}
      {subjectAverages.length > 1 && (
        <ExamPerformanceChart
          title="Performance by Subject"
          description="Your average scores across subjects"
          data={subjectAverages}
          dataKey="value"
        />
      )}

      {/* Performance by Stream */}
      {streamChartData.length > 0 && (
        <ExamPerformanceChart
          title="Performance by Class"
          description="Average scores in each class you teach"
          data={streamChartData}
          dataKey="value"
        />
      )}

      {/* Detailed Stream Cards */}
      {analyticsData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Class Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {analyticsData.map((data, index) => (
                <div key={`${data.streamId}-${data.subject}-${index}`} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm truncate">
                      {data.gradeName} {data.streamName}
                    </h4>
                    <Badge variant="outline" className="text-xs shrink-0 ml-1">{data.subject}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-xs sm:text-sm mb-3">
                    <div className="text-center">
                      <p className="text-muted-foreground">Avg</p>
                      <p className="font-bold">{Math.round(data.averageScore)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">High</p>
                      <p className="font-bold text-primary">{Math.round(data.highestScore)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Low</p>
                      <p className="font-bold text-destructive">{Math.round(data.lowestScore)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Pass</p>
                      <p className="font-bold">{Math.round(data.passingRate)}%</p>
                    </div>
                  </div>

                  {data.topStudents.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1 flex items-center gap-1 text-muted-foreground">
                        <Award className="h-3 w-3" /> Top 3
                      </p>
                      <div className="space-y-1">
                        {data.topStudents.slice(0, 3).map((student, idx) => (
                          <div 
                            key={student.id} 
                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                idx === 0 ? "bg-primary/20 text-primary" : "bg-muted"
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="truncate">{student.name}</span>
                            </span>
                            <Badge variant="secondary" className="text-xs shrink-0 ml-1">{Math.round(student.score)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
