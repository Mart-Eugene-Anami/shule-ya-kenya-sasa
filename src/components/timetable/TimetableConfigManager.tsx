import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Copy, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Grade } from "@/types";
import { TimetableConfig, TimetableConfiguration, getDefaultTimetableConfig, BreakConfig, SubjectLessonsConfig } from "./TimetableConfig";

interface SavedTimetableConfig {
  id: string;
  name: string;
  description: string | null;
  curriculum_type: string | null;
  applicable_grades: string[];
  start_time: string;
  lesson_duration_minutes: number;
  lessons_per_day: number;
  breaks: BreakConfig[];
  subject_lessons: SubjectLessonsConfig[];
  is_default: boolean;
  is_active: boolean;
}

interface TimetableConfigManagerProps {
  subjects: string[];
  grades: Grade[];
  curriculumTypes: string[];
  schoolId: string;
}

export const TimetableConfigManager: React.FC<TimetableConfigManagerProps> = ({
  subjects,
  grades,
  curriculumTypes,
  schoolId,
}) => {
  const { toast } = useToast();
  const [configurations, setConfigurations] = useState<SavedTimetableConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<SavedTimetableConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for new/editing config
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCurriculum, setFormCurriculum] = useState<string>("");
  const [formGrades, setFormGrades] = useState<string[]>([]);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formConfig, setFormConfig] = useState<TimetableConfiguration>(getDefaultTimetableConfig());

  useEffect(() => {
    if (schoolId) {
      fetchConfigurations();
    }
  }, [schoolId]);

  const fetchConfigurations = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timetable_configurations')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');

      if (error) throw error;
      
      // Map data to our interface with proper type handling
      const mappedData: SavedTimetableConfig[] = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        curriculum_type: d.curriculum_type,
        applicable_grades: d.applicable_grades || [],
        start_time: d.start_time,
        lesson_duration_minutes: d.lesson_duration_minutes,
        lessons_per_day: d.lessons_per_day,
        breaks: Array.isArray(d.breaks) ? (d.breaks as unknown as BreakConfig[]) : [],
        subject_lessons: Array.isArray(d.subject_lessons) ? (d.subject_lessons as unknown as SubjectLessonsConfig[]) : [],
        is_default: d.is_default || false,
        is_active: d.is_active !== false,
      }));
      
      setConfigurations(mappedData);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast({
        title: "Error",
        description: "Failed to load timetable configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setEditingConfig(null);
    setFormName("");
    setFormDescription("");
    setFormCurriculum("");
    setFormGrades([]);
    setFormIsDefault(false);
    setFormConfig(getDefaultTimetableConfig());
    setIsDialogOpen(true);
  };

  const openEditDialog = (config: SavedTimetableConfig) => {
    setIsCreating(false);
    setEditingConfig(config);
    setFormName(config.name);
    setFormDescription(config.description || "");
    setFormCurriculum(config.curriculum_type || "");
    setFormGrades(config.applicable_grades || []);
    setFormIsDefault(config.is_default);
    setFormConfig({
      startTime: config.start_time,
      lessonDurationMinutes: config.lesson_duration_minutes,
      lessonsPerDay: config.lessons_per_day,
      breaks: config.breaks || [],
      subjectLessons: config.subject_lessons || [],
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!schoolId) return;
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a configuration name",
        variant: "destructive",
      });
      return;
    }

    try {
      const configData = {
        school_id: schoolId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        curriculum_type: formCurriculum || null,
        applicable_grades: formGrades,
        start_time: formConfig.startTime,
        lesson_duration_minutes: formConfig.lessonDurationMinutes,
        lessons_per_day: formConfig.lessonsPerDay,
        breaks: JSON.parse(JSON.stringify(formConfig.breaks)),
        subject_lessons: JSON.parse(JSON.stringify(formConfig.subjectLessons)),
        is_default: formIsDefault,
      };

      if (isCreating) {
        const { error } = await supabase
          .from('timetable_configurations')
          .insert(configData);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Configuration created successfully",
        });
      } else if (editingConfig) {
        const { error } = await supabase
          .from('timetable_configurations')
          .update(configData)
          .eq('id', editingConfig.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
      }

      setIsDialogOpen(false);
      fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('timetable_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      });
      fetchConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    }
  };

  const duplicateConfig = async (config: SavedTimetableConfig) => {
    if (!schoolId) return;

    try {
      const { error } = await supabase
        .from('timetable_configurations')
        .insert({
          school_id: schoolId,
          name: `${config.name} (Copy)`,
          description: config.description,
          curriculum_type: config.curriculum_type,
          applicable_grades: config.applicable_grades,
          start_time: config.start_time,
          lesson_duration_minutes: config.lesson_duration_minutes,
          lessons_per_day: config.lessons_per_day,
          breaks: JSON.parse(JSON.stringify(config.breaks)),
          subject_lessons: JSON.parse(JSON.stringify(config.subject_lessons)),
          is_default: false,
        });

      if (error) throw error;
      toast({
        title: "Success",
        description: "Configuration duplicated successfully",
      });
      fetchConfigurations();
    } catch (error) {
      console.error('Error duplicating configuration:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate configuration",
        variant: "destructive",
      });
    }
  };

  const toggleGrade = (gradeName: string) => {
    setFormGrades(prev =>
      prev.includes(gradeName)
        ? prev.filter(g => g !== gradeName)
        : [...prev, gradeName]
    );
  };

  const getCurriculumLabel = (curriculum: string | null) => {
    if (!curriculum) return "All Curricula";
    return curriculum.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Timetable Configurations
              </CardTitle>
              <CardDescription>
                Create different configurations for different grade levels or curricula
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              New Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No configurations yet</h3>
              <p className="text-muted-foreground mb-4">
                Create configurations for different grade levels like Lower Primary, Upper Primary, or Secondary
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Configuration
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Curriculum</TableHead>
                  <TableHead>Applicable Grades</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configurations.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{config.name}</p>
                        {config.description && (
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCurriculumLabel(config.curriculum_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.applicable_grades.length === 0 ? (
                        <span className="text-muted-foreground">All grades</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {config.applicable_grades.slice(0, 3).map((grade) => (
                            <Badge key={grade} variant="secondary" className="text-xs">
                              {grade}
                            </Badge>
                          ))}
                          {config.applicable_grades.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{config.applicable_grades.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{config.start_time} start</p>
                        <p className="text-muted-foreground">
                          {config.lessons_per_day} lessons × {config.lesson_duration_minutes}min
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {config.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                        {config.is_active ? (
                          <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(config)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateConfig(config)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Create New Configuration" : "Edit Configuration"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="configName">Configuration Name *</Label>
                    <Input
                      id="configName"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Lower Primary Schedule"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="curriculum">Curriculum Type</Label>
                    <Select value={formCurriculum || "all"} onValueChange={(val) => setFormCurriculum(val === "all" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All curricula" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All curricula</SelectItem>
                        {curriculumTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of this configuration"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isDefault"
                    checked={formIsDefault}
                    onCheckedChange={(checked) => setFormIsDefault(!!checked)}
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as default configuration
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Applicable Grades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applicable Grades</CardTitle>
                <CardDescription>
                  Select which grades this configuration applies to. Leave empty to apply to all grades.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {grades.map((grade) => (
                    <div
                      key={grade.id}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                        formGrades.includes(grade.name)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleGrade(grade.name)}
                    >
                      <Checkbox
                        checked={formGrades.includes(grade.name)}
                        onCheckedChange={() => toggleGrade(grade.name)}
                      />
                      <span className="text-sm">{grade.name}</span>
                    </div>
                  ))}
                </div>
                {grades.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No grades available. Create grades first.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timetable Config */}
            <TimetableConfig
              subjects={subjects}
              config={formConfig}
              onConfigChange={setFormConfig}
            />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {isCreating ? "Create Configuration" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
