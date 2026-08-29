import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { GraduationCap, Users, Mail, BookOpen, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Teacher } from "@/types";

interface GradeStreamWithTeacher {
  id: string;
  gradeId: string;
  gradeName: string;
  streamId: string;
  streamName: string;
  teacherId: string | null;
  teacher: Teacher | null;
}

interface StreamTeachersOverviewProps {
  teachers: Teacher[];
}

export function StreamTeachersOverview({ teachers }: StreamTeachersOverviewProps) {
  const { user } = useAuth();
  const [gradeStreamsWithTeachers, setGradeStreamsWithTeachers] = useState<GradeStreamWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.schoolId) return;

      try {
        setLoading(true);

        // Fetch grade-stream combinations with their assigned teachers
        const { data: gsData } = await supabase
          .from('grade_streams')
          .select(`
            id,
            grade_id,
            stream_id,
            teacher_id,
            grades!inner(id, name, school_id),
            streams!inner(id, name),
            teachers(id, name, email, subject, subjects_taught, is_stream_teacher)
          `)
          .eq('grades.school_id', user.schoolId);

        if (gsData) {
          const formatted = gsData.map((gs: any) => ({
            id: gs.id,
            gradeId: gs.grade_id,
            gradeName: gs.grades?.name || 'Unknown',
            streamId: gs.stream_id,
            streamName: gs.streams?.name || 'Unknown',
            teacherId: gs.teacher_id,
            teacher: gs.teachers ? {
              id: gs.teachers.id,
              name: gs.teachers.name,
              email: gs.teachers.email,
              subject: gs.teachers.subject,
              subjectsTaught: gs.teachers.subjects_taught,
              isStreamTeacher: gs.teachers.is_stream_teacher
            } as Teacher : null
          }));
          setGradeStreamsWithTeachers(formatted);
        }
      } catch (error) {
        console.error('Error fetching stream teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.schoolId]);

  // Stats
  const streamTeachers = teachers.filter(t => t.isStreamTeacher);
  const totalClasses = gradeStreamsWithTeachers.length;
  const classesWithTeacher = gradeStreamsWithTeachers.filter(gs => gs.teacher).length;
  const classesWithoutTeacher = totalClasses - classesWithTeacher;

  // Sort by grade and stream name
  const sortedGradeStreams = useMemo(() => {
    return [...gradeStreamsWithTeachers].sort((a, b) => 
      a.gradeName.localeCompare(b.gradeName) || 
      a.streamName.localeCompare(b.streamName)
    );
  }, [gradeStreamsWithTeachers]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <GraduationCap className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stream Teachers</p>
                <p className="text-xl font-bold">{streamTeachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Classes</p>
                <p className="text-xl font-bold">{totalClasses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <GraduationCap className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned</p>
                <p className="text-xl font-bold">{classesWithTeacher}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unassigned</p>
                <p className="text-xl font-bold text-amber-600">{classesWithoutTeacher}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stream Teachers Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Class Teachers (Stream Teachers)</CardTitle>
          <CardDescription>Teachers responsible for managing each class/stream</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Class</TableHead>
                  <TableHead>Stream Teacher</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subjects Taught</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGradeStreams.map((gs) => (
                  <TableRow key={gs.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {gs.gradeName} {gs.streamName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {gs.teacher ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                              {getInitials(gs.teacher.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{gs.teacher.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          No teacher assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gs.teacher ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {gs.teacher.email}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {gs.teacher ? (
                        <div className="flex flex-wrap gap-1">
                          {(gs.teacher.subjectsTaught && gs.teacher.subjectsTaught.length > 0) ? (
                            gs.teacher.subjectsTaught.slice(0, 3).map((subj, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{subj}</Badge>
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-xs">{gs.teacher.subject}</Badge>
                          )}
                          {gs.teacher.subjectsTaught && gs.teacher.subjectsTaught.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{gs.teacher.subjectsTaught.length - 3}</Badge>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {sortedGradeStreams.map((gs) => (
              <Card key={gs.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-medium">
                    {gs.gradeName} {gs.streamName}
                  </Badge>
                </div>
                {gs.teacher ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                          {getInitials(gs.teacher.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{gs.teacher.name}</p>
                        <p className="text-xs text-muted-foreground">{gs.teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(gs.teacher.subjectsTaught && gs.teacher.subjectsTaught.length > 0) ? (
                        gs.teacher.subjectsTaught.slice(0, 2).map((subj, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{subj}</Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-xs">{gs.teacher.subject}</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    No stream teacher assigned
                  </p>
                )}
              </Card>
            ))}
          </div>

          {sortedGradeStreams.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No classes found. Set up grades and streams first.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Stream Teachers */}
      {streamTeachers.filter(t => !gradeStreamsWithTeachers.some(gs => gs.teacherId === t.id)).length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800">Unassigned Stream Teachers</CardTitle>
            <CardDescription className="text-amber-700">
              Teachers marked as stream teachers but not assigned to any class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {streamTeachers
                .filter(t => !gradeStreamsWithTeachers.some(gs => gs.teacherId === t.id))
                .map(teacher => (
                  <Badge key={teacher.id} variant="outline" className="bg-white">
                    {teacher.name}
                  </Badge>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
