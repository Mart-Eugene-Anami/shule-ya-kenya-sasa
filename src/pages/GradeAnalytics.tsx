import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { analyticsService, GradeAnalytics as GradeAnalyticsData } from "@/services/analyticsService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExamPerformanceChart } from "@/components/analytics/ExamPerformanceChart";
import { SubjectComparisonChart } from "@/components/analytics/SubjectComparisonChart";
import { RankingsTable } from "@/components/analytics/RankingsTable";
import { PerformanceCard } from "@/components/analytics/PerformanceCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PerformanceListDownload } from "@/components/analytics/PerformanceListDownload";

export default function GradeAnalytics() {
  const { gradeId } = useParams<{ gradeId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<GradeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Array<{ id: string; name: string; term_id?: string | null; term_name?: string | null }>>([]);
  const [selectedExam, setSelectedExam] = useState<string>(searchParams.get("examId") || "");

  useEffect(() => {
    if (gradeId) {
      loadExams();
    }
  }, [gradeId]);

  useEffect(() => {
    if (gradeId) {
      loadAnalytics();
    }
  }, [gradeId, selectedExam]);

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
      const data = await analyticsService.getGradeAnalytics(gradeId!, selectedExam || undefined);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading grade analytics:', error);
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
      <DashboardLayout title="Grade Analytics">
        <div className="flex items-center justify-center h-64">
          <p>Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout title="Grade Analytics">
        <div className="flex items-center justify-center h-64">
          <p>No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${analytics.gradeName} Analytics`}>
      <div className="space-y-6">
        {/* Header with Export */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{analytics.gradeName} Performance Overview</h2>
            <p className="text-muted-foreground">Academic year analytics and insights</p>
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
            exams={exams}
            selectedExamId={selectedExam || undefined}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <PerformanceCard
            title="Overall Average"
            value={`${analytics.overallAverage.toFixed(1)}%`}
            description={`Across ${analytics.studentCount} students`}
            className="border-primary/20"
          />
          <PerformanceCard
            title="Total Students"
            value={analytics.studentCount}
            description={`${analytics.streamPerformance.length} streams`}
          />
          <PerformanceCard
            title="Subjects Assessed"
            value={analytics.subjectPerformance.length}
            description="Active subjects"
          />
        </div>

        {/* Charts and Details */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subject Analysis</TabsTrigger>
            <TabsTrigger value="streams">Stream Comparison</TabsTrigger>
            <TabsTrigger value="rankings">Top Performers</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ExamPerformanceChart
              title="Subject Performance Overview"
              description="Average scores across all subjects"
              data={analytics.subjectPerformance.map(s => ({
                name: s.subject,
                value: s.averageScore
              }))}
              dataKey="value"
              height={350}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Stream Performance</CardTitle>
                  <CardDescription>Average scores by stream</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.streamPerformance
                      .sort((a, b) => b.averageScore - a.averageScore)
                      .map((stream, idx) => (
                        <div key={stream.streamId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={idx === 0 ? "default" : "outline"}>
                              #{idx + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{stream.streamName}</p>
                              <p className="text-sm text-muted-foreground">
                                {stream.studentCount} students
                              </p>
                            </div>
                          </div>
                          <span className="text-lg font-bold">{stream.averageScore.toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                  <CardDescription>Subject score ranges</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.subjectPerformance.map(subject => (
                      <div key={subject.subject}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{subject.subject}</span>
                          <span className="text-muted-foreground">
                            {subject.lowestScore.toFixed(0)} - {subject.highestScore.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${subject.averageScore}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Subject Analysis</CardTitle>
                <CardDescription>Comprehensive subject performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                      <TableHead className="text-right">Highest</TableHead>
                      <TableHead className="text-right">Lowest</TableHead>
                      <TableHead className="text-right">Pass Rate</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.subjectPerformance.map(subject => (
                      <TableRow key={subject.subject}>
                        <TableCell className="font-medium">{subject.subject}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {subject.averageScore.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {subject.highestScore.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {subject.lowestScore.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {subject.passingRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{subject.studentCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streams" className="space-y-4">
            <ExamPerformanceChart
              title="Stream Performance Comparison"
              description="Average scores by stream"
              data={analytics.streamPerformance.map((s, idx) => ({
                name: s.streamName,
                value: s.averageScore,
                rank: idx + 1
              }))}
              dataKey="value"
              showRankings={true}
              height={350}
            />
          </TabsContent>

          <TabsContent value="rankings" className="space-y-4">
            <RankingsTable
              title="Top Performing Students"
              description="Based on overall average across all subjects"
              data={analytics.topStudents.map(s => ({
                id: s.studentId,
                name: `${s.studentName} (${s.admissionNo})`,
                value: s.averageScore,
                metadata: { streamName: s.streamId }
              }))}
              valueLabel="Average Score"
              showTrend={false}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends Over Time</CardTitle>
                <CardDescription>Track grade performance across multiple exams</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.trends.length > 0 ? (
                  <SubjectComparisonChart
                    title=""
                    data={analytics.trends.map(t => ({
                      name: t.examName,
                      average: t.averageScore,
                      date: new Date(t.examDate).toLocaleDateString()
                    }))}
                    subjects={[
                      { name: "Grade Average", dataKey: "average", color: "#2563EB" }
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
