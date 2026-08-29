import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, Plus, Trash2, Edit, Save, X, 
  Loader2, GraduationCap, Eye, EyeOff 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getAllSystemSubjects,
  createSystemSubject,
  updateSystemSubject,
  deleteSystemSubject,
  toggleSystemSubjectActive,
  divisionTypeLabels,
  getCurriculumLabel,
  pathwayLabels,
  type SystemSubject,
} from "@/services/systemSubjectService";

interface GroupedSubjects {
  key: string;
  curriculum: string;
  divisionType: string;
  subjects: SystemSubject[];
}

const curriculumOptions = [
   { value: "cbc", label: "CBE (Grade 1-9)" },
   { value: "cbc-senior", label: "CBE Senior (Grade 10-12)" },
  { value: "8-4-4", label: "8-4-4 (Form 1-4)" },
];

const divisionTypeOptions: Record<string, { value: string; label: string }[]> = {
  cbc: [
    { value: "lower_primary", label: "Lower Primary (Grade 1-3)" },
    { value: "upper_primary", label: "Upper Primary (Grade 4-6)" },
    { value: "junior_secondary", label: "Junior Secondary (Grade 7-9)" },
  ],
  "cbc-senior": [
    { value: "senior_secondary", label: "Senior Secondary (Grade 10-12)" },
  ],
  "8-4-4": [
    { value: "secondary", label: "Secondary (Form 1-4)" },
  ],
};

const pathwayOptions = [
  { value: "none", label: "No Pathway (All Students)" },
  { value: "core", label: "Core Subjects" },
  { value: "stem", label: "STEM Pathway" },
  { value: "arts_sports", label: "Arts & Sports Science" },
  { value: "social_sciences", label: "Social Sciences" },
];

