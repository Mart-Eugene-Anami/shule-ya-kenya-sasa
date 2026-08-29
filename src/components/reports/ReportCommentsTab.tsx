import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReportCommentEntry } from "./ReportCommentEntry";
import { BulkAutoCommentPanel } from "./BulkAutoCommentPanel";
import type { CommentType } from "@/services/reportCommentService";

interface ReportCommentsTabProps {
  grades: Array<{ id: string; name: string }>;
  streams: Array<{ id: string; name: string }>;
  exams: Array<{ id: string; name: string }>;
  schoolId: string;
}

interface StudentItem {
  id: string;
  name: string;
  admission_no: string;
}

export function ReportCommentsTab({ grades, streams, exams, schoolId }: ReportCommentsTabProps) {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("class_teacher");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<Array<{ id: string; name: string }>>([]);
  const [examSubjects, setExamSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    if (selectedGrade) {
      loadStreamsForGrade();
    }
  }, [selectedGrade]);

  useEffect(() => {
    if (selectedStream && selectedExam) {
      loadStudents();
    }
  }, [selectedStream, selectedExam]);

  useEffect(() => {
    if (selectedExam) {
      loadExamSubjects();
    }
  }, [selectedExam]);

  const loadStreamsForGrade = async () => {
    const { data: gradeStreams } = await supabase
      .from("grade_streams")
      .select("stream_id, streams!grade_streams_stream_id_fkey(id, name)")
      .eq("grade_id", selectedGrade);

    if (gradeStreams) {
      const s = gradeStreams
        .map((gs: any) => gs.streams)
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setFilteredStreams(s);
    }
  };

  const loadStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name, admission_no")
      .eq("stream_id", selectedStream)
      .eq("grade_id", selectedGrade)
      .order("name");

    setStudents((data as StudentItem[]) || []);
  };

  const loadExamSubjects = async () => {
    const { data } = await supabase
      .from("exams")
      .select("subjects")
      .eq("id", selectedExam)
      .single();

    setExamSubjects(data?.subjects || []);
  };

  const canShowComments = selectedStudent && selectedExam;
  const canShowBulk = selectedExam && selectedGrade && selectedStream;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Report Card Comments
        </CardTitle>
        <CardDescription>
          Add subject teacher, class teacher, or head teacher comments to student report cards. 
          Use auto-apply to assign grade-based comments in bulk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam..." />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStream(""); setSelectedStudent(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade..." />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStream} onValueChange={(v) => { setSelectedStream(v); setSelectedStudent(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select stream..." />
            </SelectTrigger>
            <SelectContent>
              {filteredStreams.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Select student (optional)..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.admission_no} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canShowBulk ? (
          <div className="space-y-4">
            <Tabs value={commentType} onValueChange={(v) => setCommentType(v as CommentType)}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="subject_teacher">Subject Teacher</TabsTrigger>
                <TabsTrigger value="class_teacher">Class Teacher</TabsTrigger>
                <TabsTrigger value="head_teacher">Head Teacher</TabsTrigger>
              </TabsList>

              <TabsContent value="subject_teacher" className="space-y-3 mt-3">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {examSubjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedSubject && (
                  <BulkAutoCommentPanel
                    examId={selectedExam}
                    gradeId={selectedGrade}
                    streamId={selectedStream}
                    subject={selectedSubject}
                    schoolId={schoolId}
                  />
                )}

                {selectedSubject && selectedStudent && (
                  <ReportCommentEntry
                    key={`${selectedStudent}-${selectedExam}-subject-${selectedSubject}`}
                    studentId={selectedStudent}
                    examId={selectedExam}
                    commentType="subject_teacher"
                    subject={selectedSubject}
                  />
                )}
              </TabsContent>

              <TabsContent value="class_teacher" className="mt-3">
                {selectedStudent ? (
                  <ReportCommentEntry
                    key={`${selectedStudent}-${selectedExam}-class`}
                    studentId={selectedStudent}
                    examId={selectedExam}
                    commentType="class_teacher"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a student to add a class teacher comment.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="head_teacher" className="mt-3">
                {selectedStudent ? (
                  <ReportCommentEntry
                    key={`${selectedStudent}-${selectedExam}-head`}
                    studentId={selectedStudent}
                    examId={selectedExam}
                    commentType="head_teacher"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a student to add a head teacher comment.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Select an exam, grade, and stream to manage comments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
