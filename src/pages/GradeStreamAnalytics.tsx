import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { analyticsService, GradeStreamAnalytics as GradeStreamAnalyticsData } from "@/services/analyticsService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExamPerformanceChart } from "@/components/analytics/ExamPerformanceChart";
import { SubjectComparisonChart } from "@/components/analytics/SubjectComparisonChart";
import { RankingsTable } from "@/components/analytics/RankingsTable";
import { PerformanceCard } from "@/components/analytics/PerformanceCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PerformanceListDownload } from "@/components/analytics/PerformanceListDownload";

export default function GradeStreamAnalytics() {
  const { gradeId, streamId } = useParams<{ gradeId: string; streamId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<GradeStreamAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Array<{ id: string; name: string; term_id?: string | null; term_name?: string | null }>>([]);
  const [selectedExam, setSelectedExam] = useState<string>(searchParams.get("examId") || "");

  useEffect(() => {
    if (gradeId) {
      loadExams();
    }
  }, [gradeId]);

  useEffect(() => {
    if (gradeId && streamId) {
      loadAnalytics();
    }
  }, [gradeId, streamId, selectedExam]);

  const loadExams = async () => {
    if (!gradeId) return;
    
    // Fetch exams that include this grade, with term info
    const { data } = await supabase
      .from("exams")
      .select("id, name, term_id")
      .eq("is_active", true)
      .contains("grades", [gradeId])
      .order("start_date", { ascending: false });

    // Fetch term names for exams that have term_id
    const termIds = [...new Set((data || []).map((e) => e.term_id).filter(Boolean))] as string[];
    let termMap: Record<string, string> = {};
    if (termIds.length > 0) {
      const { data: terms } = await supabase
        .from("terms")
        .select("id, name")
        .in("id", termIds);
      termMap = Object.fromEntries((terms || []).map((t) => [t.id, t.name]));
    }

    setExams(
      (data || []).map((e) => ({
        ...e,
        term_name: e.term_id ? termMap[e.term_id] || null : null,
      }))
    );
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Pass gradeId to get the correct grade-stream combination
      const data = await analyticsService.getGradeStreamAnalytics(streamId!, selectedExam || undefined, gradeId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading stream analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <DashboardLayout title="Stream Analytics">
        <div className="flex items-center justify-center h-64">
          <p>Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout title="Stream Analytics">
        <div className="flex items-center justify-center h-64">
          <p>No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  const subjectChartData = analytics.subjectPerformance.map(s => ({
    name: s.subject,
    value: s.averageScore
  }));

  const rankingsData = analytics.rankings.map(s => ({
    id: s.studentId,
    name: s.studentName,
    value: s.averageScore,
    previousValue: undefined,
    previousRank: undefined,
    metadata: { admissionNo: s.admissionNo }
  }));

  const comparisonDiff = analytics.comparisonWithGrade.difference;
  const isAboveGrade = comparisonDiff > 0;

  return (
    <DashboardLayout title={`${analytics.gradeName} ${analytics.streamName} Analytics`}>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{analytics.gradeName} {analytics.streamName}</h2>
            <p className="text-muted-foreground">Stream Performance Analysis</p>
            <div className="mt-4 max-w-xs">
              <label className="text-sm font-medium">Filter by Exam</label>
              <Select value={selectedExam || "all"} onValueChange={(value) => setSelectedExam(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All exams (latest data)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All exams (latest data)</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <PerformanceListDownload
            gradeId={gradeId!}
            streamId={streamId!}
            exams={exams}
            selectedExamId={selectedExam || undefined}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <PerformanceCard
            title="Total Students"
            value={analytics.studentCount}
            description="Enrolled in stream"
          />
          <PerformanceCard
            title="Stream Average"
            value={`${analytics.overallAverage.toFixed(1)}%`}
            description="Overall performance"
          />
          <PerformanceCard
            title="vs Grade Average"
            value={`${Math.abs(comparisonDiff).toFixed(1)}%`}
            trend={{
              value: Math.abs(comparisonDiff),
              isPositive: isAboveGrade,
              label: isAboveGrade ? "above" : "below"
            }}
          />
          <PerformanceCard
            title="Total Subjects"
            value={analytics.subjectPerformance.length}
            description="Subjects taught"
          />
        </div>

        {/* Comparison with Grade */}
        <Card>
          <CardHeader>
            <CardTitle>Stream vs Grade Comparison</CardTitle>
            <CardDescription>How this stream performs compared to the entire grade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Grade Average</p>
                <p className="text-3xl font-bold">{analytics.comparisonWithGrade.gradeAverage.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Stream Average</p>
                <p className="text-3xl font-bold">{analytics.comparisonWithGrade.streamAverage.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Difference</p>
                <div className="flex items-center justify-center gap-2">
                  {isAboveGrade ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                  <p className={`text-3xl font-bold ${isAboveGrade ? 'text-green-600' : 'text-red-600'}`}>
                    {isAboveGrade ? '+' : ''}{comparisonDiff.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subject Analysis</TabsTrigger>
            <TabsTrigger value="rankings">Student Rankings</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ExamPerformanceChart
              title="Subject Performance"
              description="Average scores by subject in this stream"
              data={subjectChartData}
              dataKey="value"
              height={400}
            />
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subject Breakdown</CardTitle>
                <CardDescription>Detailed performance metrics per subject</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Average</TableHead>
                      <TableHead className="text-center">Highest</TableHead>
                      <TableHead className="text-center">Lowest</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Passing Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.subjectPerformance.map(subject => (
                      <TableRow key={subject.subject}>
                        <TableCell className="font-medium">{subject.subject}</TableCell>
                        <TableCell className="text-center">{subject.averageScore.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">{subject.highestScore}%</TableCell>
                        <TableCell className="text-center">{subject.lowestScore}%</TableCell>
                        <TableCell className="text-center">{subject.studentCount}</TableCell>
                        <TableCell className="text-center">{subject.passingRate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings">
            <RankingsTable
              title="Student Rankings"
              description="All students ranked by overall average score"
              data={rankingsData}
              valueLabel="Average"
              showTrend={false}
              valueFormatter={(value) => `${value.toFixed(1)}%`}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stream Performance Trends</CardTitle>
                <CardDescription>Track stream performance across multiple exams</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.trends.length > 0 ? (
                  <SubjectComparisonChart
                    title=""
                    data={analytics.trends.map(t => ({
                      name: t.examName,
                      streamAverage: t.averageScore,
                      date: new Date(t.examDate).toLocaleDateString()
                    }))}
                    subjects={[
                      { name: "Stream Average", dataKey: "streamAverage", color: "#2563EB" }
                    ]}
                    height={350}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>No historical exam data available yet. Performance trends will appear after multiple exams.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {analytics.trends.length > 0 && analytics.trends[0].subjectAverages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Subject Performance Trends</CardTitle>
                  <CardDescription>Compare subject performance across exams</CardDescription>
                </CardHeader>
                <CardContent>
                  <SubjectComparisonChart
                    title=""
                    data={analytics.trends.map(t => {
                      const dataPoint: any = { name: t.examName };
                      t.subjectAverages.forEach(sa => {
                        dataPoint[sa.subject] = sa.average;
                      });
                      return dataPoint;
                    })}
                    subjects={
                      analytics.trends[0].subjectAverages.map((sa, index) => ({
                        name: sa.subject,
                        dataKey: sa.subject,
                        color: `hsl(${(index * 360) / analytics.trends[0].subjectAverages.length}, 70%, 50%)`
                      }))
                    }
                    height={400}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