export function SystemSubjectManager() {
  const [subjects, setSubjects] = useState<SystemSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCurriculum, setActiveCurriculum] = useState("cbc");
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SystemSubject | null>(null);
  
  // Form states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("cbc");
  const [selectedDivisionType, setSelectedDivisionType] = useState("lower_primary");
  const [selectedPathway, setSelectedPathway] = useState("none");
  const [editPathway, setEditPathway] = useState("none");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await getAllSystemSubjects();
      setSubjects(data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load system subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group subjects by curriculum and division
  const getGroupedSubjects = (curriculum: string): GroupedSubjects[] => {
    const filtered = subjects.filter((s) => s.curriculum === curriculum);
    const groupMap = new Map<string, GroupedSubjects>();

    filtered.forEach((subject) => {
      const key = subject.division_type;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          curriculum,
          divisionType: subject.division_type,
          subjects: [],
        });
      }
      groupMap.get(key)!.subjects.push(subject);
    });

    // Sort subjects within each group
    groupMap.forEach((group) => {
      group.subjects.sort((a, b) => a.display_order - b.display_order);
    });

    return Array.from(groupMap.values());
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;

    try {
      await createSystemSubject(
        newSubjectName.trim(),
        selectedCurriculum,
        selectedDivisionType,
        selectedPathway === "none" ? undefined : selectedPathway
      );

      toast({
        title: "Subject Added",
        description: `${newSubjectName} has been added successfully`,
      });

      setNewSubjectName("");
      setSelectedPathway("none");
      setShowAddDialog(false);
      fetchSubjects();
    } catch (error: any) {
      const isDuplicate = error.message?.includes("duplicate");
      toast({
        title: "Error",
        description: isDuplicate 
          ? "A subject with this name already exists in this division" 
          : error.message || "Failed to add subject",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editName.trim()) return;

    try {
      const updates: { name: string; pathway?: string | null } = { name: editName.trim() };
      
      // Only update pathway for CBC Senior subjects
      if (editingSubject.curriculum === "cbc-senior") {
        updates.pathway = editPathway === "none" ? null : editPathway;
      }
      
      await updateSystemSubject(editingSubject.id, updates);
      toast({ title: "Subject Updated" });
      setEditingSubject(null);
      setEditPathway("none");
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subject",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubject = async (subject: SystemSubject) => {
    if (!confirm(`Are you sure you want to permanently delete "${subject.name}"? This will affect all new school registrations.`)) return;

    try {
      await deleteSystemSubject(subject.id);
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

  const handleToggleActive = async (subject: SystemSubject) => {
    try {
      await toggleSystemSubjectActive(subject.id, !subject.is_active);
      toast({
        title: subject.is_active ? "Subject Disabled" : "Subject Enabled",
        description: `${subject.name} will ${subject.is_active ? "no longer" : "now"} appear in new school registrations`,
      });
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle subject",
        variant: "destructive",
      });
    }
  };

  const getSubjectCountByCurriculum = (curriculum: string) => {
    return subjects.filter((s) => s.curriculum === curriculum).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              System Subject Management
            </CardTitle>
            <CardDescription>
              Manage default subjects available to all schools during registration
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New System Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Curriculum</Label>
                  <Select
                    value={selectedCurriculum}
                    onValueChange={(v) => {
                      setSelectedCurriculum(v);
                      setSelectedDivisionType(divisionTypeOptions[v]?.[0]?.value || "");
                      setSelectedPathway("none");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {curriculumOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select
                    value={selectedDivisionType}
                    onValueChange={setSelectedDivisionType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {divisionTypeOptions[selectedCurriculum]?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCurriculum === "cbc-senior" && (
                  <div className="space-y-2">
                    <Label>Pathway (Optional)</Label>
                    <Select
                      value={selectedPathway}
                      onValueChange={setSelectedPathway}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pathway (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {pathwayOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    placeholder="e.g., Mathematics"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSubject}
                  disabled={!newSubjectName.trim()}
                >
                  Add Subject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Curriculum Tabs */}
        <Tabs value={activeCurriculum} onValueChange={setActiveCurriculum}>
          <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="cbc">
               CBE ({getSubjectCountByCurriculum("cbc")})
             </TabsTrigger>
             <TabsTrigger value="cbc-senior">
               CBE Senior ({getSubjectCountByCurriculum("cbc-senior")})
            </TabsTrigger>
            <TabsTrigger value="8-4-4">
              8-4-4 ({getSubjectCountByCurriculum("8-4-4")})
            </TabsTrigger>
          </TabsList>

          {["cbc", "cbc-senior", "8-4-4"].map((curriculum) => (
            <TabsContent key={curriculum} value={curriculum}>
              <div className="space-y-6 pt-4">
                {getGroupedSubjects(curriculum).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No subjects configured for this curriculum</p>
                  </div>
                ) : (
                  getGroupedSubjects(curriculum).map((group) => (
                    <Card key={group.key} className="border-muted">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">
                          {divisionTypeLabels[group.divisionType] || group.divisionType}
                        </CardTitle>
                        <CardDescription>
                          {group.subjects.length} subject{group.subjects.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px] md:h-[400px] pr-3">
                          <div className="space-y-2 pb-2">
                            {group.subjects.map((subject) => (
                              <div
                                key={subject.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  subject.is_active 
                                    ? "bg-muted/30" 
                                    : "bg-muted/10 opacity-60"
                                }`}
                              >
                                {editingSubject?.id === subject.id ? (
                                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                                    <Input
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="h-8 flex-1 min-w-[120px]"
                                      autoFocus
                                    />
                                    {/* Only show pathway selector for CBC Senior subjects */}
                                    {subject.curriculum === "cbc-senior" && (
                                      <Select
                                        value={editPathway}
                                        onValueChange={setEditPathway}
                                      >
                                        <SelectTrigger className="h-8 w-[160px]">
                                          <SelectValue placeholder="Select pathway" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {pathwayOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleUpdateSubject}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingSubject(null);
                                        setEditPathway("none");
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">
                                        {subject.name}
                                      </span>
                                      {subject.pathway && (
                                        <Badge variant="secondary" className="text-xs">
                                          {pathwayLabels[subject.pathway] || subject.pathway}
                                        </Badge>
                                      )}
                                      {!subject.is_active && (
                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                          Disabled
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleToggleActive(subject)}
                                        title={subject.is_active ? "Disable" : "Enable"}
                                      >
                                        {subject.is_active ? (
                                          <Eye className="h-4 w-4" />
                                        ) : (
                                          <EyeOff className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingSubject(subject);
                                          setEditName(subject.name);
                                          setEditPathway(subject.pathway || "none");
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteSubject(subject)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
