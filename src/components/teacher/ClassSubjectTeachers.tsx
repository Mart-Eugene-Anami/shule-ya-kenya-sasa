import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SubjectTeacher {
  subject: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
}

interface ClassSubjectTeachersProps {
  streamId: string;
  gradeId: string;
  gradeName: string;
  streamName: string;
  schoolId: string;
}

export function ClassSubjectTeachers({
  streamId,
  gradeId,
  gradeName,
  streamName,
  schoolId
}: ClassSubjectTeachersProps) {
  const [subjectTeachers, setSubjectTeachers] = useState<SubjectTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectTeachers();
  }, [streamId, gradeId]);

  const fetchSubjectTeachers = async () => {
    try {
      // First get the grade_stream_id
      const { data: gradeStream } = await supabase
        .from("grade_streams")
        .select("id")
        .eq("grade_id", gradeId)
        .eq("stream_id", streamId)
        .maybeSingle();

      if (!gradeStream) {
        setLoading(false);
        return;
      }

      // Get teacher assignments for this grade-stream
      const { data: assignments, error } = await supabase
        .from("teacher_subject_assignments")
        .select(`
          subject,
          teacher_id,
          teachers!teacher_subject_assignments_teacher_id_fkey(id, name, email)
        `)
        .eq("grade_stream_id", gradeStream.id);

      if (error) throw error;

      const teachers: SubjectTeacher[] = (assignments || []).map((a: any) => ({
        subject: a.subject,
        teacherId: a.teacher_id,
        teacherName: a.teachers?.name || "Unknown",
        teacherEmail: a.teachers?.email || ""
      }));

      // Sort by subject name
      teachers.sort((a, b) => a.subject.localeCompare(b.subject));
      setSubjectTeachers(teachers);
    } catch (error) {
      console.error("Error fetching subject teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Subject Teachers for {gradeName} {streamName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {subjectTeachers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No subject teachers assigned yet</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {subjectTeachers.map((st, index) => (
              <div
                key={`${st.teacherId}-${st.subject}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(st.teacherName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{st.teacherName}</p>
                  <p className="text-sm text-muted-foreground truncate">{st.teacherEmail}</p>
                </div>
                <Badge variant="outline">{st.subject}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
