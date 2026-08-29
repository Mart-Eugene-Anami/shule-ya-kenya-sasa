import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentInfo {
  id: string;
  name: string;
  admissionNo: string;
  gradeName: string;
  streamName: string;
  curriculum: string;
  pathway: string | null;
}

interface Subject {
  name: string;
  teacher: string | null;
}

const StudentSubjects = () => {
  const { user } = useAuth();
  const { terminology } = useCurriculumTerminology();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classmates, setClassmates] = useState<number>(0);

  useEffect(() => {
    if (user?.id) {
      fetchStudentInfo();
    }
  }, [user?.id]);

  const fetchStudentInfo = async () => {
    try {
      // Get student details
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          name,
          admission_no,
          grade_id,
          stream_id,
          pathway,
          grades!students_grade_id_fkey(name, curriculum, school_id),
          streams!students_stream_id_fkey(name)
        `)
        .eq('user_id', user?.id)
        .single();

      if (!student) {
        setLoading(false);
        return;
      }

      setStudentInfo({
        id: student.id,
        name: student.name,
        admissionNo: student.admission_no,
        gradeName: (student.grades as any)?.name || '',
        streamName: (student.streams as any)?.name || '',
        curriculum: (student.grades as any)?.curriculum || '',
        pathway: student.pathway
      });

      const schoolId = (student.grades as any)?.school_id;

      // Get grade_stream_id for this student's grade and stream combination
      const { data: gradeStream } = await supabase
        .from('grade_streams')
        .select('id')
        .eq('grade_id', student.grade_id)
        .eq('stream_id', student.stream_id)
        .single();

      if (gradeStream) {
        // Fetch subjects with assigned teachers
        const { data: assignments } = await supabase
          .from('teacher_subject_assignments')
          .select(`
            subject,
            teachers!teacher_subject_assignments_teacher_id_fkey(name)
          `)
          .eq('grade_stream_id', gradeStream.id);

        if (assignments) {
          const subjectList: Subject[] = assignments.map((a: any) => ({
            name: a.subject,
            teacher: a.teachers?.name || null
          }));
          setSubjects(subjectList);
        }
      }

      // If no assignments found, fetch subjects from school's subject list
      if (subjects.length === 0 && schoolId) {
        const { data: schoolSubjects } = await supabase
          .from('subjects')
          .select('name')
          .eq('school_id', schoolId)
          .eq('curriculum', (student.grades as any)?.curriculum)
          .eq('is_active', true);

        if (schoolSubjects) {
          const uniqueNames = [...new Set(schoolSubjects.map(s => s.name))];
          setSubjects(uniqueNames.map(name => ({ name, teacher: null })));
        }
      }

      // Count classmates in the same stream
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', student.stream_id)
        .eq('grade_id', student.grade_id);

      setClassmates(count || 0);

    } catch (error) {
      console.error("Error fetching student info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Subjects">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!studentInfo) {
    return (
      <DashboardLayout title="My Subjects">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">No student record found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Subjects">
      <div className="space-y-6">
        {/* Student Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{terminology.gradeSingular}</p>
                <p className="text-lg font-medium">{studentInfo.gradeName}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Stream</p>
                <p className="text-lg font-medium">{studentInfo.streamName}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Curriculum</p>
                <p className="text-lg font-medium">{studentInfo.curriculum.toUpperCase()}</p>
              </div>
              {studentInfo.pathway && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Pathway</p>
                  <p className="text-lg font-medium">{studentInfo.pathway}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Class Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">{subjects.length}</h3>
                  <p className="text-sm text-muted-foreground">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">{classmates}</h3>
                  <p className="text-sm text-muted-foreground">Classmates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-green-100">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">
                    {studentInfo.gradeName} {studentInfo.streamName}
                  </h3>
                  <p className="text-sm text-muted-foreground">Class</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subjects Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No subjects assigned yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        {subject.teacher ? (
                          subject.teacher
                        ) : (
                          <Badge variant="outline">Not assigned</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentSubjects;
