import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ClipboardList,
  TrendingUp,
  Clock,
  FileText,
  BarChart3,
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  UserCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";
import { ClassTimetable } from "@/components/teacher/ClassTimetable";

interface StudentInfo {
  id: string;
  name: string;
  admission_no: string;
  email: string | null;
  grade_id: string;
  stream_id: string;
  pathway: string | null;
  grade: { name: string; curriculum: string } | null;
  stream: { name: string } | null;
  school_id: string;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

interface RecentExam {
  id: string;
  name: string;
  average: number;
  rank: number;
  totalStudents: number;
}

interface UpcomingExam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface ClassTeacherInfo {
  name: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { terminology } = useCurriculumTerminology();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceSummary>({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [subjectCount, setSubjectCount] = useState(0);
  const [classmateCount, setClassmateCount] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [classTeacher, setClassTeacher] = useState<ClassTeacherInfo | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchStudentData();
    }
  }, [user?.id]);

  const fetchStudentData = async () => {
    try {
      // Fetch student info linked to user
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          admission_no,
          email,
          grade_id,
          stream_id,
          pathway,
          school_id,
          grades!students_grade_id_fkey(name, curriculum),
          streams!students_stream_id_fkey(name)
        `)
        .eq('user_id', user?.id)
        .single();

      if (studentError) {
        console.error("Error fetching student:", studentError);
        setLoading(false);
        return;
      }

      const studentData = {
        ...student,
        grade: student.grades,
        stream: student.streams
      } as StudentInfo;
      
      setStudentInfo(studentData);

      // Parallel fetches
      const [attendanceResult, marksResult, classmatesResult, classTeacherResult, upcomingExamsResult] = await Promise.all([
        // Attendance
        supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id),
        // Marks
        supabase
          .from('marks')
          .select(`
            exam_id,
            score,
            subject,
            exams!marks_exam_id_fkey(id, name, start_date)
          `)
          .eq('student_id', student.id)
          .order('recorded_at', { ascending: false }),
        // Classmates count
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('stream_id', student.stream_id)
          .eq('grade_id', student.grade_id)
          .eq('status', 'active'),
        // Class teacher from grade_streams
        supabase
          .from('grade_streams')
          .select(`
            teacher_id,
            teachers!grade_streams_teacher_id_fkey(name)
          `)
          .eq('grade_id', student.grade_id)
          .eq('stream_id', student.stream_id)
          .maybeSingle(),
        // Upcoming exams
        supabase
          .from('exams')
          .select('id, name, start_date, end_date')
          .eq('school_id', student.school_id)
          .gte('end_date', new Date().toISOString().split('T')[0])
          .contains('grades', [student.grade_id])
          .order('start_date', { ascending: true })
          .limit(5)
      ]);

      // Process attendance
      if (attendanceResult.data) {
        const total = attendanceResult.data.length;
        const present = attendanceResult.data.filter(a => a.status === 'present').length;
        const absent = total - present;
        setAttendance({
          total,
          present,
          absent,
          percentage: total > 0 ? Math.round((present / total) * 100) : 100
        });
      }

      // Process marks
      if (marksResult.data && marksResult.data.length > 0) {
        const marks = marksResult.data;
        const examMap = new Map<string, { name: string; scores: number[]; date: string }>();
        marks.forEach((mark: any) => {
          const examId = mark.exam_id;
          if (!examMap.has(examId)) {
            examMap.set(examId, {
              name: mark.exams?.name || 'Unknown',
              scores: [],
              date: mark.exams?.start_date || ''
            });
          }
          examMap.get(examId)?.scores.push(mark.score);
        });

        const examResults: RecentExam[] = [];
        examMap.forEach((value, key) => {
          const avg = value.scores.reduce((a, b) => a + b, 0) / value.scores.length;
          examResults.push({
            id: key,
            name: value.name,
            average: Math.round(avg * 10) / 10,
            rank: 0,
            totalStudents: 0
          });
        });

        setRecentExams(examResults.slice(0, 3));
        const uniqueSubjects = new Set(marks.map((m: any) => m.subject));
        setSubjectCount(uniqueSubjects.size);
      }

      // Process classmates
      setClassmateCount(classmatesResult.count || 0);

      // Process class teacher
      if (classTeacherResult.data) {
        const ct = classTeacherResult.data as any;
        if (ct.teachers?.name) {
          setClassTeacher({ name: ct.teachers.name });
        }
      }

      // Process upcoming exams
      if (upcomingExamsResult.data) {
        setUpcomingExams(upcomingExamsResult.data.map((e: any) => ({
          id: e.id,
          name: e.name,
          startDate: e.start_date,
          endDate: e.end_date
        })));
      }

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!studentInfo) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">No student record found linked to your account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Welcome, {studentInfo.name}!
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="gap-1 text-xs sm:text-sm">
              <GraduationCap className="h-3 w-3" />
              {studentInfo.grade?.name} - {studentInfo.stream?.name}
            </Badge>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              Adm: {studentInfo.admission_no}
            </Badge>
            {studentInfo.pathway && (
              <Badge variant="outline" className="text-xs sm:text-sm">
                {studentInfo.pathway}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{subjectCount || '—'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle2 className={`h-6 w-6 sm:h-8 sm:w-8 shrink-0 ${attendance.percentage >= 80 ? 'text-primary' : attendance.percentage >= 60 ? 'text-yellow-500' : 'text-destructive'}`} />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{attendance.percentage}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{classmateCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Classmates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">
                    {recentExams.length > 0 ? `${recentExams[0].average}%` : '—'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Latest Avg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/student/performance')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/student/attendance')}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Attendance
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/student/reports')}>
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/student/subjects')}>
            <BookOpen className="h-4 w-4 mr-2" />
            Subjects & Teachers
          </Button>
        </div>

        {/* Class Teacher & Attendance Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Class Teacher */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                Class Teacher
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classTeacher ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{classTeacher.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {studentInfo.grade?.name} {studentInfo.stream?.name}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No class teacher assigned yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Attendance Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.total > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Present
                    </span>
                    <span className="font-medium">{attendance.present} days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" /> Absent
                    </span>
                    <span className="font-medium">{attendance.absent} days</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${attendance.percentage >= 80 ? 'bg-primary' : attendance.percentage >= 60 ? 'bg-yellow-500' : 'bg-destructive'}`}
                      style={{ width: `${attendance.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {attendance.percentage}% attendance rate ({attendance.total} days recorded)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Exams */}
        {recentExams.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                Recent Exam Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {recentExams.map((exam) => (
                  <div 
                    key={exam.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/student/performance?examId=${exam.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{exam.name}</p>
                      <p className="text-xs text-muted-foreground">Click to view details</p>
                    </div>
                    <Badge 
                      variant={exam.average >= 70 ? "default" : exam.average >= 50 ? "secondary" : "destructive"}
                      className="shrink-0 ml-2"
                    >
                      {exam.average}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Upcoming Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingExams.map((exam) => {
                  const startDate = new Date(exam.startDate);
                  const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{exam.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {startDate.toLocaleDateString()} – {new Date(exam.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={daysUntil <= 7 ? "destructive" : "secondary"} className="shrink-0 ml-2">
                        {daysUntil <= 0 ? "Ongoing" : `${daysUntil} days`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Class Timetable */}
        <ClassTimetable
          streamId={studentInfo.stream_id}
          gradeId={studentInfo.grade_id}
          gradeName={studentInfo.grade?.name || ''}
          streamName={studentInfo.stream?.name || ''}
        />
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
