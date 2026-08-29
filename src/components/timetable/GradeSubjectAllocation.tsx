import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Loader2, Building2, Check, X, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDivisions } from "@/hooks/useDivisions";
import {
  getRoomSubjectAllocations,
  allocateSubjectToRoom,
  removeSubjectFromRoom,
} from "@/services/roomAllocationService";

interface GradeSubjectAllocationProps {
  schoolId: string;
  academicYearId: string;
}

interface SubjectRoomAllocation {
  subjectId: string;
  subjectName: string;
  subjectType: string;
  pathway?: string;
  allocatedRoomIds: string[];
}

export const GradeSubjectAllocation: React.FC<GradeSubjectAllocationProps> = ({
  schoolId,
  academicYearId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { divisions, loading: divisionsLoading } = useDivisions();
  
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const isStandardCurriculum = selectedDivision?.curriculum !== "cbc-senior";
  const supportsPathways = selectedDivision?.curriculum === "cbc-senior";

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

  // Fetch streams for selected grade (actual streams from grade_streams)
  const { data: gradeStreams = [] } = useQuery({
    queryKey: ["gradeStreamsForAllocation", selectedGradeId],
    queryFn: async () => {
      const { data: gsData, error: gsError } = await supabase
        .from("grade_streams")
        .select("stream_id, streams!inner(id, name)")
        .eq("grade_id", selectedGradeId);

      if (!gsError && gsData && gsData.length > 0) {
        return gsData.map((gs: any) => ({ id: gs.streams.id, name: gs.streams.name }));
      }

      const { data: directStreams, error: directError } = await supabase
        .from("streams")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("grade_id", selectedGradeId);

      if (!directError && directStreams) return directStreams;
      return [];
    },
    enabled: !!schoolId && !!selectedGradeId,
  });

  // Fetch rooms strictly for selected grade's streams (1:1 stream-room correspondence)
  const { data: rooms = [] } = useQuery({
    queryKey: ["roomsByGradeStrict", schoolId, selectedGradeId, gradeStreams.map((gs: any) => gs.id).join(",")],
    queryFn: async () => {
      const streamIds = gradeStreams.map((gs: any) => gs.id);
      if (streamIds.length === 0) return [];

      // Primary: rooms strictly linked to this selected grade (and its streams)
      const { data: streamRooms, error } = await supabase
        .from("rooms")
        .select("*, grades:grade_id(id, name), streams:stream_id(id, name)")
        .eq("school_id", schoolId)
        .eq("grade_id", selectedGradeId)
        .in("stream_id", streamIds)
        .order("name");

      if (error) throw error;
      if (streamRooms && streamRooms.length > 0) {
        return streamRooms.map((r: any) => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          roomType: r.room_type,
          roomMode: r.room_mode || "standard",
          schoolId: r.school_id,
          gradeId: r.grade_id || selectedGradeId,
          streamId: r.stream_id,
          gradeName: r.grades?.name,
          streamName: r.streams?.name,
          isShared: r.is_shared || false,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }

      // Fallback: any non-shared room linked directly by this grade_id
      const { data: gradeRooms, error: gradeErr } = await supabase
        .from("rooms")
        .select("*, grades:grade_id(id, name), streams:stream_id(id, name)")
        .eq("school_id", schoolId)
        .eq("grade_id", selectedGradeId)
        .eq("is_shared", false)
        .order("name");

      if (gradeErr) throw gradeErr;
      return (gradeRooms || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        roomType: r.room_type,
        roomMode: r.room_mode || "standard",
        schoolId: r.school_id,
        gradeId: r.grade_id,
        streamId: r.stream_id,
        gradeName: r.grades?.name,
        streamName: r.streams?.name,
        isShared: r.is_shared || false,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
    enabled: !!schoolId && !!selectedGradeId,
  });

  // Fetch subjects for the selected division
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", schoolId, selectedDivisionId],
    queryFn: async () => {
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

  // Fetch all subject allocations for rooms (CBE Senior and 8-4-4 optional subjects)
  const { data: allRoomAllocations = [] } = useQuery({
    queryKey: ["gradeRoomSubjectAllocations", selectedGradeId, academicYearId],
    queryFn: async () => {
      if (!rooms.length) return [];
      const allAllocations = await Promise.all(
        rooms.map((room) => getRoomSubjectAllocations(room.id, academicYearId))
      );
      return allAllocations.flat();
    },
    enabled: !!selectedGradeId && rooms.length > 0,
  });

  // Fetch student count
  const { data: studentCount = 0 } = useQuery({
    queryKey: ["studentCount", selectedGradeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("grade_id", selectedGradeId)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedGradeId,
  });

  // Build subject allocation summary (CBE Senior only)
  const subjectAllocationSummary: SubjectRoomAllocation[] = subjects.map((subject: any) => {
    const allocatedRoomIds = allRoomAllocations
      .filter((a) => a.subjectId === subject.id)
      .map((a) => a.roomId);
    
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectType: subject.subject_type,
      pathway: subject.pathway,
      allocatedRoomIds,
    };
  });

  const coreSubjects = subjects.filter((s: any) => s.subject_type === "core");
  const optionalSubjects = subjects.filter((s: any) => s.subject_type !== "core");

  // CBE Senior allocation summary
  const cbeSeniorCoreAllocs = subjectAllocationSummary.filter((s) => s.subjectType === "core");
  const cbeSeniorOptionalAllocs = subjectAllocationSummary.filter((s) => s.subjectType !== "core");

  // Mutations (CBE Senior only)
  const [isAllocating, setIsAllocating] = useState(false);

  const handleToggleCoreSubject = async (subjectId: string, currentlyAllocated: boolean) => {
    setIsAllocating(true);
    try {
      if (currentlyAllocated) {
        const allocationsToRemove = allRoomAllocations.filter((a) => a.subjectId === subjectId);
        for (const alloc of allocationsToRemove) {
          await removeSubjectFromRoom(alloc.id);
        }
        toast({ title: "Subject removed", description: "Core subject removed from all rooms in this grade." });
      } else {
        for (const room of rooms) {
          await allocateSubjectToRoom(room.id, subjectId, schoolId, true, academicYearId);
        }
        toast({ title: "Subject allocated", description: "Core subject added to all rooms in this grade." });
      }
      queryClient.invalidateQueries({ queryKey: ["gradeRoomSubjectAllocations", selectedGradeId] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAllocating(false);
    }
  };

  const handleToggleOptionalRoom = async (subjectId: string, roomId: string, isCurrentlyAllocated: boolean) => {
    setIsAllocating(true);
    try {
      if (isCurrentlyAllocated) {
        const allocation = allRoomAllocations.find((a) => a.subjectId === subjectId && a.roomId === roomId);
        if (allocation) {
          await removeSubjectFromRoom(allocation.id);
        }
      } else {
        await allocateSubjectToRoom(roomId, subjectId, schoolId, false, academicYearId);
      }
      queryClient.invalidateQueries({ queryKey: ["gradeRoomSubjectAllocations", selectedGradeId] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAllocating(false);
    }
  };

  const handleAllocateAllOptional = async (subjectId: string) => {
    setIsAllocating(true);
    try {
      for (const room of rooms) {
        const exists = allRoomAllocations.some((a) => a.subjectId === subjectId && a.roomId === room.id);
        if (!exists) {
          await allocateSubjectToRoom(room.id, subjectId, schoolId, false, academicYearId);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["gradeRoomSubjectAllocations", selectedGradeId] });
      toast({ title: "Subject allocated", description: "Optional subject added to all rooms." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAllocating(false);
    }
  };

  const handleRemoveAllOptional = async (subjectId: string) => {
    setIsAllocating(true);
    try {
      const allocationsToRemove = allRoomAllocations.filter((a) => a.subjectId === subjectId);
      for (const alloc of allocationsToRemove) {
        await removeSubjectFromRoom(alloc.id);
      }
      queryClient.invalidateQueries({ queryKey: ["gradeRoomSubjectAllocations", selectedGradeId] });
      toast({ title: "Subject removed", description: "Optional subject removed from all rooms." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAllocating(false);
    }
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setSelectedGradeId("");
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
            <BookOpen className="w-5 h-5" />
            Grade-Based Subject Allocation
          </CardTitle>
          <CardDescription>
            {isStandardCurriculum
              ? "Subjects are managed in the Subjects module by division. Core and optional subjects are automatically used for timetable generation."
              : "CBE Senior requires manual subject-to-room allocation for track/pathway-based scheduling."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onValueChange={setSelectedGradeId}
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
          </div>
        </CardContent>
      </Card>

      {/* Standard Curriculum (8-4-4, CBE Primary/Junior): Core auto-allocated, optional per-room */}
      {selectedGradeId && isStandardCurriculum && (
        <>
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {studentCount} active student{studentCount !== 1 ? "s" : ""} in this grade
                </span>
                <span className="text-xs text-muted-foreground">
                  ({gradeStreams.length} stream{gradeStreams.length !== 1 ? "s" : ""}, {rooms.length} room{rooms.length !== 1 ? "s" : ""})
                </span>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Core subjects</strong> are automatically scheduled in all streams and cannot be scheduled concurrently —
              every student must attend them. <strong>Optional subjects</strong> must be allocated to specific rooms below.
              Optional subjects in different rooms can be scheduled concurrently if no student takes both at the same time.
            </AlertDescription>
          </Alert>

          {/* Core Subjects - Auto-allocated to all rooms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Core Subjects</CardTitle>
              <CardDescription>
                Automatically scheduled for all {gradeStreams.length} stream{gradeStreams.length !== 1 ? "s" : ""} in this grade.
                These cannot be scheduled concurrently — all students must attend.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {coreSubjects.map((subject: any) => (
                  <Badge key={subject.id} variant="default" className="py-2 px-3">
                    <Check className="w-3 h-3 mr-1" />
                    {subject.name}
                    <span className="ml-1 text-xs opacity-75">({subject.max_lessons_per_week || 4}/wk)</span>
                  </Badge>
                ))}
                {coreSubjects.length === 0 && (
                  <p className="text-muted-foreground text-sm">No core subjects found. Add core subjects in the Subjects module for this division.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Optional Subjects - Per-room allocation */}
          {optionalSubjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Optional Subject Allocation</CardTitle>
                <CardDescription>
                  Choose which rooms (streams) offer each optional subject. Subjects can be scheduled concurrently
                  across different rooms if no student takes two at the same time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rooms.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No rooms found for this grade. Generate rooms from streams in the Rooms tab first, then allocate optional subjects here.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Optional Subject</TableHead>
                        {rooms.filter((r: any) => !r.isShared).map((room: any) => (
                          <TableHead key={room.id} className="text-center text-xs">
                            {room.streamName || room.name}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optionalSubjects.map((subject: any) => {
                        const allocatedRoomIds = allRoomAllocations
                          .filter((a) => a.subjectId === subject.id)
                          .map((a) => a.roomId);
                        const nonSharedRooms = rooms.filter((r: any) => !r.isShared);
                        const allAllocated = nonSharedRooms.every((r: any) => allocatedRoomIds.includes(r.id));

                        return (
                          <TableRow key={subject.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{subject.name}</span>
                                <span className="text-xs text-muted-foreground">({subject.max_lessons_per_week || 4}/wk)</span>
                              </div>
                            </TableCell>
                            {nonSharedRooms.map((room: any) => {
                              const isAllocated = allocatedRoomIds.includes(room.id);
                              return (
                                <TableCell key={room.id} className="text-center">
                                  <Checkbox
                                    checked={isAllocated}
                                    disabled={isAllocating}
                                    onCheckedChange={() => handleToggleOptionalRoom(subject.id, room.id, isAllocated)}
                                  />
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right">
                              {allAllocated ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  disabled={isAllocating}
                                  onClick={() => handleRemoveAllOptional(subject.id)}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Remove All
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  disabled={isAllocating}
                                  onClick={() => handleAllocateAllOptional(subject.id)}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  All Rooms
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* CBE Senior: Room-mode-aware allocation */}
      {selectedGradeId && !isStandardCurriculum && rooms.length > 0 && (
        <>
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {studentCount} active student{studentCount !== 1 ? "s" : ""} in this grade
                </span>
                <span className="text-xs text-muted-foreground">
                  ({gradeStreams.length} stream{gradeStreams.length !== 1 ? "s" : ""}, {rooms.length} room{rooms.length !== 1 ? "s" : ""})
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Room summary by mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rooms.map((room: any) => {
              const roomMode = room.roomMode || "standard";
              const isFullRoom = roomMode === "full";
              const isSplitRoom = roomMode === "split";
              const roomAllocations = allRoomAllocations.filter((a) => a.roomId === room.id);
              const allocatedSubjectIds = new Set(roomAllocations.map((a) => a.subjectId));

              return (
                <Card key={room.id} className={isSplitRoom ? "border-amber-500/30" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {room.name}
                      <Badge variant={isFullRoom ? "default" : isSplitRoom ? "secondary" : "outline"} className="text-xs">
                        {isFullRoom ? "Full" : isSplitRoom ? "Split" : "Standard"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isFullRoom
                        ? "All subjects are core — every student takes every subject in this room."
                        : isSplitRoom
                        ? "Multiple tracks share this room. Optional subjects may run concurrently if no student overlap."
                        : "Standard room mode."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isFullRoom ? (
                      // Full room: all subjects are effectively core, show read-only
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">All subjects auto-allocated as core:</p>
                        <div className="flex flex-wrap gap-1">
                          {subjects.map((subject: any) => {
                            const isAllocated = allocatedSubjectIds.has(subject.id);
                            return (
                              <Badge
                                key={subject.id}
                                variant={isAllocated ? "default" : "outline"}
                                className="text-xs cursor-pointer"
                                onClick={() => {
                                  if (!isAllocated) {
                                    allocateSubjectToRoom(room.id, subject.id, schoolId, true, academicYearId).then(() => {
                                      queryClient.invalidateQueries({ queryKey: ["gradeRoomSubjectAllocations", selectedGradeId] });
                                    });
                                  }
                                }}
                              >
                                {isAllocated && <Check className="w-3 h-3 mr-1" />}
                                {subject.name}
                              </Badge>
                            );
                          })}
                        </div>
                        {subjects.some((s: any) => !allocatedSubjectIds.has(s.id)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs mt-1"
                            disabled={isAllocating}
                            onClick={async () => {
                              setIsAllocating(true);
                              try {
                                for (const subject of subjects) {
                                  if (!allocatedSubjectIds.has(subject.id)) {
                                    await allocateSubjectToRoom(room.id, subject.id, schoolId, true, academicYearId);
                                  }
                                }
                                queryClient.invalidateQueries({ queryKey: ["gradeRoomSubjectAllocations", selectedGradeId] });
                                toast({ title: "All subjects allocated", description: `All subjects added as core to ${room.name}.` });
                              } catch (error: any) {
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              } finally {
                                setIsAllocating(false);
                              }
                            }}
                          >
                            Allocate All as Core
                          </Button>
                        )}
                      </div>
                    ) : isSplitRoom ? (
                      // Split room: core subjects auto-allocated, optional subjects need per-room control
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Core subjects (auto-allocated):</p>
                          <div className="flex flex-wrap gap-1">
                            {coreSubjects.map((subject: any) => {
                              const isAllocated = allocatedSubjectIds.has(subject.id);
                              return (
                                <Badge
                                  key={subject.id}
                                  variant={isAllocated ? "default" : "outline"}
                                  className="text-xs cursor-pointer"
                                  onClick={() => handleToggleCoreSubject(subject.id, isAllocated)}
                                >
                                  {isAllocated && <Check className="w-3 h-3 mr-1" />}
                                  {subject.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Optional subjects (select which are offered in this room):</p>
                          <div className="flex flex-wrap gap-1">
                            {optionalSubjects.map((subject: any) => {
                              const isAllocated = allocatedSubjectIds.has(subject.id);
                              return (
                                <Badge
                                  key={subject.id}
                                  variant={isAllocated ? "secondary" : "outline"}
                                  className="text-xs cursor-pointer"
                                  onClick={() => handleToggleOptionalRoom(subject.id, room.id, isAllocated)}
                                >
                                  {isAllocated && <Check className="w-3 h-3 mr-1" />}
                                  {subject.name}
                                  {subject.pathway && <span className="ml-1 opacity-60">({subject.pathway})</span>}
                                </Badge>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            <Info className="w-3 h-3 inline mr-1" />
                            Subjects with no student overlap can run concurrently in the same time slot (e.g. Computer Science & Agriculture if no student takes both).
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Standard mode fallback
                      <div className="flex flex-wrap gap-1">
                        {subjects.map((subject: any) => {
                          const isAllocated = allocatedSubjectIds.has(subject.id);
                          return (
                            <Badge
                              key={subject.id}
                              variant={isAllocated ? "default" : "outline"}
                              className="text-xs"
                            >
                              {isAllocated && <Check className="w-3 h-3 mr-1" />}
                              {subject.name}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {selectedGradeId && !isStandardCurriculum && rooms.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No rooms found for this grade. Generate rooms from streams in the Rooms tab first.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
