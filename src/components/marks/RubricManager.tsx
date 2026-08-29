import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, GraduationCap, Pencil, Trash2, Copy, Eye, PlusCircle, MinusCircle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { rubricService } from "@/services/rubricService";
import { Rubric, RubricGradeRange, DEFAULT_RUBRIC_TEMPLATE, RubricType, RUBRIC_TYPE_LABELS, getRubricTemplate } from "@/types/marks";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface RubricManagerProps {
  onRubricChange?: () => void;
}

// Performance level colors for badges
const LEVEL_COLORS: Record<string, string> = {
  // CBC levels
  EE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ME: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  AE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  BE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  // 8-4-4 levels
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  D: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  E: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  F: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const getLevelColor = (actualLevel: string): string => {
  // Check for exact match first
  if (LEVEL_COLORS[actualLevel]) {
    return LEVEL_COLORS[actualLevel];
  }
  // Then check for prefix (EE1 -> EE, A- -> A, B+ -> B)
  const prefix = actualLevel.replace(/[-+0-9]/g, "");
  return LEVEL_COLORS[prefix] || "bg-muted text-muted-foreground";
};

export const RubricManager: React.FC<RubricManagerProps> = ({ onRubricChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form state
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [rubricName, setRubricName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isMultiSubject, setIsMultiSubject] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [rubricType, setRubricType] = useState<RubricType>('cbc');
  const [gradeRanges, setGradeRanges] = useState<RubricGradeRange[]>(DEFAULT_RUBRIC_TEMPLATE);
  const [rubricToDelete, setRubricToDelete] = useState<Rubric | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.schoolId]);

  const loadData = async () => {
    if (!user?.schoolId) return;
    
    setLoading(true);
    try {
      // Load rubrics and subjects in parallel
      const [rubricsData, subjectsData] = await Promise.all([
        rubricService.getRubrics(user.schoolId),
        supabase
          .from("subjects")
          .select("name")
          .eq("school_id", user.schoolId)
          .eq("is_active", true),
      ]);
      
      setRubrics(rubricsData);
      setSubjects(subjectsData.data?.map(s => s.name) || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load rubrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRubricName("");
    setSelectedSubject("");
    setIsMultiSubject(false);
    setSelectedSubjects([]);
    setRubricType('cbc');
    setGradeRanges([...DEFAULT_RUBRIC_TEMPLATE]);
    setEditingRubric(null);
  };

  const handleRubricTypeChange = (type: RubricType) => {
    setRubricType(type);
    setGradeRanges(getRubricTemplate(type));
  };

  const detectRubricType = (ranges: RubricGradeRange[]): RubricType => {
    // Try to detect rubric type based on grade ranges
    const hasEEME = ranges.some(r => r.actual_level.startsWith('EE') || r.actual_level.startsWith('ME'));
    const has844Grades = ranges.some(r => ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'].includes(r.actual_level));
    
    if (hasEEME) return 'cbc';
    if (has844Grades && ranges.length >= 10) return '844';
    return 'custom';
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setRubricName(rubric.name);
    setSelectedSubject(rubric.subject);
    setIsMultiSubject(rubric.is_multi_subject);
    setSelectedSubjects(rubric.subjects || []);
    const detectedType = detectRubricType(rubric.grade_ranges);
    setRubricType(detectedType);
    setGradeRanges([...rubric.grade_ranges]);
    setShowEditDialog(true);
  };

  const addGradeLevel = () => {
    const lastRange = gradeRanges[gradeRanges.length - 1];
    const newRange: RubricGradeRange = {
      performance_level: "New Level",
      actual_level: "X",
      min_mark: 0,
      max_mark: lastRange ? lastRange.min_mark - 1 : 100,
      points: lastRange ? Math.max(0, lastRange.points - 0.5) : 1.0,
    };
    setGradeRanges([...gradeRanges, newRange]);
  };

  const removeGradeLevel = (index: number) => {
    if (gradeRanges.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "A rubric must have at least one grade level",
        variant: "destructive",
      });
      return;
    }
    setGradeRanges(gradeRanges.filter((_, i) => i !== index));
  };

  const openViewDialog = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setShowViewDialog(true);
  };

  const handleGradeRangeChange = (
    index: number,
    field: keyof RubricGradeRange,
    value: string | number
  ) => {
    const updated = [...gradeRanges];
    if (field === "min_mark" || field === "max_mark") {
      updated[index][field] = Number(value);
    } else if (field === "points") {
      updated[index][field] = parseFloat(value as string);
    } else {
      updated[index][field] = value as string;
    }
    setGradeRanges(updated);
  };

  const handleCreateRubric = async () => {
    if (!user?.schoolId || !user?.id) return;
    
    if (!rubricName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a rubric name", variant: "destructive" });
      return;
    }

    if (isMultiSubject && selectedSubjects.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one subject", variant: "destructive" });
      return;
    }

    if (!isMultiSubject && !selectedSubject) {
      toast({ title: "Validation Error", description: "Please select a subject", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await rubricService.createRubric({
        name: rubricName.trim(),
        subject: isMultiSubject ? selectedSubjects[0] || "Multiple" : selectedSubject,
        school_id: user.schoolId,
        grade_ranges: gradeRanges,
        is_active: true,
        is_multi_subject: isMultiSubject,
        subjects: isMultiSubject ? selectedSubjects : [],
        created_by: user.id,
      });
      
      toast({
        title: "Success",
        description: "Rubric created successfully",
      });
      
      setShowCreateDialog(false);
      resetForm();
      loadData();
      onRubricChange?.();
    } catch (error) {
      console.error("Failed to create rubric:", error);
      toast({
        title: "Error",
        description: "Failed to create rubric",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRubric = async () => {
    if (!editingRubric) return;

    if (!rubricName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a rubric name", variant: "destructive" });
      return;
    }

    if (isMultiSubject && selectedSubjects.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one subject", variant: "destructive" });
      return;
    }

    if (!isMultiSubject && !selectedSubject) {
      toast({ title: "Validation Error", description: "Please select a subject", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await rubricService.updateRubric(editingRubric.id, {
        name: rubricName.trim(),
        subject: isMultiSubject ? selectedSubjects[0] || "Multiple" : selectedSubject,
        grade_ranges: gradeRanges,
        is_multi_subject: isMultiSubject,
        subjects: isMultiSubject ? selectedSubjects : [],
      });
      
      toast({
        title: "Success",
        description: "Rubric updated successfully",
      });
      
      setShowEditDialog(false);
      resetForm();
      loadData();
      onRubricChange?.();
    } catch (error) {
      console.error("Failed to update rubric:", error);
      toast({
        title: "Error",
        description: "Failed to update rubric",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (rubric: Rubric) => {
    try {
      await rubricService.toggleRubricStatus(rubric.id, !rubric.is_active);
      toast({
        title: "Success",
        description: `Rubric ${rubric.is_active ? "deactivated" : "activated"} successfully`,
      });
      loadData();
      onRubricChange?.();
    } catch (error) {
      console.error("Failed to toggle rubric status:", error);
      toast({
        title: "Error",
        description: "Failed to update rubric status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRubric = async () => {
    if (!rubricToDelete) return;

    try {
      await rubricService.deleteRubric(rubricToDelete.id);
      toast({
        title: "Success",
        description: "Rubric deleted successfully",
      });
      setShowDeleteDialog(false);
      setRubricToDelete(null);
      loadData();
      onRubricChange?.();
    } catch (error) {
      console.error("Failed to delete rubric:", error);
      toast({
        title: "Error",
        description: "Failed to delete rubric",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateRubric = async (rubric: Rubric) => {
    if (!user?.schoolId || !user?.id) return;

    try {
      await rubricService.createRubric({
        name: `${rubric.name} (Copy)`,
        subject: rubric.subject,
        school_id: user.schoolId,
        grade_ranges: rubric.grade_ranges,
        is_active: true,
        is_multi_subject: rubric.is_multi_subject,
        subjects: rubric.subjects,
        created_by: user.id,
      });
      
      toast({
        title: "Success",
        description: "Rubric duplicated successfully",
      });
      
      loadData();
      onRubricChange?.();
    } catch (error) {
      console.error("Failed to duplicate rubric:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate rubric",
        variant: "destructive",
      });
    }
  };

  // Group grade ranges by performance level for display
  const groupedRanges = (ranges: RubricGradeRange[]) => {
    const groups: Record<string, RubricGradeRange[]> = {};
    ranges.forEach(range => {
      if (!groups[range.performance_level]) {
        groups[range.performance_level] = [];
      }
      groups[range.performance_level].push(range);
    });
    return groups;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading rubrics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <GraduationCap className="mr-2 h-5 w-5" />
              Grading Rubrics
            </CardTitle>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rubric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rubrics.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No rubrics created yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first rubric using the CBC standard grading template
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Rubric
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rubrics.map(rubric => (
                <div
                  key={rubric.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{rubric.name}</h3>
                      <Badge variant={rubric.is_active ? "default" : "secondary"}>
                        {rubric.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {rubric.is_multi_subject && (
                        <Badge variant="outline" className="text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Multi-Subject
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rubric.is_multi_subject 
                        ? `Subjects: ${rubric.subjects.join(", ")}` 
                        : `Subject: ${rubric.subject}`} • {rubric.grade_ranges.length} grade levels
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rubric.is_active}
                      onCheckedChange={() => handleToggleStatus(rubric)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openViewDialog(rubric)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(rubric)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicateRubric(rubric)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setRubricToDelete(rubric);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Rubric</DialogTitle>
          </DialogHeader>
          <RubricForm
            rubricName={rubricName}
            setRubricName={setRubricName}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            isMultiSubject={isMultiSubject}
            setIsMultiSubject={setIsMultiSubject}
            selectedSubjects={selectedSubjects}
            setSelectedSubjects={setSelectedSubjects}
            rubricType={rubricType}
            onRubricTypeChange={handleRubricTypeChange}
            gradeRanges={gradeRanges}
            onGradeRangeChange={handleGradeRangeChange}
            onAddGradeLevel={addGradeLevel}
            onRemoveGradeLevel={removeGradeLevel}
            subjects={subjects}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRubric} disabled={saving}>
              {saving ? "Creating..." : "Create Rubric"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rubric</DialogTitle>
          </DialogHeader>
          <RubricForm
            rubricName={rubricName}
            setRubricName={setRubricName}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            isMultiSubject={isMultiSubject}
            setIsMultiSubject={setIsMultiSubject}
            selectedSubjects={selectedSubjects}
            setSelectedSubjects={setSelectedSubjects}
            rubricType={rubricType}
            onRubricTypeChange={handleRubricTypeChange}
            gradeRanges={gradeRanges}
            onGradeRangeChange={handleGradeRangeChange}
            onAddGradeLevel={addGradeLevel}
            onRemoveGradeLevel={removeGradeLevel}
            subjects={subjects}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRubric} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRubric?.name}</DialogTitle>
          </DialogHeader>
          {editingRubric && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {editingRubric.is_multi_subject 
                  ? `Subjects: ${editingRubric.subjects.join(", ")}` 
                  : `Subject: ${editingRubric.subject}`}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Performance Level</TableHead>
                    <TableHead>Actual Level</TableHead>
                    <TableHead>Raw Marks</TableHead>
                    <TableHead>Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingRubric.grade_ranges.map((range, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{range.performance_level}</TableCell>
                      <TableCell>
                        <Badge className={getLevelColor(range.actual_level)}>
                          {range.actual_level}
                        </Badge>
                      </TableCell>
                      <TableCell>{range.min_mark} - {range.max_mark}</TableCell>
                      <TableCell>{range.points.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rubric</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rubricToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRubricToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRubric} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Sub-component for the rubric form
interface RubricFormProps {
  rubricName: string;
  setRubricName: (name: string) => void;
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  isMultiSubject: boolean;
  setIsMultiSubject: (v: boolean) => void;
  selectedSubjects: string[];
  setSelectedSubjects: (subjects: string[]) => void;
  rubricType: RubricType;
  onRubricTypeChange: (type: RubricType) => void;
  gradeRanges: RubricGradeRange[];
  onGradeRangeChange: (index: number, field: keyof RubricGradeRange, value: string | number) => void;
  onAddGradeLevel: () => void;
  onRemoveGradeLevel: (index: number) => void;
  subjects: string[];
}

const RubricForm: React.FC<RubricFormProps> = ({
  rubricName,
  setRubricName,
  selectedSubject,
  setSelectedSubject,
  isMultiSubject,
  setIsMultiSubject,
  selectedSubjects,
  setSelectedSubjects,
  rubricType,
  onRubricTypeChange,
  gradeRanges,
  onGradeRangeChange,
  onAddGradeLevel,
  onRemoveGradeLevel,
  subjects,
}) => {
  const isCustom = rubricType === 'custom';

  const toggleSubjectInList = (subject: string) => {
    setSelectedSubjects(
      selectedSubjects.includes(subject)
        ? selectedSubjects.filter(s => s !== subject)
        : [...selectedSubjects, subject]
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rubric-name">Rubric Name</Label>
          <Input
            id="rubric-name"
            value={rubricName}
            onChange={(e) => setRubricName(e.target.value)}
            placeholder="e.g., Mathematics Rubric"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rubric-type">Rubric Type</Label>
          <Select value={rubricType} onValueChange={(v) => onRubricTypeChange(v as RubricType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cbc">CBE (Competency Based)</SelectItem>
              <SelectItem value="844">8-4-4 (Traditional)</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 flex items-end">
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="multi-subject"
              checked={isMultiSubject}
              onCheckedChange={setIsMultiSubject}
            />
            <Label htmlFor="multi-subject" className="text-sm cursor-pointer">
              Apply to multiple subjects
            </Label>
          </div>
        </div>
      </div>

      {!isMultiSubject ? (
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Select Subjects</Label>
          <p className="text-xs text-muted-foreground">
            This rubric will be used as a fallback for these subjects when no individual subject rubric exists.
          </p>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
            {subjects.map(subject => (
              <div key={subject} className="flex items-center gap-2">
                <Checkbox
                  id={`subj-${subject}`}
                  checked={selectedSubjects.includes(subject)}
                  onCheckedChange={() => toggleSubjectInList(subject)}
                />
                <Label htmlFor={`subj-${subject}`} className="text-sm cursor-pointer font-normal">
                  {subject}
                </Label>
              </div>
            ))}
          </div>
          {selectedSubjects.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label>Grade Ranges</Label>
            <p className="text-sm text-muted-foreground">
              {rubricType === 'cbc' && "CBE standard with performance levels (EE, ME, AE, BE)."}
              {rubricType === '844' && "8-4-4 traditional grading (A to E)."}
              {rubricType === 'custom' && "Fully customizable grade levels. Add, remove, and edit as needed."}
            </p>
          </div>
          {isCustom && (
            <Button variant="outline" size="sm" onClick={onAddGradeLevel}>
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Level
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Performance Level</TableHead>
              <TableHead className="w-[100px]">Grade</TableHead>
              <TableHead className="w-[100px]">Min Mark</TableHead>
              <TableHead className="w-[100px]">Max Mark</TableHead>
              <TableHead className="w-[100px]">Points</TableHead>
              {isCustom && <TableHead className="w-[60px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {gradeRanges.map((range, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {isCustom ? (
                    <Input
                      value={range.performance_level}
                      onChange={(e) => onGradeRangeChange(idx, "performance_level", e.target.value)}
                      placeholder="Level name"
                      className="w-full"
                    />
                  ) : (
                    <span className="font-medium text-sm">{range.performance_level}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isCustom ? (
                    <Input
                      value={range.actual_level}
                      onChange={(e) => onGradeRangeChange(idx, "actual_level", e.target.value)}
                      placeholder="Grade"
                      className="w-20"
                    />
                  ) : (
                    <Badge className={getLevelColor(range.actual_level)}>
                      {range.actual_level}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={range.min_mark}
                    onChange={(e) => onGradeRangeChange(idx, "min_mark", e.target.value)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={range.max_mark}
                    onChange={(e) => onGradeRangeChange(idx, "max_mark", e.target.value)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={15}
                    value={range.points}
                    onChange={(e) => onGradeRangeChange(idx, "points", e.target.value)}
                    className="w-20"
                  />
                </TableCell>
                {isCustom && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveGradeLevel(idx)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
