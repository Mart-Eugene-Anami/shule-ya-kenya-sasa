import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Users, Loader2, Building2, Info, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDivisions } from "@/hooks/useDivisions";
import {
  getRoomsByGrade,
  getRoomTeacherAllocations,
  allocateTeacherToRoom,
  removeTeacherFromRoom,
} from "@/services/roomAllocationService";

interface RoomBasedAllocationProps {
  schoolId: string;
  academicYearId: string;
}

export const RoomBasedAllocation: React.FC<RoomBasedAllocationProps> = ({
  schoolId,
  academicYearId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { divisions, loading: divisionsLoading } = useDivisions();
  
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const isStandardCurriculum = selectedDivision?.curriculum !== "cbc-senior";

  // Fetch grades filtered by division
  const { data: grades = [] } = useQuery({
    queryKey: ["grades", schoolId, selectedDivisionId, selectedDivision?.curriculum],
    queryFn: async () => {
      if (selectedDivisionId && selectedDivision) {
        const { data: divisionGrades, error } = await supabase
          .from("grades")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .eq("division_id", selectedDivisionId)
          .order("level");

        if (!error && divisionGrades && divisionGrades.length > 0) {
          return divisionGrades;
        }

        const { data: curriculumGrades, error: currError } = await supabase
          .from("grades")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .eq("curriculum", selectedDivision.curriculum)
          .gte("level", selectedDivision.grade_level_start)
          .lte("level", selectedDivision.grade_level_end)
          .order("level");

        if (!currError) {
          return curriculumGrades || [];
        }
      }
      return [];
    },
    enabled: !!schoolId && !!selectedDivisionId,
  });

  // Fetch grade_streams for the selected grade (for standard curriculum view)
  const { data: gradeStreams = [] } = useQuery({
    queryKey: ["gradeStreamsForTeacherAlloc", selectedGradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_streams")
        .select("id, stream_id, streams!inner(id, name)")
        .eq("grade_id", selectedGradeId);
      
      if (error) throw error;
      return (data || []).map((gs: any) => ({
        id: gs.id,
        streamId: gs.stream_id,
        streamName: gs.streams?.name || "Unknown",
      }));
    },
    enabled: !!selectedGradeId && isStandardCurriculum,
  });

  // Fetch teacher-subject assignments from Teachers module for ALL streams in this grade (standard curriculum)
  const { data: allTeacherAssignments = [] } = useQuery({
    queryKey: ["allTeacherAssignmentsForGrade", selectedGradeId, academicYearId],
    queryFn: async () => {
      if (!gradeStreams.length) return [];

      const gradeStreamIds = gradeStreams.map((gs) => gs.id);
      const { data, error } = await supabase
        .from("teacher_subject_assignments")
        .select(`
          id,
          subject,
          teacher_id,
          grade_stream_id,
          teachers!inner(id, name)
        `)
        .in("grade_stream_id", gradeStreamIds)
        .eq("academic_year_id", academicYearId);

      if (error) throw error;

      return (data || []).map((a: any) => ({
        id: a.id,
        subject: a.subject,
        teacherId: a.teacher_id,
        teacherName: a.teachers?.name || "Unknown",
        gradeStreamId: a.grade_stream_id,
      }));
    },
    enabled: !!selectedGradeId && isStandardCurriculum && gradeStreams.length > 0,
  });

  // Fetch division subjects (standard curriculum)
  const { data: divisionSubjects = [] } = useQuery({
    queryKey: ["divisionSubjects", schoolId, selectedDivisionId],
    queryFn: async () => {
      if (!selectedDivisionId) return [];
      
      const { data: divSubjects, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .eq("division_id", selectedDivisionId)
        .order("subject_type")
        .order("name");

      if (!error && divSubjects && divSubjects.length > 0) {
        return divSubjects;
      }

      if (selectedDivision?.curriculum) {
        const { data: currSubjects, error: currError } = await supabase
          .from("subjects")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .eq("curriculum", selectedDivision.curriculum)
          .order("subject_type")
          .order("name");

        if (!currError) return currSubjects || [];
      }
      return [];
    },
    enabled: !!schoolId && !!selectedDivisionId,
  });

  // ===== CBE Senior: room-based allocation (existing flow) =====
  const { data: rooms = [] } = useQuery({
    queryKey: ["roomsByGrade", schoolId, selectedGradeId],
    queryFn: () => getRoomsByGrade(schoolId, selectedGradeId),
    enabled: !!schoolId && !!selectedGradeId && !isStandardCurriculum,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !isStandardCurriculum,
  });

  const { data: teacherAllocations = [] } = useQuery({
    queryKey: ["roomTeacherAllocations", selectedRoomId, academicYearId],
    queryFn: () => getRoomTeacherAllocations(selectedRoomId, academicYearId),
    enabled: !!selectedRoomId && !isStandardCurriculum,
  });

  // CBE Senior subject allocations for selected room
  const cbeSeniorSubjectAllocations = divisionSubjects.map((s: any) => ({
    id: s.id,
    subjectId: s.id,
    subjectName: s.name,
    isCore: s.subject_type === "core",
  }));

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // CBE Senior mutations
  const allocateTeacherMutation = useMutation({
    mutationFn: ({
      teacherId,
      subjectId,
      lessonsPerWeek,
    }: {
      teacherId: string;
      subjectId: string;
      lessonsPerWeek: number;
    }) => allocateTeacherToRoom(selectedRoomId, teacherId, subjectId, schoolId, lessonsPerWeek, academicYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTeacherAllocations", selectedRoomId] });
      toast({ title: "Teacher allocated", description: "Teacher has been assigned to this room." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (allocationId: string) => removeTeacherFromRoom(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTeacherAllocations", selectedRoomId] });
      toast({ title: "Teacher removed", description: "Teacher allocation has been removed." });
    },
  });

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setSelectedGradeId("");
    setSelectedRoomId("");
  };

  const handleGradeChange = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    setSelectedRoomId("");
  };

  // CBE Senior form state
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newLessonsPerWeek, setNewLessonsPerWeek] = useState(4);

  const handleAddTeacher = () => {
    if (!newTeacherId || !newSubjectId) {
      toast({ title: "Missing fields", description: "Select teacher and subject.", variant: "destructive" });
      return;
    }
    allocateTeacherMutation.mutate({
      teacherId: newTeacherId,
      subjectId: newSubjectId,
      lessonsPerWeek: newLessonsPerWeek,
    });
    setNewTeacherId("");
    setNewSubjectId("");
    setNewLessonsPerWeek(4);
  };

  const getCurriculumLabel = (curriculum: string) => {
    switch (curriculum) {
       case "cbc": return "CBE";
       case "cbc-senior": return "CBE Senior";
      case "8-4-4": return "8-4-4";
      default: return curriculum.toUpperCase();
    }
  };

  if (divisionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isStandardCurriculum ? "Teacher Assignments Overview" : "Room-Based Teacher Allocation"}
          </CardTitle>
          <CardDescription>
            {isStandardCurriculum
              ? "Teacher-subject assignments are managed in the Teachers module (Assign to Classes). The timetable generator uses these assignments directly."
              : "CBE Senior: Assign teachers to rooms for specific subjects. Teachers can teach across different divisions."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 ${isStandardCurriculum ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            <div>
              <label className="text-sm font-medium mb-2 block">School Division</label>
              <Select value={selectedDivisionId} onValueChange={handleDivisionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      <div className="flex items-center gap-2">
                        <span>{division.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getCurriculumLabel(division.curriculum)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Grade</label>
              <Select
                value={selectedGradeId}
                onValueChange={handleGradeChange}
                disabled={!selectedDivisionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDivisionId ? "Select grade" : "Select division first"} />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room selector only for CBE Senior */}
            {!isStandardCurriculum && (
              <div>
                <label className="text-sm font-medium mb-2 block">Room (Stream)</label>
                <Select
                  value={selectedRoomId}
                  onValueChange={setSelectedRoomId}
                  disabled={!selectedGradeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedGradeId ? "Select room" : "Select grade first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== STANDARD CURRICULUM: Read-only view from Teachers module ===== */}
      {selectedGradeId && isStandardCurriculum && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              For {getCurriculumLabel(selectedDivision?.curriculum || "")} schools, teacher assignments are managed in the{" "}
              <strong>Teachers → Assign to Classes</strong> tab. Since rooms map 1:1 with streams, the timetable
              generator automatically uses these assignments — no separate room allocation is needed.
            </AlertDescription>
          </Alert>

          {gradeStreams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No streams found for this grade. Set up streams in the Grades section first.
              </CardContent>
            </Card>
          ) : (
            gradeStreams.map((gs) => {
              const streamAssignments = allTeacherAssignments.filter(
                (a) => a.gradeStreamId === gs.id
              );
              const assignedSubjects = new Set(streamAssignments.map((a) => a.subject));
              const unassignedSubjects = divisionSubjects.filter(
                (s: any) => !assignedSubjects.has(s.name)
              );

              return (
                <Card key={gs.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {gs.streamName}
                      <Badge variant="secondary" className="text-xs">
                        {streamAssignments.length} / {divisionSubjects.length} subjects assigned
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {streamAssignments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Teacher</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {streamAssignments.map((a) => {
                            const subjectRecord = divisionSubjects.find((s: any) => s.name === a.subject);
                            return (
                              <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.subject}</TableCell>
                                <TableCell>
                                  <Badge variant={subjectRecord?.subject_type === "core" ? "default" : "secondary"} className="text-xs">
                                    {subjectRecord?.subject_type === "core" ? "Core" : "Optional"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{a.teacherName}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No teacher assignments yet. Assign teachers in the <strong>Teachers</strong> module.
                      </p>
                    )}

                    {unassignedSubjects.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Unassigned subjects:</p>
                        <div className="flex flex-wrap gap-1">
                          {unassignedSubjects.map((s: any) => (
                            <Badge key={s.id} variant="outline" className="text-xs text-muted-foreground">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* ===== CBE SENIOR: Manual room-based teacher allocation ===== */}
      {!isStandardCurriculum && selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedRoom.name} - Teacher Assignments</span>
            </CardTitle>
            <CardDescription>
              Assign teachers to subjects for this room. CBE Senior requires manual allocation for track/pathway scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subject badges */}
            {cbeSeniorSubjectAllocations.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2 text-sm">Subjects in this room:</h4>
                <div className="flex flex-wrap gap-2">
                  {cbeSeniorSubjectAllocations.map((alloc) => (
                    <Badge key={alloc.id} variant={alloc.isCore ? "default" : "secondary"}>
                      {alloc.subjectName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Existing teacher allocations */}
            {teacherAllocations.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Lessons/Week</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherAllocations.map((alloc: any) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">{alloc.subjectName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{alloc.teacherName}</Badge>
                      </TableCell>
                      <TableCell>{alloc.lessonsPerWeek}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeacherMutation.mutate(alloc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add teacher form */}
            {cbeSeniorSubjectAllocations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-1 block">Teacher</label>
                  <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher: any) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Subject</label>
                  <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {cbeSeniorSubjectAllocations.map((alloc) => (
                        <SelectItem key={alloc.subjectId} value={alloc.subjectId}>
                          {alloc.subjectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Lessons/Week</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={newLessonsPerWeek}
                    onChange={(e) => setNewLessonsPerWeek(parseInt(e.target.value) || 4)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAddTeacher} disabled={allocateTeacherMutation.isPending}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
