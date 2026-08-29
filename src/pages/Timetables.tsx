import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { RuleBuilder } from "@/components/timetable/RuleBuilder";
import { TimetableView } from "@/components/timetable/TimetableView";
import { SlotEditDialog } from "@/components/timetable/SlotEditDialog";
import { RoomManagement } from "@/components/timetable/RoomManagement";

import { TermResetWizard } from "@/components/timetable/TermResetWizard";
import { DivisionTimetableManager } from "@/components/timetable/DivisionTimetableManager";
import { DivisionTimetableConfig } from "@/components/timetable/DivisionTimetableConfig";
import { ConstraintManager } from "@/components/timetable/ConstraintManager";

import { GradeSubjectAllocation } from "@/components/timetable/GradeSubjectAllocation";
import { RoomBasedAllocation } from "@/components/timetable/RoomBasedAllocation";
import { SubjectStudentCounts } from "@/components/timetable/SubjectStudentCounts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, AlertTriangle, Settings, Sliders, Calendar, Users, Building2, GraduationCap } from "lucide-react";

import {
  getTimetableRules,
  createTimetableRule,
  deleteTimetableRule,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  generateRoomsFromStreams,
  getTimetables,
  getTimetableWithSlots,
  updateTimetableSlot,
} from "@/services/timetableService";

import { generateEnhancedTimetable } from "@/services/enhancedTimetableService";

import {
  getGrades,
  getStreams,
  getTeachers,
  getActiveAcademicYear,
  getActiveTerms
} from "@/services/academicService";

import {
  getTeacherAssignments,
} from "@/services/teacherAssignmentService";

import {
  validateTimetableAgainstAssignments,
  recalibrateTimetable,
} from "@/services/timetableRecalibrationService";

import {
  Room,
  TimetableRule,
  Timetable,
  TimetableSlot,
  Grade,
  Stream,
  Teacher,
  AcademicYear,
  SchoolTerm,
  TimetableGenerationOptions
} from "@/types";

