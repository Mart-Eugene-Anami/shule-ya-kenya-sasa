import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Clock, Coffee, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDivisions } from "@/hooks/useDivisions";
import { SchoolDivision } from "@/services/divisionService";

export interface BreakConfig {
  id: string;
  name: string;
  afterPeriod: number;
  durationMinutes: number;
}

interface DivisionTimetableConfigProps {
  schoolId: string;
}

export const DivisionTimetableConfig: React.FC<DivisionTimetableConfigProps> = ({
  schoolId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { divisions, loading: divisionsLoading } = useDivisions();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("timing");

  // Form state
  const [configName, setConfigName] = useState("");
  const [startTime, setStartTime] = useState("08:20");
  const [lessonDuration, setLessonDuration] = useState(40);
  const [lessonsPerDay, setLessonsPerDay] = useState(8);
  const [freePeriodsPerDay, setFreePeriodsPerDay] = useState(0);
  const [schoolDays, setSchoolDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [breaks, setBreaks] = useState<BreakConfig[]>([
    { id: "1", name: "Short Break", afterPeriod: 3, durationMinutes: 15 },
    { id: "2", name: "Lunch Break", afterPeriod: 5, durationMinutes: 30 },
  ]);

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);

  // Fetch existing config for division
  const { data: existingConfig, isLoading: configLoading } = useQuery({
    queryKey: ["timetableConfig", schoolId, selectedDivisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_configurations")
        .select("*")
        .eq("school_id", schoolId)
        .eq("division_id", selectedDivisionId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && !!selectedDivisionId,
  });

  // Load existing config when available
  useEffect(() => {
    if (existingConfig) {
      setConfigName(existingConfig.name || "");
      setStartTime(existingConfig.start_time || "08:20");
      setLessonDuration(existingConfig.lesson_duration_minutes || 40);
      setLessonsPerDay(existingConfig.lessons_per_day || 8);
      setBreaks((existingConfig.breaks as unknown as BreakConfig[]) || []);
      setSchoolDays((existingConfig.school_days as string[]) || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    } else if (selectedDivision) {
      // Set defaults based on division
      setConfigName(`${selectedDivision.name} Schedule`);
      
      // Set sensible defaults based on division type
      if (selectedDivision.division_type === "lower_primary") {
        setLessonsPerDay(6);
        setLessonDuration(35);
      } else if (selectedDivision.division_type === "upper_primary") {
        setLessonsPerDay(7);
        setLessonDuration(40);
      } else if (selectedDivision.division_type === "junior_secondary" || 
                 selectedDivision.division_type === "senior_secondary" ||
                 selectedDivision.division_type === "8-4-4") {
        setLessonsPerDay(8);
        setLessonDuration(40);
      }
    }
  }, [existingConfig, selectedDivision]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const configData = {
        school_id: schoolId,
        division_id: selectedDivisionId,
        name: configName,
        description: `Timetable configuration for ${selectedDivision?.name}`,
        curriculum_type: selectedDivision?.curriculum,
        start_time: startTime,
        lesson_duration_minutes: lessonDuration,
        lessons_per_day: lessonsPerDay,
        breaks: JSON.parse(JSON.stringify(breaks)),
        subject_lessons: [],
        school_days: schoolDays,
        is_default: true,
        is_active: true,
      };

      if (existingConfig) {
        const { error } = await supabase
          .from("timetable_configurations")
          .update(configData)
          .eq("id", existingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("timetable_configurations")
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetableConfig", schoolId, selectedDivisionId] });
      toast({
        title: "Configuration Saved",
        description: `Timetable settings for ${selectedDivision?.name} have been saved.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Break management
  const addBreak = () => {
    const newBreak: BreakConfig = {
      id: crypto.randomUUID(),
      name: `Break ${breaks.length + 1}`,
      afterPeriod: breaks.length + 2,
      durationMinutes: 15,
    };
    setBreaks([...breaks, newBreak]);
  };

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter((b) => b.id !== id));
  };

  const updateBreak = (id: string, updates: Partial<BreakConfig>) => {
    setBreaks(breaks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  // Calculate end time
  const calculateEndTime = () => {
    const [hours, minutes] = startTime.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;
    totalMinutes += lessonsPerDay * lessonDuration;
    const totalBreakMinutes = breaks.reduce((sum, b) => sum + b.durationMinutes, 0);
    totalMinutes += totalBreakMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  // Generate schedule preview
  const generateSchedulePreview = () => {
    const [hours, minutes] = startTime.split(":").map(Number);
    let currentMinutes = hours * 60 + minutes;
    const schedule: Array<{
      type: "lesson" | "break";
      period?: number;
      name?: string;
      start: string;
      end: string;
    }> = [];

    for (let period = 1; period <= lessonsPerDay; period++) {
      const lessonStart = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;
      currentMinutes += lessonDuration;
      const lessonEnd = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;

      schedule.push({ type: "lesson", period, start: lessonStart, end: lessonEnd });

      const breakAfter = breaks.find((b) => b.afterPeriod === period);
      if (breakAfter) {
        const breakStart = lessonEnd;
        currentMinutes += breakAfter.durationMinutes;
        const breakEnd = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;
        schedule.push({ type: "break", name: breakAfter.name, start: breakStart, end: breakEnd });
      }
    }

    return schedule;
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
        <span>Loading divisions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Division Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Division Timetable Configuration</CardTitle>
          <CardDescription>
            Configure timetable settings for each school division. Each division can have its own schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Select Division</Label>
              <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="Choose a division to configure" />
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
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedDivision.name}</p>
                <p className="text-sm text-muted-foreground">{selectedDivision.description}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDivision.curriculum === "8-4-4" ? "Forms" : "Grades"}{" "}
                  {selectedDivision.grade_level_start} - {selectedDivision.grade_level_end}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      {selectedDivisionId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timing">Lesson Timing</TabsTrigger>
            <TabsTrigger value="breaks">Breaks</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Timing Tab */}
          <TabsContent value="timing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Lesson Timing
                </CardTitle>
                <CardDescription>
                  Configure when lessons start and how long they last for {selectedDivision?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Configuration Name</Label>
                  <Input
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="e.g., Lower Primary Schedule"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Lessons Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lesson Duration (minutes)</Label>
                    <Select
                      value={lessonDuration.toString()}
                      onValueChange={(v) => setLessonDuration(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="35">35 minutes</SelectItem>
                        <SelectItem value="40">40 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="50">50 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lessons Per Day</Label>
                    <Select
                      value={lessonsPerDay.toString()}
                      onValueChange={(v) => setLessonsPerDay(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 lessons</SelectItem>
                        <SelectItem value="6">6 lessons</SelectItem>
                        <SelectItem value="7">7 lessons</SelectItem>
                        <SelectItem value="8">8 lessons</SelectItem>
                        <SelectItem value="9">9 lessons</SelectItem>
                        <SelectItem value="10">10 lessons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Free Periods Per Day</Label>
                    <Select
                      value={freePeriodsPerDay.toString()}
                      onValueChange={(v) => setFreePeriodsPerDay(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1">1 period</SelectItem>
                        <SelectItem value="2">2 periods</SelectItem>
                        <SelectItem value="3">3 periods</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Free periods for study/library time
                    </p>
                  </div>
                </div>

                {/* School Days */}
                <div className="space-y-3">
                  <Label>School Days</Label>
                  <p className="text-xs text-muted-foreground">
                    Select which days of the week the school operates. Most schools use Monday-Friday.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={schoolDays.includes(day)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSchoolDays([...schoolDays, day]);
                            } else {
                              if (schoolDays.length > 1) {
                                setSchoolDays(schoolDays.filter((d) => d !== day));
                              }
                            }
                          }}
                        />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{schoolDays.length} days/week</Badge>
                    <Badge variant="outline">{schoolDays.length * lessonsPerDay} slots/week</Badge>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    School day ends at approximately <strong>{calculateEndTime()}</strong> (including breaks)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breaks Tab */}
          <TabsContent value="breaks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="w-5 h-5" />
                  Breaks
                </CardTitle>
                <CardDescription>
                  Configure break times during the school day
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {breaks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No breaks configured. Add breaks to include them in the timetable.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Break Name</TableHead>
                        <TableHead>After Period</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breaks.map((breakItem) => (
                        <TableRow key={breakItem.id}>
                          <TableCell>
                            <Input
                              value={breakItem.name}
                              onChange={(e) => updateBreak(breakItem.id, { name: e.target.value })}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={breakItem.afterPeriod.toString()}
                              onValueChange={(v) => updateBreak(breakItem.id, { afterPeriod: parseInt(v) })}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: lessonsPerDay - 1 }, (_, i) => i + 1).map((period) => (
                                  <SelectItem key={period} value={period.toString()}>
                                    Period {period}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={5}
                                max={180}
                                value={breakItem.durationMinutes}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    updateBreak(breakItem.id, { durationMinutes: val });
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (isNaN(val) || val < 5) {
                                    updateBreak(breakItem.id, { durationMinutes: 5 });
                                  } else if (val > 180) {
                                    updateBreak(breakItem.id, { durationMinutes: 180 });
                                  }
                                }}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground">min</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => removeBreak(breakItem.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <Button variant="outline" onClick={addBreak}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Break
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Preview</CardTitle>
                <CardDescription>
                  Preview of the daily schedule for {selectedDivision?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {generateSchedulePreview().map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        item.type === "lesson"
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted border border-muted-foreground/20"
                      }`}
                    >
                      {item.type === "lesson" ? (
                        <>
                          <span className="font-medium">P{item.period}</span>
                          <span className="text-muted-foreground">{item.start} - {item.end}</span>
                        </>
                      ) : (
                        <>
                          <Coffee className="w-4 h-4" />
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{item.start} - {item.end}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex justify-end mt-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </Tabs>
      )}
    </div>
  );
};
