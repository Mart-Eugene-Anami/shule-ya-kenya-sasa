import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Save, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface GradeStream {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  subjectsTaught?: string[];
}

interface TeacherAssignment {
  id: string;
  teacherId: string;
  gradeStreamId: string;
  subject: string;
  teacherName: string;
  gradeName: string;
  streamName: string;
}

interface SubjectRecord {
  id: string;
  name: string;
  curriculum: string;
  division_id: string | null;
}

interface TeacherSubjectAssignmentProps {
  gradeStreams: GradeStream[];
  teachers: Teacher[];
  allSubjects: SubjectRecord[];
  gradeDivisionMap: Record<string, string | null>;
  academicYearId: string;
  assignments: TeacherAssignment[];
  onAddAssignment: (assignment: {
    teacherId: string;
    gradeStreamId: string;
    subject: string;
    academicYearId: string;
  }) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onRefreshAssignments?: () => Promise<void> | void;
  onReplaceAssignmentsBatch?: (
    gradeStreamId: string,
    assignments: Array<{ subject: string; teacherId: string }>
  ) => Promise<void>;
}

export const TeacherSubjectAssignment: React.FC<TeacherSubjectAssignmentProps> = ({
  gradeStreams,
  teachers,
  allSubjects,
  gradeDivisionMap,
  academicYearId,
  assignments,
  onAddAssignment,
  onDeleteAssignment,
  onRefreshAssignments,
  onReplaceAssignmentsBatch,
}) => {
  const { toast } = useToast();
  const [selectedGradeStreamId, setSelectedGradeStreamId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Strictly filter subjects by the selected grade's division (no cross-division fallback)
  const { subjects, hasDivisionMapping } = useMemo(() => {
    if (!selectedGradeStreamId) return { subjects: [] as string[], hasDivisionMapping: false };

    const gs = gradeStreams.find((g) => g.id === selectedGradeStreamId);
    if (!gs) return { subjects: [] as string[], hasDivisionMapping: false };

    const divisionId = gradeDivisionMap[gs.gradeId];
    if (!divisionId) {
      return { subjects: [] as string[], hasDivisionMapping: false };
    }

    const filtered = allSubjects.filter((s) => s.division_id === divisionId);
    return {
      subjects: [...new Set(filtered.map((s) => s.name))].sort(),
      hasDivisionMapping: true,
    };
  }, [selectedGradeStreamId, gradeStreams, gradeDivisionMap, allSubjects]);

  // Track pending teacher selections per subject: { [subject]: teacherId }
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});

  // Existing assignments for the selected stream
  const streamAssignments = useMemo(() => {
    return assignments.filter((a) => a.gradeStreamId === selectedGradeStreamId);
  }, [assignments, selectedGradeStreamId]);

  // Build a map of subject -> existing assignment for this stream
  const existingBySubject = useMemo(() => {
    const map: Record<string, TeacherAssignment> = {};
    for (const a of streamAssignments) {
      map[a.subject] = a;
    }
    return map;
  }, [streamAssignments]);

  // When stream changes, reset pending and pre-fill from existing
  const handleStreamChange = (gsId: string) => {
    setSelectedGradeStreamId(gsId);
    setPendingAssignments({});
  };

  // Get teachers who can teach a given subject
  const getTeachersForSubject = (subject: string): Teacher[] => {
    return teachers.filter((t) => {
      if (t.subjectsTaught && t.subjectsTaught.length > 0) {
        return t.subjectsTaught.includes(subject);
      }
      return t.subject === subject;
    });
  };

  const handleTeacherSelect = (subject: string, teacherId: string) => {
    setPendingAssignments((prev) => {
      if (teacherId === "__none__") {
        const next = { ...prev };
        delete next[subject];
        return next;
      }
      return { ...prev, [subject]: teacherId };
    });
  };

  const handleSaveAll = async () => {
    const toCreate = Object.entries(pendingAssignments).filter(
      ([subject, teacherId]) => {
        const existing = existingBySubject[subject];
        // Only create if no existing assignment or different teacher
        return !existing || existing.teacherId !== teacherId;
      }
    );

    if (toCreate.length === 0) {
      toast({
        title: "No Changes",
        description: "No new assignments to save.",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (onReplaceAssignmentsBatch) {
        await onReplaceAssignmentsBatch(
          selectedGradeStreamId,
          toCreate.map(([subject, teacherId]) => ({ subject, teacherId }))
        );
      } else {
        // Fallback path
        const deletions = toCreate
          .map(([subject]) => existingBySubject[subject]?.id)
          .filter((id): id is string => Boolean(id))
          .map((id) => onDeleteAssignment(id));

        await Promise.all(deletions);

        await Promise.all(
          toCreate.map(([subject, teacherId]) =>
            onAddAssignment({
              teacherId,
              gradeStreamId: selectedGradeStreamId,
              subject,
              academicYearId,
            })
          )
        );
      }

      setPendingAssignments({});
      toast({
        title: "Assignments Saved",
        description: `${toCreate.length} teacher assignment(s) saved successfully.`,
      });

      // Keep refresh non-blocking so the save button never appears frozen.
      void onRefreshAssignments?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save some assignments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExisting = async (id: string) => {
    try {
      await onDeleteAssignment(id);
      await onRefreshAssignments?.();
      toast({
        title: "Removed",
        description: "Assignment removed successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove assignment.",
        variant: "destructive",
      });
    }
  };

  const selectedGs = gradeStreams.find((gs) => gs.id === selectedGradeStreamId);

  // Count how many new/changed assignments are pending
  const pendingCount = Object.entries(pendingAssignments).filter(
    ([subject, teacherId]) => {
      const existing = existingBySubject[subject];
      return !existing || existing.teacherId !== teacherId;
    }
  ).length;

  return (
    <div className="space-y-6">
      {/* Stream Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Teachers to Subjects</CardTitle>
          <CardDescription>
            Select a class (grade-stream), then assign a teacher to each subject. Save all at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <label className="text-sm font-medium mb-2 block">Select Class</label>
            <Select value={selectedGradeStreamId} onValueChange={handleStreamChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a grade-stream..." />
              </SelectTrigger>
              <SelectContent>
                {gradeStreams.map((gs) => (
                  <SelectItem key={gs.id} value={gs.id}>
                    {gs.gradeName} - {gs.streamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subject-Teacher Grid */}
      {selectedGradeStreamId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {selectedGs?.gradeName} - {selectedGs?.streamName}
                </CardTitle>
                <CardDescription>
                  Assign a teacher to each subject below, then save all changes.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveAll}
                disabled={isSaving || pendingCount === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save {pendingCount > 0 ? `(${pendingCount})` : ""}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {hasDivisionMapping
                  ? "No subjects found for this division. Define subjects in Subject Management for this division."
                  : "This grade is not mapped to any division yet. Map the grade to a division in Academic Setup/Grades first."}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Subject</TableHead>
                        <TableHead>Current Teacher</TableHead>
                        <TableHead>Assign Teacher</TableHead>
                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => {
                        const existing = existingBySubject[subject];
                        const pending = pendingAssignments[subject];
                        const availableTeachers = getTeachersForSubject(subject);
                        const isChanged = pending && (!existing || existing.teacherId !== pending);

                        return (
                          <TableRow key={subject}>
                            <TableCell className="font-medium">{subject}</TableCell>
                            <TableCell>
                              {existing ? (
                                <Badge variant="secondary">{existing.teacherName}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={pending || (existing?.teacherId) || "__none__"}
                                onValueChange={(val) => handleTeacherSelect(subject, val)}
                              >
                                <SelectTrigger className={isChanged ? "border-primary ring-1 ring-primary" : ""}>
                                  <SelectValue placeholder="Select teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— No teacher —</SelectItem>
                                  {availableTeachers.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                  {availableTeachers.length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      No teachers available for this subject
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              {existing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExisting(existing.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {subjects.map((subject) => {
                    const existing = existingBySubject[subject];
                    const pending = pendingAssignments[subject];
                    const availableTeachers = getTeachersForSubject(subject);
                    const isChanged = pending && (!existing || existing.teacherId !== pending);

                    return (
                      <Card key={subject} className={`p-3 ${isChanged ? "border-primary" : ""}`}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{subject}</span>
                            {existing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleDeleteExisting(existing.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                          {existing && (
                            <div className="text-xs text-muted-foreground">
                              Current: <Badge variant="secondary" className="text-xs ml-1">{existing.teacherName}</Badge>
                            </div>
                          )}
                          <Select
                            value={pending || (existing?.teacherId) || "__none__"}
                            onValueChange={(val) => handleTeacherSelect(subject, val)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— No teacher —</SelectItem>
                              {availableTeachers.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Assignments Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Current Assignments</CardTitle>
          <CardDescription>Overview of all teacher-subject assignments across all classes.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No teacher assignments yet. Select a class above and assign teachers.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {assignment.gradeName} - {assignment.streamName}
                    </TableCell>
                    <TableCell>{assignment.subject}</TableCell>
                    <TableCell>{assignment.teacherName}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExisting(assignment.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
