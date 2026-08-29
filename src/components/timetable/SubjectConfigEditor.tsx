import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, BookOpen, FlaskConical, Palette, Calculator, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDivisions } from "@/hooks/useDivisions";
import { getEnhancedSubjects, updateSubjectConfig } from "@/services/constraintService";
import { SubjectConfig, Pathway } from "@/types/timetable";

interface SubjectConfigEditorProps {
  schoolId: string;
}

const pathwayIcons: Record<Pathway, React.ReactNode> = {
  stem: <Calculator className="w-4 h-4" />,
  arts_sports: <Palette className="w-4 h-4" />,
  social_sciences: <BookOpen className="w-4 h-4" />,
};

const pathwayLabels: Record<Pathway, string> = {
  stem: "STEM",
  arts_sports: "Arts & Sports",
  social_sciences: "Social Sciences",
};

export const SubjectConfigEditor: React.FC<SubjectConfigEditorProps> = ({ schoolId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { divisions, loading: divisionsLoading } = useDivisions();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [editingSubject, setEditingSubject] = useState<SubjectConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [formSubjectType, setFormSubjectType] = useState<SubjectConfig["subjectType"]>("core");
  const [formPathway, setFormPathway] = useState<Pathway | undefined>();
  const [formMaxLessons, setFormMaxLessons] = useState(6);
  const [formRequiresRoom, setFormRequiresRoom] = useState(false);
  const [formRoomType, setFormRoomType] = useState("");

  // Get selected division
  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);

  // Check if selected division supports pathways (only CBE Senior)
  const supportsPathways = selectedDivision?.curriculum === "cbc-senior";

  // Fetch subjects filtered by division
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["enhancedSubjects", schoolId, selectedDivisionId],
    queryFn: () => getEnhancedSubjects(schoolId, selectedDivisionId || null),
    enabled: !!schoolId && !!selectedDivisionId,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Partial<SubjectConfig> }) =>
      updateSubjectConfig(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhancedSubjects", schoolId, selectedDivisionId] });
    },
  });

  const openEditDialog = (subject: SubjectConfig) => {
    setEditingSubject(subject);
    setFormSubjectType(subject.subjectType);
    setFormPathway(subject.pathway);
    setFormMaxLessons(subject.maxLessonsPerWeek);
    setFormRequiresRoom(subject.requiresSpecialRoom);
    setFormRoomType(subject.specialRoomType || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingSubject) return;

    try {
      await updateMutation.mutateAsync({
        id: editingSubject.id,
        config: {
          subjectType: formSubjectType,
          pathway: formSubjectType === "optional" && supportsPathways ? formPathway : undefined,
          maxLessonsPerWeek: formMaxLessons,
          requiresSpecialRoom: formRequiresRoom,
          specialRoomType: formRequiresRoom ? formRoomType : undefined,
        },
      });

      setIsDialogOpen(false);
      toast({
        title: "Subject Updated",
        description: `${editingSubject.name} configuration has been saved.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subject configuration.",
        variant: "destructive",
      });
    }
  };

  // Group subjects by type
  const coreSubjects = subjects.filter((s) => s.subjectType === "core");
  const optionalSubjects = subjects.filter((s) => s.subjectType === "optional" || s.subjectType === "elective");

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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading divisions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Division Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Subject Configuration
          </CardTitle>
          <CardDescription>
            Configure subject types, lesson limits, and room requirements for timetable generation.
            Select a division to view and edit its subjects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-64">
              <Label className="text-sm font-medium mb-2 block">School Division</Label>
              <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
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

            {selectedDivision && (
              <div className="flex items-center gap-2 mt-4 sm:mt-6">
                <Badge>{getCurriculumLabel(selectedDivision.curriculum)}</Badge>
                {supportsPathways && (
                  <Badge variant="secondary">Pathway Support</Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No Division Selected */}
      {!selectedDivisionId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Select a school division above to view and configure its subjects.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {selectedDivisionId && isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading subjects...</span>
        </div>
      )}

      {/* Subjects for Selected Division */}
      {selectedDivisionId && !isLoading && (
        <>
          {/* Core Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Core Subjects
              </CardTitle>
              <CardDescription>Subjects that all students must take. Click to edit configuration.</CardDescription>
            </CardHeader>
            <CardContent>
              {coreSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No core subjects in this division. Edit subjects below to mark them as core.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {coreSubjects.map((subject) => (
                    <Badge
                      key={subject.id}
                      variant="default"
                      className="cursor-pointer hover:bg-primary/80 gap-2 py-1.5 px-3"
                      onClick={() => openEditDialog(subject)}
                    >
                      {subject.requiresSpecialRoom && <FlaskConical className="w-3 h-3" />}
                      {subject.name}
                      <span className="text-primary-foreground/70">({subject.maxLessonsPerWeek}/wk)</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optional Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Optional/Elective Subjects
              </CardTitle>
              <CardDescription>
                {supportsPathways
                  ? "Subjects students choose based on their pathway (STEM, Arts & Sports, Social Sciences)"
                  : "Subjects that students can choose to take"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optionalSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No optional subjects in this division. Edit subjects below to mark them as optional.
                </p>
              ) : (
                <div className="space-y-4">
                  {supportsPathways &&
                    (["stem", "arts_sports", "social_sciences"] as Pathway[]).map((pathway) => {
                      const pathwaySubjects = optionalSubjects.filter((s) => s.pathway === pathway);
                      if (pathwaySubjects.length === 0) return null;

                      return (
                        <div key={pathway}>
                          <div className="flex items-center gap-2 mb-2">
                            {pathwayIcons[pathway]}
                            <span className="font-medium">{pathwayLabels[pathway]}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pathwaySubjects.map((subject) => (
                              <Badge
                                key={subject.id}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80 gap-2 py-1.5 px-3"
                                onClick={() => openEditDialog(subject)}
                              >
                                {subject.requiresSpecialRoom && <FlaskConical className="w-3 h-3" />}
                                {subject.name}
                                <span className="text-muted-foreground">({subject.maxLessonsPerWeek}/wk)</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {/* Subjects without pathway */}
                  <div className="flex flex-wrap gap-2">
                    {optionalSubjects
                      .filter((s) => !s.pathway)
                      .map((subject) => (
                        <Badge
                          key={subject.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted gap-2 py-1.5 px-3"
                          onClick={() => openEditDialog(subject)}
                        >
                          {subject.requiresSpecialRoom && <FlaskConical className="w-3 h-3" />}
                          {subject.name}
                          <span className="text-muted-foreground">({subject.maxLessonsPerWeek}/wk)</span>
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Subjects Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Subjects in {selectedDivision?.name}</CardTitle>
              <CardDescription>Click on any subject to edit its timetable configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No subjects found in this division. Add subjects in Subject Management first.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      {supportsPathways && <TableHead>Pathway</TableHead>}
                      <TableHead>Max Lessons/Week</TableHead>
                      <TableHead>Special Room</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subject.subjectType === "core"
                                ? "default"
                                : subject.subjectType === "optional"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {subject.subjectType}
                          </Badge>
                        </TableCell>
                        {supportsPathways && (
                          <TableCell>
                            {subject.pathway ? (
                              <div className="flex items-center gap-1">
                                {pathwayIcons[subject.pathway]}
                                <span className="text-sm">{pathwayLabels[subject.pathway]}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>{subject.maxLessonsPerWeek}</TableCell>
                        <TableCell>
                          {subject.requiresSpecialRoom ? (
                            <Badge variant="outline" className="gap-1">
                              <FlaskConical className="w-3 h-3" />
                              {subject.specialRoomType || "Required"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(subject)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {editingSubject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject Type</Label>
              <Select
                value={formSubjectType}
                onValueChange={(val) => setFormSubjectType(val as SubjectConfig["subjectType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core (Required for all)</SelectItem>
                  <SelectItem value="optional">{supportsPathways ? "Optional (Pathway-based)" : "Optional"}</SelectItem>
                  <SelectItem value="elective">Elective (Student choice)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formSubjectType === "optional" && supportsPathways && (
              <div className="space-y-2">
                <Label>Associated Pathway</Label>
                <Select
                  value={formPathway || "none"}
                  onValueChange={(val) => setFormPathway(val === "none" ? undefined : (val as Pathway))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pathway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific pathway</SelectItem>
                    <SelectItem value="stem">STEM</SelectItem>
                    <SelectItem value="arts_sports">Arts & Sports Science</SelectItem>
                    <SelectItem value="social_sciences">Social Sciences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Maximum Lessons Per Week</Label>
              <Input
                type="number"
                value={formMaxLessons}
                onChange={(e) => setFormMaxLessons(parseInt(e.target.value) || 1)}
                min={1}
                max={15}
              />
              <p className="text-xs text-muted-foreground">
                The generator will try not to schedule more than this many lessons per week.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requires Special Room</Label>
                <p className="text-xs text-muted-foreground">e.g., Labs, Computer rooms, Art studios</p>
              </div>
              <Switch checked={formRequiresRoom} onCheckedChange={setFormRequiresRoom} />
            </div>

            {formRequiresRoom && (
              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select value={formRoomType} onValueChange={setFormRoomType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab">Science Lab</SelectItem>
                    <SelectItem value="computer">Computer Lab</SelectItem>
                    <SelectItem value="art">Art Studio</SelectItem>
                    <SelectItem value="music">Music Room</SelectItem>
                    <SelectItem value="gym">Gymnasium</SelectItem>
                    <SelectItem value="library">Library</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};