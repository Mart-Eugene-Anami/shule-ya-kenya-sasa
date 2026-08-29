import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDivisions } from "@/hooks/useDivisions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, BookOpen, Check, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getSubjectsByCurriculum,
  type Subject,
  type Curriculum,
  cbcSeniorPathways,
} from "@/services/curriculumService";
import {
  getSystemSubjectsByDivisionType,
  type SystemSubject,
} from "@/services/systemSubjectService";

interface AddSubjectsFromDefaultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectsAdded: () => void;
}

interface DivisionSubjectGroup {
  divisionId: string;
  divisionName: string;
  divisionType: string;
  curriculum: string;
  availableSubjects: SubjectOption[];
  existingSubjectNames: string[];
}

interface SubjectOption {
  id: string;
  name: string;
  pathway?: string;
  isCore?: boolean;
}

export function AddSubjectsFromDefaultsDialog({
  open,
  onOpenChange,
  onSubjectsAdded,
}: AddSubjectsFromDefaultsDialogProps) {
  const { user } = useAuth();
  const { divisions } = useDivisions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [divisionGroups, setDivisionGroups] = useState<DivisionSubjectGroup[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (open && user?.schoolId && divisions.length > 0) {
      loadSubjectData();
    }
  }, [open, user?.schoolId, divisions]);

  const loadSubjectData = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      // Get existing ACTIVE subjects for this school
      // We only filter out active subjects so that soft-deleted ones can be re-added (reactivated)
      const { data: existingSubjects, error } = await supabase
        .from("subjects")
        .select("name, curriculum, division_id, is_active")
        .eq("school_id", user.schoolId)
        .eq("is_active", true);

      if (error) throw error;

      

      // Create a set of existing subject names by division
      // because the unique constraint is on (school_id, name, curriculum, division_id)
      const existingByDivision = new Map<string, Set<string>>();
      existingSubjects?.forEach((s) => {
        const key = `${s.curriculum}::${s.division_id || 'none'}`;
        if (!existingByDivision.has(key)) {
          existingByDivision.set(key, new Set());
        }
        existingByDivision.get(key)!.add(s.name.toLowerCase());
      });

      // Build groups for each division
      const groups: DivisionSubjectGroup[] = [];
      
      for (const division of divisions) {
        // Check existing subjects by division (unique constraint is on school_id, name, curriculum, division_id)
        const existingNames = existingByDivision.get(`${division.curriculum}::${division.id}`) || new Set();
        
        // Try to get system subjects first, fallback to curriculum service
        let availableSubjects: SubjectOption[] = [];
        
        try {
          const systemSubjects = await getSystemSubjectsByDivisionType(
            division.curriculum,
            division.division_type
          );
          
          if (systemSubjects.length > 0) {
            availableSubjects = systemSubjects
              .filter((s) => !existingNames.has(s.name.toLowerCase()))
              .map((s) => ({
                id: s.id,
                name: s.name,
                pathway: s.pathway || undefined,
                isCore: s.pathway === null || s.pathway === "core",
              }));
          }
        } catch (e) {
          console.log("System subjects not available, using defaults");
        }

        // Fallback to curriculum service defaults
        if (availableSubjects.length === 0) {
          const curriculumSubjects = getSubjectsByCurriculum(division.curriculum as Curriculum);
          availableSubjects = curriculumSubjects
            .filter((s) => !existingNames.has(s.name.toLowerCase()))
            .map((s) => ({
              id: s.id,
              name: s.name,
              pathway: s.pathway,
              isCore: s.subjectType === "core",
            }));
        }

        if (availableSubjects.length > 0) {
          groups.push({
            divisionId: division.id,
            divisionName: division.name,
            divisionType: division.division_type,
            curriculum: division.curriculum,
            availableSubjects,
            existingSubjectNames: Array.from(existingNames),
          });
        }
      }

      setDivisionGroups(groups);
      
      // Initialize selection state
      const initialSelection: Record<string, string[]> = {};
      groups.forEach((g) => {
        initialSelection[g.divisionId] = [];
      });
      setSelectedSubjects(initialSelection);
      
      if (groups.length > 0) {
        setActiveTab(groups[0].divisionId);
      }
    } catch (error) {
      console.error("Error loading subject data:", error);
      toast({
        title: "Error",
        description: "Failed to load available subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubject = (divisionId: string, subjectId: string, checked: boolean) => {
    setSelectedSubjects((prev) => {
      const current = prev[divisionId] || [];
      if (checked) {
        return { ...prev, [divisionId]: [...current, subjectId] };
      } else {
        return { ...prev, [divisionId]: current.filter((id) => id !== subjectId) };
      }
    });
  };

  const handleSelectAll = (divisionId: string) => {
    const group = divisionGroups.find((g) => g.divisionId === divisionId);
    if (group) {
      setSelectedSubjects((prev) => ({
        ...prev,
        [divisionId]: group.availableSubjects.map((s) => s.id),
      }));
    }
  };

  const handleDeselectAll = (divisionId: string) => {
    setSelectedSubjects((prev) => ({
      ...prev,
      [divisionId]: [],
    }));
  };

  const getTotalSelectedCount = () => {
    return Object.values(selectedSubjects).reduce((sum, arr) => sum + arr.length, 0);
  };

  const handleAddSubjects = async () => {
    if (!user?.schoolId) return;

    const totalSelected = getTotalSelectedCount();
    if (totalSelected === 0) {
      toast({
        title: "No Subjects Selected",
        description: "Please select at least one subject to add",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // First, check for soft-deleted subjects that can be reactivated
      const { data: allSubjects } = await supabase
        .from("subjects")
        .select("id, name, curriculum, is_active, division_id, pathway, subject_type")
        .eq("school_id", user.schoolId)
        .eq("is_active", false);

      const inactiveByKey = new Map<string, any>();
      allSubjects?.forEach((s) => {
        inactiveByKey.set(`${s.curriculum}::${s.division_id || 'none'}::${s.name.toLowerCase()}`, s);
      });

      const subjectsToInsert: {
        school_id: string;
        name: string;
        curriculum: string;
        division_id: string;
        is_active: boolean;
        subject_type: string;
        pathway: string | null;
      }[] = [];
      const subjectsToReactivate: string[] = [];

      for (const [divisionId, selectedIds] of Object.entries(selectedSubjects)) {
        if (selectedIds.length === 0) continue;

        const group = divisionGroups.find((g) => g.divisionId === divisionId);
        if (!group) continue;

        for (const subjectId of selectedIds) {
          const subject = group.availableSubjects.find((s) => s.id === subjectId);
          if (!subject) continue;

          const subjectType = subject.isCore ? "core" : "optional";
          const pathway = subject.pathway === "core" ? null : (subject.pathway || null);
          const key = `${group.curriculum}::${divisionId}::${subject.name.toLowerCase()}`;

          // Check if this is a soft-deleted subject that can be reactivated
          const inactive = inactiveByKey.get(key);
          if (inactive) {
            subjectsToReactivate.push(inactive.id);
          } else {
            subjectsToInsert.push({
              school_id: user.schoolId,
              name: subject.name,
              curriculum: group.curriculum,
              division_id: divisionId,
              is_active: true,
              subject_type: subjectType,
              pathway: pathway,
            });
          }
        }
      }

      let totalAdded = 0;

      // Reactivate soft-deleted subjects
      if (subjectsToReactivate.length > 0) {
        const { error: reactivateError } = await supabase
          .from("subjects")
          .update({ is_active: true })
          .in("id", subjectsToReactivate);
        if (reactivateError) throw reactivateError;
        totalAdded += subjectsToReactivate.length;
      }

      // Insert new subjects
      if (subjectsToInsert.length > 0) {
        const { data: insertedData, error } = await supabase
          .from("subjects")
          .upsert(subjectsToInsert, { 
            onConflict: "school_id,name,curriculum,division_id",
            ignoreDuplicates: true 
          })
          .select();

        if (error) {
          console.error("Insert error details:", error);
          throw error;
        }
        totalAdded += insertedData?.length || subjectsToInsert.length;
      }

      if (totalAdded === 0) {
        toast({
          title: "No New Subjects",
          description: "All selected subjects already exist in the school",
        });
        return;
      }

      toast({
        title: "Subjects Added",
        description: `Successfully added ${totalAdded} subject(s)`,
      });

      onSubjectsAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding subjects:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add subjects",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCurriculumBadgeColor = (curriculum: string) => {
    switch (curriculum) {
      case "cbc":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cbc-senior":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "8-4-4":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPathwayLabel = (pathway?: string) => {
    if (!pathway || pathway === "core") return null;
    const found = cbcSeniorPathways.find((p) => p.value === pathway);
    return found?.label || pathway;
  };

  // Group subjects by pathway for CBC Senior
  const groupSubjectsByPathway = (subjects: SubjectOption[]) => {
    const coreSubjects = subjects.filter((s) => s.isCore || s.pathway === "core" || !s.pathway);
    const pathwayGroups: Record<string, SubjectOption[]> = {};
    
    cbcSeniorPathways.forEach((p) => {
      pathwayGroups[p.value] = subjects.filter((s) => s.pathway === p.value);
    });

    return { coreSubjects, pathwayGroups };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[800px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Add Subjects from Defaults
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : divisionGroups.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All available default subjects have already been added to your school.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Select subjects from the default list to add to each division.
              </p>
              <Badge variant="secondary">{getTotalSelectedCount()} selected</Badge>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <TabsList className="flex-wrap h-auto mb-4">
                {divisionGroups.map((group) => {
                  const count = selectedSubjects[group.divisionId]?.length || 0;
                  return (
                    <TabsTrigger key={group.divisionId} value={group.divisionId} className="gap-2">
                      {group.divisionName}
                      {count > 0 && (
                        <Badge variant="secondary" className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                          {count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {divisionGroups.map((group) => {
                const selected = selectedSubjects[group.divisionId] || [];
                const isCBCSenior = group.curriculum === "cbc-senior";
                const { coreSubjects, pathwayGroups } = isCBCSenior
                  ? groupSubjectsByPathway(group.availableSubjects)
                  : { coreSubjects: group.availableSubjects, pathwayGroups: {} };

                return (
                  <TabsContent key={group.divisionId} value={group.divisionId} className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 px-3 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {group.divisionName}
                              <Badge className={getCurriculumBadgeColor(group.curriculum)}>
                                {group.curriculum.toUpperCase()}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {group.availableSubjects.length} subjects available to add
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleSelectAll(group.divisionId)}>
                              Select All
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeselectAll(group.divisionId)}>
                              Clear
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col px-3 sm:px-4 pb-4 pt-0">
                        <ScrollArea className="flex-1 min-h-0 pr-2 overscroll-contain">
                          {isCBCSenior ? (
                            <div className="space-y-6">
                              {/* Core subjects */}
                              {coreSubjects.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                                    Core Subjects
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {coreSubjects.map((subject) => (
                                      <SubjectCheckbox
                                        key={subject.id}
                                        subject={subject}
                                        isSelected={selected.includes(subject.id)}
                                        onToggle={(checked) =>
                                          handleToggleSubject(group.divisionId, subject.id, checked)
                                        }
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Pathway subjects */}
                              {cbcSeniorPathways.map((pathway) => {
                                const pathwaySubjects = pathwayGroups[pathway.value] || [];
                                if (pathwaySubjects.length === 0) return null;

                                return (
                                  <div key={pathway.value}>
                                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                                      {pathway.label} Pathway
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {pathwaySubjects.map((subject) => (
                                        <SubjectCheckbox
                                          key={subject.id}
                                          subject={subject}
                                          isSelected={selected.includes(subject.id)}
                                          onToggle={(checked) =>
                                            handleToggleSubject(group.divisionId, subject.id, checked)
                                          }
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {group.availableSubjects.map((subject) => (
                                <SubjectCheckbox
                                  key={subject.id}
                                  subject={subject}
                                  isSelected={selected.includes(subject.id)}
                                  onToggle={(checked) =>
                                    handleToggleSubject(group.divisionId, subject.id, checked)
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </ScrollArea>

                        <div className="mt-4 pt-3 border-t flex items-center justify-between shrink-0">
                          <p className="text-sm text-muted-foreground">
                            Selected: {selected.length} of {group.availableSubjects.length}
                          </p>
                          {selected.length === group.availableSubjects.length && (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              All selected
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSubjects}
            disabled={saving || getTotalSelectedCount() === 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${getTotalSelectedCount()} Subject(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component
function SubjectCheckbox({
  subject,
  isSelected,
  onToggle,
}: {
  subject: SubjectOption;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center space-x-3 p-3 min-h-[44px] rounded-lg border cursor-pointer transition-colors touch-manipulation ${
        isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50 border-transparent"
      }`}
      onClick={() => onToggle(!isSelected)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <span className="text-sm font-medium flex-1">{subject.name}</span>
      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
    </div>
  );
}
