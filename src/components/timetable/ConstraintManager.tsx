import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Clock, Users, BookOpen, Loader2, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getTimetableConstraints,
  createTimetableConstraint,
  updateTimetableConstraint,
  deleteTimetableConstraint,
  getTeachersWithConstraints,
  getEnhancedSubjects,
  updateTeacherMaxLessons,
} from "@/services/constraintService";
import { TimetableConstraint } from "@/types/timetable";

interface ConstraintManagerProps {
  schoolId: string;
}

export const ConstraintManager: React.FC<ConstraintManagerProps> = ({ schoolId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if school has CBE Senior curriculum
  const { data: schoolData } = useQuery({
    queryKey: ["school-curriculum", schoolId],
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
  const supportsPathways = schoolData?.curriculum_types?.includes("cbc-senior") ?? false;
  const [activeSection, setActiveSection] = useState<"teachers" | "subjects" | "general" | "time_restrictions">("teachers");
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingMaxLessons, setEditingMaxLessons] = useState<number>(30);

  // Time restriction state
  const [selectedSubjectForRestriction, setSelectedSubjectForRestriction] = useState<string>("");
  const [selectedMaxPeriod, setSelectedMaxPeriod] = useState<number>(5);

  // Fetch data
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["teachersWithConstraints", schoolId],
    queryFn: () => getTeachersWithConstraints(schoolId),
    enabled: !!schoolId,
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["enhancedSubjects", schoolId],
    queryFn: () => getEnhancedSubjects(schoolId),
    enabled: !!schoolId,
  });

  const { data: constraints = [], isLoading: loadingConstraints } = useQuery({
    queryKey: ["timetableConstraints", schoolId],
    queryFn: () => getTimetableConstraints(schoolId),
    enabled: !!schoolId,
  });

  // Mutations
  const addConstraintMutation = useMutation({
    mutationFn: createTimetableConstraint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetableConstraints", schoolId] });
    },
  });

  const updateConstraintMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TimetableConstraint> }) =>
      updateTimetableConstraint(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetableConstraints", schoolId] });
    },
  });

  const deleteConstraintMutation = useMutation({
    mutationFn: deleteTimetableConstraint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetableConstraints", schoolId] });
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({ teacherId, maxLessons }: { teacherId: string; maxLessons: number }) =>
      updateTeacherMaxLessons(teacherId, maxLessons),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachersWithConstraints", schoolId] });
    },
  });

  // General constraints
  const freePeriodsConstraint = constraints.find((c) => c.constraintType === "free_periods_per_day");
  const maxConsecutiveConstraint = constraints.find((c) => c.constraintType === "max_consecutive_lessons");
  const subjectTimeRestrictions = constraints.filter((c) => c.constraintType === "subject_max_period");

  const handleSaveTeacherMaxLessons = async (teacherId: string) => {
    try {
      await updateTeacherMutation.mutateAsync({ teacherId, maxLessons: editingMaxLessons });
      setEditingTeacherId(null);
      toast({
        title: "Updated",
        description: "Teacher's maximum lessons updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update teacher constraint.",
        variant: "destructive",
      });
    }
  };

  const handleAddGeneralConstraint = async (type: TimetableConstraint["constraintType"], value: number, entityId?: string, entityName?: string) => {
    try {
      await addConstraintMutation.mutateAsync({
        schoolId,
        constraintType: type,
        maxValue: value,
        isActive: true,
        entityId,
        entityName,
      });
      toast({
        title: "Constraint Added",
        description: "Constraint has been added.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add constraint.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGeneralConstraint = async (id: string, value: number) => {
    try {
      await updateConstraintMutation.mutateAsync({ id, updates: { maxValue: value } });
      toast({
        title: "Updated",
        description: "Constraint updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update constraint.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConstraint = async (id: string) => {
    try {
      await deleteConstraintMutation.mutateAsync(id);
      toast({
        title: "Deleted",
        description: "Constraint removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete constraint.",
        variant: "destructive",
      });
    }
  };

  const handleAddSubjectTimeRestriction = async () => {
    if (!selectedSubjectForRestriction) {
      toast({ title: "Error", description: "Please select a subject.", variant: "destructive" });
      return;
    }

    // Check if restriction already exists for this subject
    const existing = subjectTimeRestrictions.find((c) => c.entityName === selectedSubjectForRestriction);
    if (existing) {
      toast({ title: "Already exists", description: `A time restriction already exists for ${selectedSubjectForRestriction}. Delete it first to add a new one.`, variant: "destructive" });
      return;
    }

    await handleAddGeneralConstraint(
      "subject_max_period",
      selectedMaxPeriod,
      undefined,
      selectedSubjectForRestriction
    );
    setSelectedSubjectForRestriction("");
    setSelectedMaxPeriod(5);
  };

  const isLoading = loadingTeachers || loadingSubjects || loadingConstraints;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading constraints...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeSection === "teachers" ? "default" : "outline"}
          onClick={() => setActiveSection("teachers")}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Teacher Limits
        </Button>
        <Button
          variant={activeSection === "subjects" ? "default" : "outline"}
          onClick={() => setActiveSection("subjects")}
          className="gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Subject Limits
        </Button>
        <Button
          variant={activeSection === "time_restrictions" ? "default" : "outline"}
          onClick={() => setActiveSection("time_restrictions")}
          className="gap-2"
        >
          <Ban className="w-4 h-4" />
          Time Restrictions
        </Button>
        <Button
          variant={activeSection === "general" ? "default" : "outline"}
          onClick={() => setActiveSection("general")}
          className="gap-2"
        >
          <Clock className="w-4 h-4" />
          General Settings
        </Button>
      </div>

      {/* Teacher Limits Section */}
      {activeSection === "teachers" && (
        <Card>
          <CardHeader>
            <CardTitle>Teacher Weekly Lesson Limits</CardTitle>
            <CardDescription>
              Set the maximum number of lessons each teacher can be assigned per week. Default is 30 lessons/week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No teachers found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Max Lessons/Week</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjectsTaught.slice(0, 3).map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {teacher.subjectsTaught.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{teacher.subjectsTaught.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingTeacherId === teacher.id ? (
                          <Input
                            type="number"
                            value={editingMaxLessons}
                            onChange={(e) => setEditingMaxLessons(parseInt(e.target.value) || 30)}
                            className="w-20"
                            min={1}
                            max={50}
                          />
                        ) : (
                          <Badge variant="outline">{teacher.maxLessonsPerWeek} lessons</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingTeacherId === teacher.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => handleSaveTeacherMaxLessons(teacher.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTeacherId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTeacherId(teacher.id);
                              setEditingMaxLessons(teacher.maxLessonsPerWeek);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject Limits Section */}
      {activeSection === "subjects" && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Weekly Lesson Limits</CardTitle>
            <CardDescription>View and manage subject lesson limits. Edit individual subjects in the Subjects tab.</CardDescription>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No subjects found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    {supportsPathways && <TableHead>Pathway</TableHead>}
                    <TableHead>Max Lessons/Week</TableHead>
                    <TableHead>Special Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        <Badge variant={subject.subjectType === "core" ? "default" : "secondary"}>
                          {subject.subjectType}
                        </Badge>
                      </TableCell>
                      {supportsPathways && (
                        <TableCell>
                          {subject.pathway ? (
                            <Badge variant="outline">{subject.pathway.replace("_", " ")}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">{subject.maxLessonsPerWeek}</Badge>
                      </TableCell>
                      <TableCell>
                        {subject.requiresSpecialRoom ? (
                          <Badge variant="secondary">{subject.specialRoomType || "Required"}</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject Time Restrictions Section */}
      {activeSection === "time_restrictions" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Time Restrictions</CardTitle>
              <CardDescription>
                Restrict certain subjects from being scheduled after a specific period. For example, prevent Math from being taught after the 5th period (afternoon).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add new restriction */}
              <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={selectedSubjectForRestriction}
                    onValueChange={setSelectedSubjectForRestriction}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Must occur before period</Label>
                  <Select
                    value={selectedMaxPeriod.toString()}
                    onValueChange={(val) => setSelectedMaxPeriod(parseInt(val))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                        <SelectItem key={p} value={p.toString()}>
                          Period {p} (max)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddSubjectTimeRestriction} disabled={addConstraintMutation.isPending}>
                  Add Restriction
                </Button>
              </div>

              {/* Existing restrictions */}
              {subjectTimeRestrictions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No subject time restrictions configured. Add one above to prevent certain subjects from being scheduled in later periods.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Cannot occur after period</TableHead>
                      <TableHead>Meaning</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectTimeRestrictions.map((restriction) => (
                      <TableRow key={restriction.id}>
                        <TableCell className="font-medium">{restriction.entityName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Period {restriction.maxValue}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          Only scheduled in periods 1–{restriction.maxValue}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteConstraint(restriction.id)}
                            disabled={deleteConstraintMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* General Settings Section */}
      {activeSection === "general" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Free Periods</CardTitle>
              <CardDescription>Configure minimum free periods per day for students.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label>Free periods per day:</Label>
                <Select
                  value={freePeriodsConstraint?.maxValue?.toString() || "0"}
                  onValueChange={(val) => {
                    const value = parseInt(val);
                    if (freePeriodsConstraint) {
                      handleUpdateGeneralConstraint(freePeriodsConstraint.id, value);
                    } else {
                      handleAddGeneralConstraint("free_periods_per_day", value);
                    }
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 period</SelectItem>
                    <SelectItem value="2">2 periods</SelectItem>
                    <SelectItem value="3">3 periods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consecutive Lessons</CardTitle>
              <CardDescription>Maximum consecutive lessons before a break is required.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label>Max consecutive lessons:</Label>
                <Select
                  value={maxConsecutiveConstraint?.maxValue?.toString() || "4"}
                  onValueChange={(val) => {
                    const value = parseInt(val);
                    if (maxConsecutiveConstraint) {
                      handleUpdateGeneralConstraint(maxConsecutiveConstraint.id, value);
                    } else {
                      handleAddGeneralConstraint("max_consecutive_lessons", value);
                    }
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 lessons</SelectItem>
                    <SelectItem value="3">3 lessons</SelectItem>
                    <SelectItem value="4">4 lessons</SelectItem>
                    <SelectItem value="5">5 lessons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
