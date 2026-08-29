import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { analyticsService, StudentAnalyticsData } from "@/services/analyticsService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectComparisonChart } from "@/components/analytics/SubjectComparisonChart";
import { PerformanceCard } from "@/components/analytics/PerformanceCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export default function StudentAnalyticsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<StudentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedExam, setSelectedExam] = useState<string>(searchParams.get("examId") || "");

  useEffect(() => {
    if (studentId) {
      loadExams();
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      loadAnalytics();
    }
  }, [studentId, selectedExam]);

  const loadExams = async () => {
    if (!studentId) return;
    
    // First get the student's grade
    const { data: student } = await supabase
      .from("students")
      .select("grade_id")
      .eq("id", studentId)
      .single();
    
    if (!student?.grade_id) return;
    
    // Fetch exams that include this grade
    const { data } = await supabase
      .from("exams")
      .select("id, name")
      .eq("is_active", true)
      .contains("grades", [student.grade_id])
      .order("start_date", { ascending: false });
    setExams(data || []);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getStudentAnalytics(studentId!, selectedExam || undefined);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading student analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being generated"
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Student Analytics">
        <div className="flex items-center justify-center h-64">
          <p>Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout title="Student Analytics">
        <div className="flex items-center justify-center h-64">
          <p>No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${analytics.studentName} - Analytics`}>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{analytics.studentName}</h2>
            <p className="text-muted-foreground">
              {analytics.admissionNo} · {analytics.gradeName} {analytics.streamName}
            </p>
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
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Generate Report Card
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <PerformanceCard
            title="Overall Average"
            value={`${analytics.overallAverage.toFixed(1)}%`}
            description="Across all subjects"
          />
          <PerformanceCard
            title="Stream Ranking"
            value={`${analytics.rank}/${analytics.totalStudentsInStream}`}
            ranking={{
              position: analytics.rank,
              total: analytics.totalStudentsInStream,
              label: "in stream"
            }}
          />
          <PerformanceCard
            title="Attendance Rate"
            value={`${analytics.attendanceRate.toFixed(1)}%`}
            description="Overall attendance"
          />
          <PerformanceCard
            title="Total Subjects"
            value={analytics.subjectPerformance.length}
            description="Currently enrolled"
          />
        </div>

        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subjects">Subject Performance</TabsTrigger>
            <TabsTrigger value="comparison">Stream Comparison</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subject Breakdown</CardTitle>
                <CardDescription>Your performance in each subject</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Change</TableHead>
                      <TableHead className="text-center">Stream Avg</TableHead>
                      <TableHead className="text-center">Grade Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.subjectPerformance.map(subject => (
                      <TableRow key={subject.subject}>
                        <TableCell className="font-medium">{subject.subject}</TableCell>
                        <TableCell className="text-center">{subject.currentScore.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{subject.grade}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {subject.change !== undefined ? (
                            <div className="flex items-center justify-center gap-1">
                              {subject.change > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : subject.change < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-400" />
                              )}
                              <span className={
                                subject.change > 0 
                                  ? 'text-green-600' 
                                  : subject.change < 0 
                                    ? 'text-red-600' 
                                    : 'text-gray-400'
                              }>
                                {subject.change > 0 ? '+' : ''}{subject.change?.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{subject.streamAverage.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">{subject.gradeAverage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid gap-4">
              {analytics.subjectPerformance.map(subject => {
                const vsStream = subject.currentScore - subject.streamAverage;
                const vsGrade = subject.currentScore - subject.gradeAverage;
                
                return (
                  <Card key={subject.subject}>
                    <CardHeader>
                      <CardTitle>{subject.subject}</CardTitle>
                      <CardDescription>
                        Your score: {subject.currentScore.toFixed(1)}% · Grade: {subject.grade}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>vs Stream Average ({subject.streamAverage.toFixed(1)}%)</span>
                          <span className={vsStream >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {vsStream >= 0 ? '+' : ''}{vsStream.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={(subject.currentScore / subject.streamAverage) * 50} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>vs Grade Average ({subject.gradeAverage.toFixed(1)}%)</span>
                          <span className={vsGrade >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {vsGrade >= 0 ? '+' : ''}{vsGrade.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={(subject.currentScore / subject.gradeAverage) * 50} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Track your progress over time across multiple exams</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.trends.length > 0 ? (
                  <div className="space-y-6">
                    <SubjectComparisonChart
                      title=""
                      data={analytics.trends.map(t => ({
                        name: t.examName,
                        average: t.averageScore,
                        rank: t.rank
                      }))}
                      subjects={[
                        { name: "Average Score", dataKey: "average", color: "#2563EB" }
                      ]}
                      height={300}
                    />
                    
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-base">Ranking Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Exam</TableHead>
                              <TableHead className="text-center">Average Score</TableHead>
                              <TableHead className="text-center">Rank</TableHead>
                              <TableHead className="text-center">Change</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.trends.map((trend, index) => {
                              const previousRank = index > 0 ? analytics.trends[index - 1].rank : null;
                              const rankChange = previousRank ? previousRank - trend.rank : null;
                              
                              return (
                                <TableRow key={trend.examName}>
                                  <TableCell className="font-medium">{trend.examName}</TableCell>
                                  <TableCell className="text-center">{trend.averageScore.toFixed(1)}%</TableCell>
                                  <TableCell className="text-center">{trend.rank}</TableCell>
                                  <TableCell className="text-center">
                                    {rankChange !== null ? (
                                      <div className="flex items-center justify-center gap-1">
                                        {rankChange > 0 ? (
                                          <>
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="text-green-600">+{rankChange}</span>
                                          </>
                                        ) : rankChange < 0 ? (
                                          <>
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            <span className="text-red-600">{rankChange}</span>
                                          </>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>No historical exam data available yet. Performance trends will appear after multiple exams.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
