import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { BookOpen, Users, GraduationCap, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Teacher } from "@/types";
import { getTeacherAssignments, TeacherAssignment } from "@/services/teacherAssignmentService";

interface GradeStream {
  id: string;
  gradeId: string;
  gradeName: string;
  streamId: string;
  streamName: string;
}

interface TeacherClassAllocationsProps {
  teachers: Teacher[];
}

export function TeacherClassAllocations({ teachers }: TeacherClassAllocationsProps) {
  const { user } = useAuth();
  const [gradeStreams, setGradeStreams] = useState<GradeStream[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.schoolId) return;

      try {
        setLoading(true);

        // Fetch grade-stream combinations
        const { data: gsData } = await supabase
          .from('grade_streams')
          .select(`
            id,
            grade_id,
            stream_id,
            grades!inner(id, name, school_id),
            streams!inner(id, name)
          `)
          .eq('grades.school_id', user.schoolId);

        if (gsData) {
          const formatted = gsData.map((gs: any) => ({
            id: gs.id,
            gradeId: gs.grade_id,
            gradeName: gs.grades?.name || 'Unknown',
            streamId: gs.stream_id,
            streamName: gs.streams?.name || 'Unknown'
          }));
          setGradeStreams(formatted);
        }

        // Fetch active academic year
        const { data: yearData } = await supabase
          .from('academic_years')
          .select('id')
          .eq('school_id', user.schoolId)
          .eq('is_active', true)
          .maybeSingle();

        if (yearData) {
          const assignmentsData = await getTeacherAssignments(user.schoolId, yearData.id);
          setAssignments(assignmentsData);
        }
      } catch (error) {
        console.error('Error fetching class allocations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.schoolId]);

  // Get unique grades for filter
  const uniqueGrades = useMemo(() => {
    const grades = new Map<string, string>();
    gradeStreams.forEach(gs => {
      if (!grades.has(gs.gradeId)) {
        grades.set(gs.gradeId, gs.gradeName);
      }
    });
    return Array.from(grades.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [gradeStreams]);

  // Filter grade streams by selected grade
  const filteredGradeStreams = useMemo(() => {
    if (selectedGrade === "all") return gradeStreams;
    return gradeStreams.filter(gs => gs.gradeId === selectedGrade);
  }, [gradeStreams, selectedGrade]);

  // Group assignments by grade-stream
  const allocationsByClass = useMemo(() => {
    const grouped = new Map<string, { 
      gradeStream: GradeStream;
      subjectAssignments: { subject: string; teacher: string; teacherId: string }[];
    }>();

    filteredGradeStreams.forEach(gs => {
      const classAssignments = assignments
        .filter(a => a.gradeStreamId === gs.id)
        .map(a => ({
          subject: a.subject,
          teacher: a.teacherName,
          teacherId: a.teacherId
        }));

      grouped.set(gs.id, {
        gradeStream: gs,
        subjectAssignments: classAssignments
      });
    });

    return Array.from(grouped.values()).sort((a, b) => 
      a.gradeStream.gradeName.localeCompare(b.gradeStream.gradeName) ||
      a.gradeStream.streamName.localeCompare(b.gradeStream.streamName)
    );
  }, [filteredGradeStreams, assignments]);

  // Stats
  const totalClasses = gradeStreams.length;
  const classesWithAssignments = new Set(assignments.map(a => a.gradeStreamId)).size;
  const totalAssignments = assignments.length;

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
              <div className="rounded-full bg-blue-100 p-2">
                <GraduationCap className="h-4 w-4 text-blue-600" />
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
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Teachers</p>
                <p className="text-xl font-bold">{classesWithAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assignments</p>
                <p className="text-xl font-bold">{totalAssignments}</p>
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
                <p className="text-xl font-bold text-amber-600">{totalClasses - classesWithAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by Grade:</span>
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg">
            <SelectItem value="all">All Grades</SelectItem>
            {uniqueGrades.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Allocations Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Class-Subject Allocations</CardTitle>
          <CardDescription>Teachers assigned to teach subjects in each class</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Class</TableHead>
                  <TableHead>Subject Assignments</TableHead>
                  <TableHead className="w-24 text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocationsByClass.map(({ gradeStream, subjectAssignments }) => (
                  <TableRow key={gradeStream.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {gradeStream.gradeName} {gradeStream.streamName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {subjectAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subjectAssignments.map((sa, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {sa.subject}: {sa.teacher}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          No subject assignments
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={subjectAssignments.length > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                        {subjectAssignments.length}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {allocationsByClass.map(({ gradeStream, subjectAssignments }) => (
              <Card key={gradeStream.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-medium">
                    {gradeStream.gradeName} {gradeStream.streamName}
                  </Badge>
                  <Badge className={subjectAssignments.length > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                    {subjectAssignments.length} subjects
                  </Badge>
                </div>
                {subjectAssignments.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {subjectAssignments.map((sa, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {sa.subject}: {sa.teacher}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No assignments</p>
                )}
              </Card>
            ))}
          </div>

          {allocationsByClass.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No class allocations found. Set up grades and streams first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
