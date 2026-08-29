import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  TrendingUp,
  Clock,
  Calendar,
  BarChart3,
  GraduationCap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";
import { ClassStudentsList } from "@/components/teacher/ClassStudentsList";
import { ClassSubjectTeachers } from "@/components/teacher/ClassSubjectTeachers";
import { ClassTimetable } from "@/components/teacher/ClassTimetable";
import { TeacherTimetable } from "@/components/teacher/TeacherTimetable";
import { TeacherClassAnalytics } from "@/components/teacher/TeacherClassAnalytics";
import { TeacherSubjectAnalytics } from "@/components/teacher/TeacherSubjectAnalytics";

interface TeacherInfo {
  id: string;
  name: string;
  email: string;
  subject: string;
  school_id: string;
  is_stream_teacher: boolean | null;
  subjects_taught: string[] | null;
}

interface StreamAssignment {
  streamId: string;
  streamName: string;
  gradeId: string;
  gradeName: string;
  subject: string;
  lessonsPerWeek: number | null;
}

interface ClassInfo {
  streamId: string;
  streamName: string;
  gradeId: string;
  gradeName: string;
}

interface UpcomingExam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  subjects: string[];
}

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { terminology } = useCurriculumTerminology();
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [streamAssignments, setStreamAssignments] = useState<StreamAssignment[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchTeacherData();
    }
  }, [user?.id]);

  const fetchTeacherData = async () => {
    try {
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          name,
          email,
          subject,
          school_id,
          is_stream_teacher,
          subjects_taught
        `)
        .eq('user_id', user?.id)
        .single();

      if (teacherError) {
        console.error("Error fetching teacher:", teacherError);
        setLoading(false);
        return;
      }

      setTeacherInfo(teacher as TeacherInfo);

      if (teacher?.id) {
        const { data: gradeStreamAssignment } = await supabase
          .from('grade_streams')
          .select(`
            grade_id,
            stream_id,
            grades!grade_streams_grade_id_fkey(id, name),
            streams!grade_streams_stream_id_fkey(id, name)
          `)
          .eq('teacher_id', teacher.id)
          .maybeSingle();

        if (gradeStreamAssignment) {
          const gs = gradeStreamAssignment as any;
          setClassInfo({
            streamId: gs.stream_id,
            streamName: gs.streams?.name || 'Unknown',
            gradeId: gs.grade_id,
            gradeName: gs.grades?.name || 'Unknown'
          });

          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('stream_id', gs.stream_id)
            .eq('grade_id', gs.grade_id);
          setStudentCount(count || 0);
        }

        const { data: assignments } = await supabase
          .from('teacher_subject_assignments')
          .select(`
            subject,
            grade_stream_id,
            grade_streams!teacher_subject_assignments_grade_stream_id_fkey(
              grade_id,
              stream_id,
              grades!grade_streams_grade_id_fkey(id, name),
              streams!grade_streams_stream_id_fkey(id, name)
            )
          `)
          .eq('teacher_id', teacher.id);

        // Fetch subject lesson configs for this school
        const { data: subjectConfigs } = await supabase
          .from('subjects')
          .select('name, max_lessons_per_week')
          .eq('school_id', teacher.school_id)
          .eq('is_active', true);

        const lessonMap = new Map<string, number>();
        subjectConfigs?.forEach((s: any) => {
          if (s.max_lessons_per_week) lessonMap.set(s.name, s.max_lessons_per_week);
        });

        if (assignments) {
          const processedAssignments: StreamAssignment[] = assignments.map((a: any) => {
            const gs = a.grade_streams;
            return {
              streamId: gs?.stream_id || '',
              streamName: gs?.streams?.name || 'Unknown',
              gradeId: gs?.grade_id || '',
              gradeName: gs?.grades?.name || 'Unknown',
              subject: a.subject,
              lessonsPerWeek: lessonMap.get(a.subject) || null
            };
          }).filter(a => a.streamId && a.gradeId);

          setStreamAssignments(processedAssignments);
        }

        // Fetch upcoming exams
        const today = new Date().toISOString().split('T')[0];
        const { data: examsData } = await supabase
          .from('exams')
          .select('id, name, start_date, end_date, subjects')
          .eq('school_id', teacher.school_id)
          .gte('end_date', today)
          .order('start_date', { ascending: true })
          .limit(5);

        if (examsData) {
          setUpcomingExams(examsData.map((e: any) => ({
            id: e.id,
            name: e.name,
            startDate: e.start_date,
            endDate: e.end_date,
            subjects: e.subjects || []
          })));
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isClassTeacher = !!classInfo;
  const isSubjectTeacher = streamAssignments.length > 0;

  if (loading) {
    return (
      <DashboardLayout title="Teacher Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Welcome, {teacherInfo?.name || user?.name || 'Teacher'}!
          </h1>
          <div className="flex flex-wrap gap-2">
            {isClassTeacher && (
              <Badge variant="default" className="gap-1 text-xs sm:text-sm">
                <GraduationCap className="h-3 w-3" />
                Class Teacher - {classInfo?.gradeName} {classInfo?.streamName}
              </Badge>
            )}
            {isSubjectTeacher && (
              <Badge variant="secondary" className="gap-1 text-xs sm:text-sm">
                <BookOpen className="h-3 w-3" />
                Subject Teacher
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats - Compact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isClassTeacher && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">{studentCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">
                    {[...new Set(streamAssignments.map(a => a.subject))].length || teacherInfo?.subjects_taught?.length || (teacherInfo?.subject ? 1 : 0)}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{streamAssignments.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">
                    {streamAssignments.reduce((sum, a) => sum + (a.lessonsPerWeek || 5), 0)}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Lessons/wk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/marklists')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium">Marklists</p>
                  <p className="text-xs text-muted-foreground">View →</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Subjects - Derived from actual assignments */}
        {(() => {
          const assignedSubjects = [...new Set(streamAssignments.map(a => a.subject))].sort();
          const fallbackSubjects = teacherInfo?.subjects_taught?.length 
            ? teacherInfo.subjects_taught 
            : teacherInfo?.subject ? [teacherInfo.subject] : [];
          const displaySubjects = assignedSubjects.length > 0 ? assignedSubjects : fallbackSubjects;
          
          return displaySubjects.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">My Subjects:</span>
              {displaySubjects.map((subject, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {subject}
                </Badge>
              ))}
            </div>
          ) : null;
        })()}

        {/* Main Tabs */}
        <Tabs defaultValue={isClassTeacher ? "class" : "subjects"} className="space-y-4">
          <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
            {isClassTeacher && (
              <TabsTrigger value="class" className="flex-1 min-w-0 gap-1 sm:gap-2 text-xs sm:text-sm">
                <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">My Class</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="subjects" className="flex-1 min-w-0 gap-1 sm:gap-2 text-xs sm:text-sm">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1 min-w-0 gap-1 sm:gap-2 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 min-w-0 gap-1 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Class Teacher Tab */}
          {isClassTeacher && classInfo && teacherInfo && (
            <TabsContent value="class" className="space-y-4 sm:space-y-6 mt-4">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/marklists?streamId=${classInfo.streamId}&gradeId=${classInfo.gradeId}`)}
                >
                  Class Marklists
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/attendance`)}
                >
                  Attendance
                </Button>
              </div>

              <ClassStudentsList
                streamId={classInfo.streamId}
                gradeId={classInfo.gradeId}
                gradeName={classInfo.gradeName}
                streamName={classInfo.streamName}
              />

              <ClassTimetable
                streamId={classInfo.streamId}
                gradeId={classInfo.gradeId}
                gradeName={classInfo.gradeName}
                streamName={classInfo.streamName}
              />

              <ClassSubjectTeachers
                streamId={classInfo.streamId}
                gradeId={classInfo.gradeId}
                gradeName={classInfo.gradeName}
                streamName={classInfo.streamName}
                schoolId={teacherInfo.school_id}
              />
            </TabsContent>
          )}

          {/* Subject Teacher Tab */}
          <TabsContent value="subjects" className="space-y-4 sm:space-y-6 mt-4">
            {streamAssignments.length > 0 ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {streamAssignments.map((assignment, index) => (
                  <Card 
                    key={`${assignment.streamId}-${assignment.subject}-${index}`} 
                    className="hover:shadow-md transition-shadow border-l-4 border-l-primary/50"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {assignment.gradeName} {assignment.streamName}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">
                          {assignment.subject}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <Clock className="h-3 w-3" />
                        <span>{assignment.lessonsPerWeek || 5} lessons/week</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full text-xs sm:text-sm"
                        onClick={() => navigate(`/marklists?streamId=${assignment.streamId}&gradeId=${assignment.gradeId}`)}
                      >
                        View Marklist
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No subject assignments yet.</p>
                  <p className="text-xs sm:text-sm">Contact your administrator to get assigned to classes.</p>
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
                      const teacherSubjects = [...new Set(streamAssignments.map(a => a.subject))];
                      const relevantSubjects = exam.subjects.filter(s => teacherSubjects.includes(s));
                      return (
                        <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{exam.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(exam.startDate).toLocaleDateString()} – {new Date(exam.endDate).toLocaleDateString()}
                            </p>
                            {relevantSubjects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {relevantSubjects.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-4">
            {teacherInfo && (
              <TeacherTimetable
                teacherId={teacherInfo.id}
                schoolId={teacherInfo.school_id}
              />
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 sm:space-y-6 mt-4">
            {isClassTeacher && classInfo && teacherInfo && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-medium border-b pb-2">Class Analytics</h3>
                <TeacherClassAnalytics
                  streamId={classInfo.streamId}
                  gradeId={classInfo.gradeId}
                  gradeName={classInfo.gradeName}
                  streamName={classInfo.streamName}
                  schoolId={teacherInfo.school_id}
                />
              </div>
            )}

            {isSubjectTeacher && teacherInfo && (
              <div className="space-y-4">
                {isClassTeacher && <h3 className="text-base sm:text-lg font-medium border-b pb-2 mt-6 sm:mt-8">Subject Analytics</h3>}
                <TeacherSubjectAnalytics
                  teacherId={teacherInfo.id}
                  schoolId={teacherInfo.school_id}
                  assignments={streamAssignments}
                />
              </div>
            )}

            {!isClassTeacher && !isSubjectTeacher && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No analytics available yet.</p>
                  <p className="text-xs sm:text-sm">Analytics will appear once you have teaching assignments.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
