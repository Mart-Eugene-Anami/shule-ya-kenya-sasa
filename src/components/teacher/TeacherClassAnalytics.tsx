import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceCard } from "@/components/analytics/PerformanceCard";
import { ExamPerformanceChart } from "@/components/analytics/ExamPerformanceChart";
import { SubjectComparisonChart } from "@/components/analytics/SubjectComparisonChart";
import { analyticsService, GradeStreamAnalytics, TrendData } from "@/services/analyticsService";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";

interface Exam {
  id: string;
  name: string;
}

interface TeacherClassAnalyticsProps {
  streamId: string;
  gradeId: string;
  gradeName: string;
  streamName: string;
  schoolId: string;
}

export function TeacherClassAnalytics({
  streamId,
  gradeId,
  gradeName,
  streamName,
  schoolId
}: TeacherClassAnalyticsProps) {
  const [analytics, setAnalytics] = useState<GradeStreamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("all");

  useEffect(() => {
    fetchExams();
  }, [schoolId, gradeId]);

  useEffect(() => {
    fetchAnalytics();
  }, [streamId, gradeId, selectedExamId]);

  const fetchExams = async () => {
    try {
      const { data } = await supabase
        .from("exams")
        .select("id, name")
        .eq("school_id", schoolId)
        .contains("grades", [gradeId])
        .order("start_date", { ascending: false });

      setExams(data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const examId = selectedExamId === "all" ? undefined : selectedExamId;
      const data = await analyticsService.getGradeStreamAnalytics(streamId, examId, gradeId);
      setAnalytics(data);
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

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No analytics data available yet. Analytics will appear once marks are entered.
        </CardContent>
      </Card>
    );
  }

  // Prepare subject performance data for chart
  const subjectChartData = analytics.subjectPerformance.map(sp => ({
    name: sp.subject.length > 10 ? sp.subject.slice(0, 10) + "..." : sp.subject,
    value: Math.round(sp.averageScore * 10) / 10
  }));

  // Prepare trend data for chart
  const trendChartData = analytics.trends.map(t => ({
    name: t.examName,
    average: Math.round(t.averageScore * 10) / 10
  }));

  const trendSubjects = [
    { name: "Class Average", dataKey: "average", color: "hsl(var(--primary))" }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Exam Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base sm:text-lg font-medium">
          {gradeName} {streamName} Analytics
        </h3>
        <Select value={selectedExamId} onValueChange={setSelectedExamId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select exam" />
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

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <PerformanceCard
          title="Class Avg"
          value={`${Math.round(analytics.overallAverage * 10) / 10}%`}
          description="Overall"
        />
        <PerformanceCard
          title="Students"
          value={analytics.studentCount}
          description="With marks"
        />
        <PerformanceCard
          title="vs Grade"
          value={`${analytics.comparisonWithGrade.difference >= 0 ? "+" : ""}${Math.round(analytics.comparisonWithGrade.difference * 10) / 10}%`}
          description={analytics.comparisonWithGrade.difference >= 0 ? "Above" : "Below"}
          trend={{
            value: Math.abs(Math.round(analytics.comparisonWithGrade.difference * 10) / 10),
            isPositive: analytics.comparisonWithGrade.difference >= 0,
            label: ""
          }}
        />
        <PerformanceCard
          title="Subjects"
          value={analytics.subjectPerformance.length}
          description="Analyzed"
        />
      </div>

      {/* Subject Performance Chart */}
      {subjectChartData.length > 0 && (
        <ExamPerformanceChart
          title="Subject Performance"
          description="Average scores by subject"
          data={subjectChartData}
          dataKey="value"
        />
      )}

      {/* Top Students */}
      {analytics.rankings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
              Top Performers
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Based on average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.rankings.slice(0, 5).map((student, index) => (
                <div
                  key={student.studentId}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                      index === 0 ? "bg-primary/20 text-primary" :
                      index === 1 ? "bg-secondary text-secondary-foreground" :
                      index === 2 ? "bg-accent text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {student.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{student.studentName}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{student.admissionNo}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm sm:text-base shrink-0 ml-2">
                    {Math.round(student.averageScore * 10) / 10}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Trend */}
      {trendChartData.length > 1 && (
        <SubjectComparisonChart
          title="Performance Trend"
          description="Class average across exams"
          data={trendChartData}
          subjects={trendSubjects}
          height={300}
        />
      )}

      {/* Subject Details */}
      {analytics.subjectPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Subject Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.subjectPerformance.map(sp => (
                <div key={sp.subject} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm truncate">{sp.subject}</h4>
                    <Badge
                      variant={sp.passingRate >= 80 ? "default" : sp.passingRate >= 50 ? "secondary" : "destructive"}
                      className="text-xs shrink-0 ml-1"
                    >
                      {Math.round(sp.passingRate)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs sm:text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Avg</p>
                      <p className="font-bold">{Math.round(sp.averageScore)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">High</p>
                      <p className="font-bold text-primary">{Math.round(sp.highestScore)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Low</p>
                      <p className="font-bold text-destructive">{Math.round(sp.lowestScore)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
