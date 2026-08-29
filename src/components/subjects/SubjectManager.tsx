import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDivisions } from "@/hooks/useDivisions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  BookOpen, Plus, Trash2, Edit, Save, X, 
  ArrowRightLeft, Info, Loader2, ListPlus, Clock, ShieldCheck, CircleDot
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { CBCSeniorTrackManager } from "./CBCSeniorTrackManager";
import { CBCSeniorSubjectManager } from "./CBCSeniorSubjectManager";
import { AddSubjectsFromDefaultsDialog } from "./AddSubjectsFromDefaultsDialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  getSubjectsGroupedByDivision, 
  createSubject, 
  updateSubject, 
  deleteSubject,
  assignSubjectToDivision,
  type SubjectsByDivision,
  type SchoolSubject,
  type SubjectType
} from "@/services/subjectService";

interface SubjectManagerProps {
  readOnly?: boolean;
}

// Subject type options for non-CBC-Senior curricula
const subjectTypeOptions = [
  { value: "core", label: "Core" },
  { value: "optional", label: "Optional" },
];

export function SubjectManager({ readOnly = false }: SubjectManagerProps) {
  const { user } = useAuth();
  const { divisions, loading: divisionsLoading } = useDivisions();
  const [subjectGroups, setSubjectGroups] = useState<SubjectsByDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDefaultsDialog, setShowDefaultsDialog] = useState(false);
  
  // Form states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectType, setNewSubjectType] = useState<SubjectType>("core");
  const [selectedDivisionForAdd, setSelectedDivisionForAdd] = useState("");
  const [selectedSubjectToMove, setSelectedSubjectToMove] = useState<SchoolSubject | null>(null);
  const [targetDivision, setTargetDivision] = useState("");
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubjectType, setEditSubjectType] = useState<SubjectType>("core");
  const [editLessonsPerWeek, setEditLessonsPerWeek] = useState<number | null>(null);
  const [savingLessons, setSavingLessons] = useState<string | null>(null);
  const [togglingType, setTogglingType] = useState<string | null>(null);

  const handleToggleSubjectType = async (subject: SchoolSubject) => {
    if (readOnly) return;
    const newType: SubjectType = subject.subject_type === "core" ? "optional" : "core";
    try {
      setTogglingType(subject.id);
      await updateSubject(subject.id, { subject_type: newType });
      toast({ title: "Subject Type Updated", description: `${subject.name} is now ${newType === "core" ? "Core" : "Optional"}` });
      fetchSubjects();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update subject type", variant: "destructive" });
    } finally {
      setTogglingType(null);
    }
  };

  useEffect(() => {
    if (user?.schoolId) {
      fetchSubjects();
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (subjectGroups.length > 0 && !activeTab) {
      setActiveTab(subjectGroups[0].divisionId);
    }
  }, [subjectGroups]);

  const fetchSubjects = async () => {
    if (!user?.schoolId) return;
    
    try {
      setLoading(true);
      const grouped = await getSubjectsGroupedByDivision(user.schoolId);
      setSubjectGroups(grouped);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!user?.schoolId || !newSubjectName.trim() || !selectedDivisionForAdd) return;

    try {
      const division = divisions.find(d => d.id === selectedDivisionForAdd);
      await createSubject(
        user.schoolId,
        newSubjectName.trim(),
        division?.curriculum || "cbc",
        selectedDivisionForAdd,
        newSubjectType
      );
      
      toast({
        title: "Subject Added",
        description: `${newSubjectName} has been added as a ${newSubjectType} subject`,
      });
      
      setNewSubjectName("");
      setNewSubjectType("core");
      setShowAddDialog(false);
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add subject",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSubject = async (subjectId: string, curriculum: string) => {
    if (!editName.trim()) return;

    try {
      const updates: Partial<Pick<SchoolSubject, "name" | "subject_type">> = {
        name: editName.trim(),
      };
      
      // Include subject type for non-CBC-Senior curricula
      if (curriculum !== "cbc-senior") {
        updates.subject_type = editSubjectType;
      }
      
      await updateSubject(subjectId, updates);
      toast({ title: "Subject Updated" });
      setEditingSubject(null);
      setEditSubjectType("core");
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subject",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLessonsPerWeek = async (subjectId: string, lessons: number) => {
    try {
      setSavingLessons(subjectId);
      const { error } = await supabase
        .from("subjects")
        .update({ max_lessons_per_week: lessons })
        .eq("id", subjectId);
      
      if (error) throw error;
      
      toast({ title: "Lessons Updated", description: `Set to ${lessons} lessons per week` });
      setEditLessonsPerWeek(null);
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update lessons per week",
        variant: "destructive",
      });
    } finally {
      setSavingLessons(null);
    }
  };

  const handleDeleteSubject = async (subject: SchoolSubject) => {
    if (!confirm(`Are you sure you want to delete "${subject.name}"?`)) return;

    try {
      await deleteSubject(subject.id);
      toast({ title: "Subject Deleted" });
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subject",
        variant: "destructive",
      });
    }
  };

  const handleMoveSubject = async () => {
    if (!selectedSubjectToMove || !targetDivision) return;

    try {
      await assignSubjectToDivision(
        selectedSubjectToMove.id, 
        targetDivision === "unassigned" ? null : targetDivision
      );
      
      toast({
        title: "Subject Moved",
        description: `${selectedSubjectToMove.name} has been moved`,
      });
      
      setShowMoveDialog(false);
      setSelectedSubjectToMove(null);
      setTargetDivision("");
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move subject",
        variant: "destructive",
      });
    }
  };

  // Check if school has CBE Senior division
  const hasCBCSeniorDivision = divisions.some(d => d.curriculum === "cbc-senior");

  if (loading || divisionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (divisions.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No divisions configured. Please set up school divisions first before managing subjects.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subject type explanation */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Core</strong> subjects are mandatory for all students and are always included in the timetable. 
          <strong> Optional</strong> subjects are elective — students may choose them, and they are scheduled separately in timetable generation. 
          {!readOnly && " Click the Core/Optional badge on any subject to toggle its type."}
        </AlertDescription>
      </Alert>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowDefaultsDialog(true)}>
            <ListPlus className="h-4 w-4 mr-2" />
            Add from Default Subjects
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Subject
          </Button>
        </div>
      )}

      {/* Subject Tabs by Division */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {subjectGroups.map((group) => (
            <TabsTrigger key={group.divisionId} value={group.divisionId} className="text-xs">
              {group.divisionName} ({group.subjects.length})
            </TabsTrigger>
          ))}
        </TabsList>

        {subjectGroups.map((group) => (
          <TabsContent key={group.divisionId} value={group.divisionId}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.divisionName}</CardTitle>
                    <CardDescription>
                      {group.subjects.length} subject{group.subjects.length !== 1 ? "s" : ""} • 
                      {group.curriculum !== "mixed" && (
                        <Badge variant="outline" className="ml-2">
                          {group.curriculum.toUpperCase()}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* CBE Senior gets special subject management */}
                {group.curriculum === "cbc-senior" ? (
                  <div className="space-y-6">
                    <CBCSeniorSubjectManager 
                      divisionId={group.divisionId} 
                      readOnly={readOnly} 
                    />
                    <Separator />
                    <CBCSeniorTrackManager readOnly={readOnly} />
                  </div>
                ) : group.subjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No subjects in this division</p>
                    {!readOnly && (
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => setShowDefaultsDialog(true)}
                      >
                        Add default subjects
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                      >
                        {editingSubject === subject.id ? (
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 flex-1 min-w-[120px]"
                              autoFocus
                            />
                            <Select 
                              value={editSubjectType} 
                              onValueChange={(v) => setEditSubjectType(v as SubjectType)}
                            >
                              <SelectTrigger className="h-8 w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {subjectTypeOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateSubject(subject.id, group.curriculum)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditingSubject(null);
                              setEditSubjectType("core");
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm font-medium truncate">{subject.name}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant={subject.subject_type === "core" ? "default" : "secondary"}
                                      className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                                      onClick={() => !readOnly && handleToggleSubjectType(subject)}
                                    >
                                      {togglingType === subject.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : subject.subject_type === "core" ? (
                                        <>
                                          <ShieldCheck className="h-3 w-3 mr-0.5" />
                                          Core
                                        </>
                                      ) : (
                                        <>
                                          <CircleDot className="h-3 w-3 mr-0.5" />
                                          Optional
                                        </>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {readOnly 
                                      ? `This is a ${subject.subject_type === "core" ? "core (mandatory)" : "optional (elective)"} subject`
                                      : `Click to change to ${subject.subject_type === "core" ? "Optional" : "Core"}`
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Lessons per week */}
                              {!readOnly ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    defaultValue={subject.max_lessons_per_week || 5}
                                    className="h-7 w-14 text-xs text-center p-1"
                                    disabled={savingLessons === subject.id}
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (val && val !== (subject.max_lessons_per_week || 5)) {
                                        handleUpdateLessonsPerWeek(subject.id, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (val) handleUpdateLessonsPerWeek(subject.id, val);
                                      }
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">/wk</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {subject.max_lessons_per_week || 5}/wk
                                </span>
                              )}
                              {!readOnly && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingSubject(subject.id);
                                      setEditName(subject.name);
                                      setEditSubjectType((subject.subject_type as SubjectType) || "core");
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedSubjectToMove(subject);
                                      setShowMoveDialog(true);
                                    }}
                                  >
                                    <ArrowRightLeft className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteSubject(subject)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>


      {/* Add from Defaults Dialog */}
      <AddSubjectsFromDefaultsDialog
        open={showDefaultsDialog}
        onOpenChange={setShowDefaultsDialog}
        onSubjectsAdded={fetchSubjects}
      />

      {/* Add Custom Subject Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setNewSubjectName("");
          setNewSubjectType("core");
          setSelectedDivisionForAdd("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={selectedDivisionForAdd} onValueChange={setSelectedDivisionForAdd}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.filter(d => d.curriculum !== "cbc-senior").map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                CBE Senior subjects are managed separately with pathways
              </p>
            </div>
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input
                placeholder="e.g., Mathematics"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Type</Label>
              <Select value={newSubjectType} onValueChange={(v) => setNewSubjectType(v as SubjectType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjectTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Core subjects are taken by all students. Optional subjects may vary by school or student choice.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSubject}
              disabled={!newSubjectName.trim() || !selectedDivisionForAdd}
            >
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Subject Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Move <strong>{selectedSubjectToMove?.name}</strong> to another division:
            </p>
            <Select value={targetDivision} onValueChange={setTargetDivision}>
              <SelectTrigger>
                <SelectValue placeholder="Select target division" />
              </SelectTrigger>
              <SelectContent>
                {divisions
                  .filter(d => d.id !== selectedSubjectToMove?.division_id)
                  .map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveSubject} disabled={!targetDivision}>
              Move Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
