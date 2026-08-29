import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, School, TrendingUp, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";

interface Grade {
  id: string;
  name: string;
}

interface Stream {
  id: string;
  name: string;
  grade_id: string;
}

interface Student {
  id: string;
  name: string;
  admission_no: string;
  stream_id: string;
  grade_id: string;  // Include grade_id for proper filtering
}

interface Exam {
  id: string;
  name: string;
  start_date: string;
}

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { terminology } = useCurriculumTerminology();
  const { user } = useAuth();
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGrade) {
      const filtered = streams.filter(s => s.grade_id === selectedGrade);
      setFilteredStreams(filtered);
      setSelectedStream("");
      setSelectedStudent("");
    } else {
      setFilteredStreams([]);
    }
  }, [selectedGrade, streams]);

  useEffect(() => {
    // Filter students by BOTH grade_id AND stream_id
    if (selectedGrade && selectedStream) {
      const filtered = students.filter(s => 
        s.grade_id === selectedGrade && s.stream_id === selectedStream
      );
      setFilteredStudents(filtered);
      setSelectedStudent("");
    } else {
      setFilteredStudents([]);
    }
  }, [selectedGrade, selectedStream, students]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [gradesRes, gradeStreamsRes, studentsRes, examsRes] = await Promise.all([
        supabase.from("grades").select("id, name").order("level"),
        supabase
          .from("grade_streams")
          .select(`
            id,
            grades!inner(id),
            streams!inner(id, name)
          `),
        // Include grade_id for proper filtering
        supabase.from("students").select("id, name, admission_no, stream_id, grade_id").order("name"),
        supabase.from("exams").select("id, name, start_date").eq("is_active", true).order("start_date", { ascending: false })
      ]);

      if (gradesRes.error) throw gradesRes.error;
      if (gradeStreamsRes.error) throw gradeStreamsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (examsRes.error) throw examsRes.error;

      // Transform grade_streams into streams with grade_id
      const streamsWithGrades = (gradeStreamsRes.data || []).map(gs => ({
        id: (gs.streams as any).id,
        name: (gs.streams as any).name,
        grade_id: (gs.grades as any).id
      }));

      setGrades(gradesRes.data || []);
      setStreams(streamsWithGrades);
      setStudents(studentsRes.data || []);
      setExams(examsRes.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewGradeAnalytics = () => {
    if (!selectedGrade) {
      toast({
        title: "Selection Required",
        description: "Please select a grade to view analytics",
        variant: "destructive"
      });
      return;
    }
    const url = selectedExam 
      ? `/grade-analytics/${selectedGrade}?examId=${selectedExam}`
      : `/grade-analytics/${selectedGrade}`;
    navigate(url);
  };

  const handleViewStreamAnalytics = () => {
    if (!selectedGrade || !selectedStream) {
      toast({
        title: "Selection Required",
        description: "Please select both a grade and stream to view analytics",
        variant: "destructive"
      });
      return;
    }
    // Use gradeId/streamId path format for proper grade-stream combination
    const url = selectedExam 
      ? `/stream-analytics/${selectedGrade}/${selectedStream}?examId=${selectedExam}`
      : `/stream-analytics/${selectedGrade}/${selectedStream}`;
    navigate(url);
  };

  const handleViewStudentAnalytics = () => {
    if (!selectedStudent) {
      toast({
        title: "Selection Required",
        description: "Please select a student to view analytics",
        variant: "destructive"
      });
      return;
    }
    const url = selectedExam 
      ? `/student-analytics/${selectedStudent}?examId=${selectedExam}`
      : `/student-analytics/${selectedStudent}`;
    navigate(url);
  };

  if (loading) {
    return (
      <DashboardLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics & Reports">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            View comprehensive performance analytics for grades, streams, and individual students
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total {terminology.gradePlural}</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grades.length}</div>
              <p className="text-xs text-muted-foreground">Active {terminology.gradePlural.toLowerCase()} in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{streams.length}</div>
              <p className="text-xs text-muted-foreground">Active class streams</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-xs text-muted-foreground">Enrolled students</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="grade" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="grade" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">{terminology.gradeSingular}</TabsTrigger>
            <TabsTrigger value="stream" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">Stream</TabsTrigger>
            <TabsTrigger value="student" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">Student</TabsTrigger>
            <TabsTrigger value="marklists" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Marklists
            </TabsTrigger>
          </TabsList>

          {/* Grade Analytics Tab */}
          <TabsContent value="grade" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{terminology.gradeSingular} Performance Analytics</CardTitle>
                <CardDescription>
                  View comprehensive analytics for a specific {terminology.gradeSingular.toLowerCase()} including subject performance, 
                  stream comparisons, and top performers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Exam (Optional)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select {terminology.gradeSingular}</label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${terminology.gradeSingular.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Analytics include: Overall {terminology.gradeSingular.toLowerCase()} performance, subject breakdowns, stream comparisons, 
                    and top student rankings
                  </span>
                </div>

                <Button 
                  onClick={handleViewGradeAnalytics} 
                  disabled={!selectedGrade}
                  className="w-full"
                >
                  View {terminology.gradeSingular} Analytics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stream Analytics Tab */}
          <TabsContent value="stream" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stream Performance Analytics</CardTitle>
                <CardDescription>
                  View detailed analytics for a specific class stream including performance comparisons 
                  with {terminology.gradeSingular.toLowerCase()} average and student rankings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Exam (Optional)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select {terminology.gradeSingular}</label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${terminology.gradeSingular.toLowerCase()} first`} />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Stream</label>
                  <Select 
                    value={selectedStream} 
                    onValueChange={setSelectedStream}
                    disabled={!selectedGrade || filteredStreams.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !selectedGrade 
                          ? `Select a ${terminology.gradeSingular.toLowerCase()} first` 
                          : filteredStreams.length === 0 
                            ? "No streams available" 
                            : "Choose a stream"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStreams.map((stream) => (
                        <SelectItem key={stream.id} value={stream.id}>
                          {stream.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Analytics include: Stream vs grade comparison, subject performance breakdown, 
                    and complete student rankings
                  </span>
                </div>

                <Button 
                  onClick={handleViewStreamAnalytics} 
                  disabled={!selectedStream}
                  className="w-full"
                >
                  View Stream Analytics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Analytics Tab */}
          <TabsContent value="student" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Individual Student Analytics</CardTitle>
                <CardDescription>
                  View comprehensive performance analytics for individual students including subject 
                  breakdowns, rankings, and performance trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Exam (Optional)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Grade</label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a grade first" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Stream</label>
                  <Select 
                    value={selectedStream} 
                    onValueChange={setSelectedStream}
                    disabled={!selectedGrade || filteredStreams.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !selectedGrade 
                          ? "Select a grade first" 
                          : filteredStreams.length === 0 
                            ? "No streams available" 
                            : "Choose a stream"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStreams.map((stream) => (
                        <SelectItem key={stream.id} value={stream.id}>
                          {stream.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Student</label>
                  <Select 
                    value={selectedStudent} 
                    onValueChange={setSelectedStudent}
                    disabled={!selectedStream || filteredStudents.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !selectedStream 
                          ? "Select a stream first" 
                          : filteredStudents.length === 0 
                            ? "No students available" 
                            : "Choose a student"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.admission_no})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Analytics include: Subject performance, stream ranking, grade comparisons, 
                    attendance rate, and performance trends
                  </span>
                </div>

                <Button 
                  onClick={handleViewStudentAnalytics} 
                  disabled={!selectedStudent}
                  className="w-full"
                >
                  View Student Analytics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Marklists Tab */}
          <TabsContent value="marklists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Marklists
                </CardTitle>
                <CardDescription>
                  View and manage exam marklists by stream and subject
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate("/marklists")}
                  className="w-full"
                >
                  Open Marklists
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