const Timetables = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("view");
  const [loading, setLoading] = useState(false);

  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [termResetOpen, setTermResetOpen] = useState(false);
  const [isRecalibrating, setIsRecalibrating] = useState(false);

  const schoolId = user?.schoolId || "";

  // Fetch school data for curriculum types
  const { data: schoolData } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("curriculum_types")
        .eq("id", schoolId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Fetch subjects from database filtered by school's curriculum
  const { data: dbSubjects = [] } = useQuery({
    queryKey: ["subjects", schoolId, schoolData?.curriculum_types],
    queryFn: async () => {
      const curriculumTypes = schoolData?.curriculum_types || [];
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, curriculum")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      
      if (error) throw error;
      
      // Filter by curriculum type if school has specific types
      if (curriculumTypes.length > 0) {
        return (data || []).filter((s: any) => 
          curriculumTypes.includes(s.curriculum)
        );
      }
      return data || [];
    },
    enabled: !!schoolId && !!schoolData,
  });

  // Extract subject names for use in components
  const subjects = dbSubjects.map((s: any) => s.name);

  const { data: grades = [] } = useQuery({
    queryKey: ["grades", schoolId],
    queryFn: () => getGrades(schoolId),
    enabled: !!schoolId,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ["streams", schoolId, selectedGradeId],
    queryFn: () => getStreams(schoolId, selectedGradeId),
    enabled: !!schoolId && !!selectedGradeId,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: () => getTeachers(schoolId),
    enabled: !!schoolId,
  });

  const { data: academicYear } = useQuery({
    queryKey: ["activeAcademicYear", schoolId],
    queryFn: () => getActiveAcademicYear(schoolId),
    enabled: !!schoolId,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["terms", schoolId, academicYear?.id],
    queryFn: () => getActiveTerms(schoolId, academicYear?.id),
    enabled: !!schoolId && !!academicYear?.id,
  });

  const { data: timetables = [] } = useQuery({
    queryKey: ["timetables", schoolId, academicYear?.id, selectedTermId],
    queryFn: () => getTimetables(schoolId, academicYear?.id, selectedTermId),
    enabled: !!schoolId && !!academicYear?.id && !!selectedTermId,
  });

  const { data: selectedTimetable } = useQuery({
    queryKey: ["timetable", selectedTimetableId],
    queryFn: () => getTimetableWithSlots(selectedTimetableId),
    enabled: !!selectedTimetableId,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["timetableRules", schoolId],
    queryFn: () => getTimetableRules(schoolId),
    enabled: !!schoolId && activeTab === "rules",
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", schoolId],
    queryFn: () => getRooms(schoolId),
    enabled: !!schoolId,
  });

  const { data: gradeStreams = [] } = useQuery({
    queryKey: ["gradeStreams", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_streams")
        .select(`
          id,
          grade_id,
          stream_id,
          grades!inner(id, name, school_id),
          streams!inner(id, name)
        `)
        .eq("grades.school_id", schoolId);

      if (error) throw error;

      return (data || []).map((gs: any) => ({
        id: gs.id,
        gradeId: gs.grade_id,
        streamId: gs.stream_id,
        gradeName: gs.grades?.name || "",
        streamName: gs.streams?.name || "",
      }));
    },
    enabled: !!schoolId,
  });

  const { data: teacherAssignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["teacherAssignments", schoolId, academicYear?.id],
    queryFn: () => getTeacherAssignments(schoolId, academicYear?.id || ""),
    enabled: !!schoolId && !!academicYear?.id,
  });

  const addRuleMutation = useMutation({
    mutationFn: (rule: Omit<TimetableRule, "id" | "createdAt" | "updatedAt">) => 
      createTimetableRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetableRules", schoolId] });
      toast({
        title: "Rule added",
        description: "Timetable rule has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding rule",
        description: error.message || "Failed to add timetable rule.",
        variant: "destructive",
      });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => deleteTimetableRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetableRules", schoolId] });
      toast({
        title: "Rule deleted",
        description: "Timetable rule has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting rule",
        description: error.message || "Failed to delete timetable rule.",
        variant: "destructive",
      });
    }
  });

  const addRoomMutation = useMutation({
    mutationFn: (room: Omit<Room, "id" | "createdAt" | "updatedAt">) => 
      createRoom(room),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", schoolId] });
      toast({
        title: "Room added",
        description: "Room has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding room",
        description: error.message || "Failed to add room.",
        variant: "destructive",
      });
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, room }: { id: string; room: Partial<Room> }) => 
      updateRoom(id, room),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", schoolId] });
      toast({
        title: "Room updated",
        description: "Room has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating room",
        description: error.message || "Failed to update room.",
        variant: "destructive",
      });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", schoolId] });
      toast({
        title: "Room deleted",
        description: "Room has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting room",
        description: error.message || "Failed to delete room.",
        variant: "destructive",
      });
    }
  });

  const updateSlotMutation = useMutation({
    mutationFn: (slot: Partial<TimetableSlot>) => 
      updateTimetableSlot(slot.id!, slot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable", selectedTimetableId] });
      toast({
        title: "Slot updated",
        description: "Timetable slot has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating slot",
        description: error.message || "Failed to update timetable slot.",
        variant: "destructive",
      });
    }
  });

  const generateTimetableMutation = useMutation({
    mutationFn: (options: TimetableGenerationOptions) => 
      generateEnhancedTimetable(options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timetables", schoolId] });
      if (data.success) {
        toast({
          title: "Timetable generated",
          description: data.message,
        });
        if (data.timetableId) {
          setSelectedTimetableId(data.timetableId);
        }
        // Show conflicts if any
        if (data.conflicts && data.conflicts.length > 0) {
          toast({
            title: "Generation completed with conflicts",
            description: `${data.conflicts.length} conflict(s) detected. Check timetable for details.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Generation issue",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error generating timetable",
        description: error.message || "Failed to generate timetable.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (terms.length > 0 && !selectedTermId) {
      const activeTerm = terms.find(term => term.isActive);
      setSelectedTermId(activeTerm?.id || terms[0].id);
    }
  }, [terms, selectedTermId]);

  useEffect(() => {
    if (timetables.length > 0 && !selectedTimetableId) {
      setSelectedTimetableId(timetables[0].id);
    } else if (timetables.length === 0) {
      setSelectedTimetableId("");
    }
  }, [timetables, selectedTimetableId]);

  const handleGenerateTimetable = async () => {
    toast({
      title: "Use Master Generation",
      description: "Timetable generation is now school-wide. Go to the Timetables tab and click 'Generate Master Timetable'.",
    });
  };

  const handleSlotClick = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setEditDialogOpen(true);
  };

  const handleSaveSlot = async (updatedSlot: Partial<TimetableSlot>) => {
    await updateSlotMutation.mutateAsync(updatedSlot);
    setEditDialogOpen(false);
  };

  const handleAddRule = (rule: Omit<TimetableRule, "id" | "createdAt" | "updatedAt">) => {
    return addRuleMutation.mutateAsync(rule).then(() => {
      toast({
        title: "Rule added",
        description: "Timetable rule has been added successfully.",
      });
    });
  };

  const handleDeleteRule = (id: string) => {
    return deleteRuleMutation.mutateAsync(id).then(() => {
      toast({
        title: "Rule deleted",
        description: "Timetable rule has been deleted successfully.",
      });
    });
  };

  const handleCreateRoom = (room: Omit<Room, "id" | "createdAt" | "updatedAt">) => {
    return addRoomMutation.mutateAsync(room).then(() => {
      toast({
        title: "Room added",
        description: "Room has been added successfully.",
      });
    });
  };

  const handleUpdateRoom = (id: string, room: Partial<Room>) => {
    return updateRoomMutation.mutateAsync({ id, room }).then(() => {
      toast({
        title: "Room updated",
        description: "Room has been updated successfully.",
      });
    });
  };

  const handleDeleteRoom = (id: string) => {
    return deleteRoomMutation.mutateAsync(id).then(() => {
      toast({
        title: "Room deleted",
        description: "Room has been deleted successfully.",
      });
    });
  };

  const handleGenerateRoomsFromStreams = async () => {
    const result = await generateRoomsFromStreams(schoolId);
    queryClient.invalidateQueries({ queryKey: ["rooms", schoolId] });
    if (result.created > 0) {
      toast({
        title: "Rooms generated",
        description: `Created ${result.created} room(s) from streams.`,
      });
    }
    return result;
  };

  // Recalibrate affected timetables when assignments change
  const recalibrateAffectedTimetables = async (gradeStreamId: string) => {
    if (!academicYear?.id || !selectedTermId) return;

    // Find timetables for this grade-stream
    const gradeStream = gradeStreams.find((gs: any) => gs.id === gradeStreamId);
    if (!gradeStream) return;

    const affectedTimetables = timetables.filter(
      (t: Timetable) =>
        t.gradeId === gradeStream.gradeId && t.streamId === gradeStream.streamId
    );

    for (const timetable of affectedTimetables) {
      const result = await recalibrateTimetable(
        timetable.id,
        gradeStreamId,
        academicYear.id
      );

      if (result.slotsCleared > 0) {
        toast({
          title: "Timetable Updated",
          description: `${result.slotsCleared} slot(s) updated due to assignment changes in ${gradeStream.gradeName} - ${gradeStream.streamName}.`,
        });
      }
    }

    // Refresh timetable data
    queryClient.invalidateQueries({ queryKey: ["timetable"] });
    queryClient.invalidateQueries({ queryKey: ["timetables"] });
  };

  const handleDeleteTeacherAssignment = async (id: string) => {
    // Assignment management moved to Teachers module
    // This is kept for timetable recalibration only
  };

  const handleTermResetComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["timetables"] });
    queryClient.invalidateQueries({ queryKey: ["teacherAssignments"] });
    refetchAssignments();
  };

  const selectedTermName = terms.find((t: SchoolTerm) => t.id === selectedTermId)?.name || "";

  return (
    <DashboardLayout title="Timetable Management">
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-2xl font-bold mb-6">Timetable Management</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted">
            <TabsTrigger value="view" className="flex-shrink-0">
              <Calendar className="w-4 h-4 mr-1" />
              Timetables
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-shrink-0">
              <Settings className="w-4 h-4 mr-1" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="subject-allocation" className="flex-shrink-0">
              <GraduationCap className="w-4 h-4 mr-1" />
              Subject Allocation
            </TabsTrigger>
            <TabsTrigger value="teacher-allocation" className="flex-shrink-0">
              <Users className="w-4 h-4 mr-1" />
              Teacher Allocation
            </TabsTrigger>
            <TabsTrigger value="constraints" className="flex-shrink-0">
              <Sliders className="w-4 h-4 mr-1" />
              Constraints
            </TabsTrigger>
            <TabsTrigger value="student-counts" className="flex-shrink-0">
              <Users className="w-4 h-4 mr-1" />
              Student Counts
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex-shrink-0">
              <Building2 className="w-4 h-4 mr-1" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="term-reset" className="flex-shrink-0">Term Reset</TabsTrigger>
            <TabsTrigger value="rules" className="flex-shrink-0">Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-6">
            <DivisionTimetableManager
              schoolId={schoolId}
              academicYearId={academicYear?.id || ""}
              terms={terms}
              selectedTermId={selectedTermId}
              onTermChange={setSelectedTermId}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <DivisionTimetableConfig schoolId={schoolId} />
          </TabsContent>

          <TabsContent value="subject-allocation" className="space-y-6">
            <GradeSubjectAllocation schoolId={schoolId} academicYearId={academicYear?.id || ""} />
          </TabsContent>

          <TabsContent value="teacher-allocation" className="space-y-6">
            <RoomBasedAllocation schoolId={schoolId} academicYearId={academicYear?.id || ""} />
          </TabsContent>

          <TabsContent value="constraints" className="space-y-6">
            <ConstraintManager schoolId={schoolId} />
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <RuleBuilder
              existingRules={rules}
              subjects={subjects}
              teacherIds={teachers.map((t: Teacher) => ({ id: t.id, name: t.name }))}
              roomIds={rooms.map((r: Room) => ({ id: r.id, name: r.name }))}
              onAddRule={handleAddRule}
              onDeleteRule={handleDeleteRule}
              schoolId={schoolId}
            />
          </TabsContent>

          <TabsContent value="student-counts" className="space-y-6">
            <SubjectStudentCounts schoolId={schoolId} />
          </TabsContent>

          <TabsContent value="rooms" className="space-y-6">
            <RoomManagement
              rooms={rooms}
              onCreateRoom={handleCreateRoom}
              onUpdateRoom={handleUpdateRoom}
              onDeleteRoom={handleDeleteRoom}
              onGenerateFromStreams={handleGenerateRoomsFromStreams}
              schoolId={schoolId}
            />
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Timetable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium">Grade</label>
                    <Select
                      value={selectedGradeId}
                      onValueChange={setSelectedGradeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade: Grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Stream</label>
                    <Select
                      value={selectedStreamId}
                      onValueChange={setSelectedStreamId}
                      disabled={!selectedGradeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stream" />
                      </SelectTrigger>
                      <SelectContent>
                        {streams.map((stream: Stream) => (
                          <SelectItem key={stream.id} value={stream.id}>
                            {stream.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Term</label>
                    <Select
                      value={selectedTermId}
                      onValueChange={setSelectedTermId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((term: SchoolTerm) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name} {term.isActive ? "(Active)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedGradeId && selectedStreamId && selectedTermId && (
                  <div className="space-y-4">
                    {timetables.length > 0 ? (
                      <>
                        <div className="mb-4">
                          <label className="text-sm font-medium">Select Timetable</label>
                          <Select
                            value={selectedTimetableId}
                            onValueChange={setSelectedTimetableId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select timetable" />
                            </SelectTrigger>
                            <SelectContent>
                              {timetables.map((timetable: Timetable) => (
                                <SelectItem key={timetable.id} value={timetable.id}>
                                  {timetable.grade?.name} - {timetable.stream?.name} (v{timetable.version})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedTimetable && (
                          <>
                            <div className="flex justify-end mb-4">
                              <Button
                                onClick={handleGenerateTimetable}
                                variant="outline"
                                disabled={loading}
                              >
                                {loading ? "Regenerating..." : "Regenerate Timetable"}
                              </Button>
                            </div>
                            <TimetableView
                              timetable={selectedTimetable}
                              editable={true}
                              showTeachers={true}
                              showRooms={true}
                              showConflicts={true}
                              teacherAssignments={teacherAssignments}
                              gradeStreamId={gradeStreams.find(
                                (gs: any) =>
                                  gs.gradeId === selectedTimetable.gradeId &&
                                  gs.streamId === selectedTimetable.streamId
                              )?.id}
                              onSlotClick={handleSlotClick}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-center my-8">
                        <p className="text-muted-foreground mb-4">No timetables found for the selected criteria.</p>
                        <Button onClick={handleGenerateTimetable} disabled={loading}>
                          {loading ? "Generating..." : "Generate Timetable"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <SlotEditDialog
                  open={editDialogOpen}
                  slot={selectedSlot}
                  subjects={subjects}
                  teachers={teachers}
                  rooms={rooms}
                  teacherAssignments={teacherAssignments}
                  onClose={() => setEditDialogOpen(false)}
                  onSave={handleSaveSlot}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="term-reset" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Term Reset & Timetable Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h3 className="font-medium mb-2">What is Term Reset?</h3>
                    <p className="text-sm text-muted-foreground">
                      At the beginning of each term, you can review and update teacher-subject 
                      assignments, then generate new timetables. This ensures timetables always 
                      reflect the current assignments.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Current Term</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={selectedTermId}
                          onValueChange={setSelectedTermId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            {terms.map((term: SchoolTerm) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.name} {term.isActive ? "(Active)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Teacher Assignments</span>
                            <Badge variant={teacherAssignments.length > 0 ? "default" : "secondary"}>
                              {teacherAssignments.length} assignments
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Timetables</span>
                            <Badge variant={timetables.length > 0 ? "default" : "secondary"}>
                              {timetables.length} timetables
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {isRecalibrating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Recalibrating timetables...
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      onClick={() => setTermResetOpen(true)}
                      disabled={!selectedTermId}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start Term Reset
                    </Button>
                  </div>

                  {teacherAssignments.length === 0 && (
                    <div className="rounded-lg border border-warning bg-warning/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                        <div>
                          <h4 className="font-medium text-warning-foreground">No Teacher Assignments</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please set up teacher-subject assignments in the <strong>Teachers</strong> module 
                            (Assign to Classes tab) before generating timetables.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TermResetWizard
          open={termResetOpen}
          onClose={() => setTermResetOpen(false)}
          schoolId={schoolId}
          academicYearId={academicYear?.id || ""}
          termId={selectedTermId}
          termName={selectedTermName}
          gradeStreams={gradeStreams}
          currentAssignments={teacherAssignments}
          onComplete={handleTermResetComplete}
        />
      </div>
    </DashboardLayout>
  );
};

export default Timetables;
