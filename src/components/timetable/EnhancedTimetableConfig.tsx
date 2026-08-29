import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Clock, Coffee, BookOpen, AlertTriangle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SubjectConfig, Pathway } from "@/types/timetable";

export interface BreakConfig {
  id: string;
  name: string;
  afterPeriod: number;
  durationMinutes: number;
}

export interface SubjectLessonsConfig {
  subject: string;
  lessonsPerWeek: number;
  isOptional?: boolean;
  pathway?: Pathway;
}

export interface TimetableConfiguration {
  startTime: string;
  lessonDurationMinutes: number;
  lessonsPerDay: number;
  breaks: BreakConfig[];
  subjectLessons: SubjectLessonsConfig[];
  freePeriodsPerDay?: number;
  teacherMaxLessonsDefault?: number;
}

interface EnhancedTimetableConfigProps {
  subjects: string[];
  subjectConfigs?: SubjectConfig[];
  config: TimetableConfiguration;
  onConfigChange: (config: TimetableConfiguration) => void;
  onSave?: () => void;
  showPathways?: boolean;
  curriculum?: string;
}

export const EnhancedTimetableConfig: React.FC<EnhancedTimetableConfigProps> = ({
  subjects,
  subjectConfigs = [],
  config,
  onConfigChange,
  onSave,
  showPathways = false,
  curriculum = "cbc",
}) => {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState<TimetableConfiguration>(config);
  const [activeTab, setActiveTab] = useState("timing");

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const updateConfig = (updates: Partial<TimetableConfiguration>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const addBreak = () => {
    const newBreak: BreakConfig = {
      id: crypto.randomUUID(),
      name: `Break ${localConfig.breaks.length + 1}`,
      afterPeriod: localConfig.breaks.length + 2,
      durationMinutes: 15,
    };
    updateConfig({ breaks: [...localConfig.breaks, newBreak] });
  };

  const removeBreak = (id: string) => {
    updateConfig({ breaks: localConfig.breaks.filter((b) => b.id !== id) });
  };

  const updateBreak = (id: string, updates: Partial<BreakConfig>) => {
    updateConfig({
      breaks: localConfig.breaks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    });
  };

  const updateSubjectLessons = (subject: string, lessonsPerWeek: number, isOptional?: boolean, pathway?: Pathway) => {
    const existing = localConfig.subjectLessons.find((s) => s.subject === subject);
    if (existing) {
      updateConfig({
        subjectLessons: localConfig.subjectLessons.map((s) =>
          s.subject === subject ? { ...s, lessonsPerWeek, isOptional, pathway } : s
        ),
      });
    } else {
      updateConfig({
        subjectLessons: [...localConfig.subjectLessons, { subject, lessonsPerWeek, isOptional, pathway }],
      });
    }
  };

  const getSubjectLessons = (subject: string): SubjectLessonsConfig => {
    return (
      localConfig.subjectLessons.find((s) => s.subject === subject) || {
        subject,
        lessonsPerWeek: 4,
        isOptional: false,
      }
    );
  };

  // Get subject config from enhanced subjects
  const getSubjectConfig = (subjectName: string): SubjectConfig | undefined => {
    return subjectConfigs.find((s) => s.name === subjectName);
  };

  // Calculate end time for preview
  const calculateEndTime = () => {
    const [hours, minutes] = localConfig.startTime.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;

    // Add lesson times
    totalMinutes += localConfig.lessonsPerDay * localConfig.lessonDurationMinutes;

    // Add break times
    const totalBreakMinutes = localConfig.breaks.reduce((sum, b) => sum + b.durationMinutes, 0);
    totalMinutes += totalBreakMinutes;

    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;

    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  // Calculate total lessons and validate
  const calculateTotalLessons = () => {
    let total = 0;
    localConfig.subjectLessons.forEach((sl) => {
      if (!sl.isOptional) {
        total += sl.lessonsPerWeek;
      }
    });
    return total;
  };

  const totalSlotsPerWeek = localConfig.lessonsPerDay * 5;
  const totalCoreLessons = calculateTotalLessons();
  const freeSlots = totalSlotsPerWeek - totalCoreLessons;

  // Generate schedule preview
  const generateSchedulePreview = () => {
    const [hours, minutes] = localConfig.startTime.split(":").map(Number);
    let currentMinutes = hours * 60 + minutes;
    const schedule: Array<{
      type: "lesson" | "break" | "free";
      period?: number;
      name?: string;
      start: string;
      end: string;
    }> = [];

    for (let period = 1; period <= localConfig.lessonsPerDay; period++) {
      const lessonStart = `${Math.floor(currentMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;
      currentMinutes += localConfig.lessonDurationMinutes;
      const lessonEnd = `${Math.floor(currentMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;

      schedule.push({ type: "lesson", period, start: lessonStart, end: lessonEnd });

      // Check for breaks after this period
      const breakAfter = localConfig.breaks.find((b) => b.afterPeriod === period);
      if (breakAfter) {
        const breakStart = lessonEnd;
        currentMinutes += breakAfter.durationMinutes;
        const breakEnd = `${Math.floor(currentMinutes / 60)
          .toString()
          .padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;

        schedule.push({ type: "break", name: breakAfter.name, start: breakStart, end: breakEnd });
      }
    }

    return schedule;
  };

  const handleSave = () => {
    toast({
      title: "Configuration Saved",
      description: "Timetable configuration has been saved successfully.",
    });
    onSave?.();
  };

  const schedulePreview = generateSchedulePreview();

  // Separate core and optional subjects
  const coreSubjects = subjects.filter((s) => {
    const cfg = getSubjectConfig(s);
    return !cfg || cfg.subjectType === "core";
  });

  const optionalSubjects = subjects.filter((s) => {
    const cfg = getSubjectConfig(s);
    return cfg && (cfg.subjectType === "optional" || cfg.subjectType === "elective");
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="breaks">Breaks</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
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
              <CardDescription>Configure when lessons start, how long they last, and how many per day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Lessons Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={localConfig.startTime}
                    onChange={(e) => updateConfig({ startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonDuration">Lesson Duration (minutes)</Label>
                  <Select
                    value={localConfig.lessonDurationMinutes.toString()}
                    onValueChange={(v) => updateConfig({ lessonDurationMinutes: parseInt(v) })}
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
                  <Label htmlFor="lessonsPerDay">Lessons Per Day</Label>
                  <Select
                    value={localConfig.lessonsPerDay.toString()}
                    onValueChange={(v) => updateConfig({ lessonsPerDay: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="freePeriodsPerDay">Free Periods Per Day</Label>
                  <Select
                    value={(localConfig.freePeriodsPerDay || 0).toString()}
                    onValueChange={(v) => updateConfig({ freePeriodsPerDay: parseInt(v) })}
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

                <div className="space-y-2">
                  <Label htmlFor="teacherMax">Default Teacher Max Lessons/Week</Label>
                  <Select
                    value={(localConfig.teacherMaxLessonsDefault || 30).toString()}
                    onValueChange={(v) => updateConfig({ teacherMaxLessonsDefault: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 lessons</SelectItem>
                      <SelectItem value="25">25 lessons</SelectItem>
                      <SelectItem value="30">30 lessons</SelectItem>
                      <SelectItem value="35">35 lessons</SelectItem>
                      <SelectItem value="40">40 lessons</SelectItem>
                    </SelectContent>
                  </Select>
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
              <CardDescription>Configure break times during the school day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localConfig.breaks.length === 0 ? (
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
                    {localConfig.breaks.map((breakItem) => (
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
                              {Array.from({ length: localConfig.lessonsPerDay - 1 }, (_, i) => i + 1).map((period) => (
                                <SelectItem key={period} value={period.toString()}>
                                  Period {period}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={breakItem.durationMinutes.toString()}
                            onValueChange={(v) => updateBreak(breakItem.id, { durationMinutes: parseInt(v) })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 min</SelectItem>
                              <SelectItem value="15">15 min</SelectItem>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="45">45 min</SelectItem>
                              <SelectItem value="60">60 min</SelectItem>
                            </SelectContent>
                          </Select>
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

        {/* Subjects Tab */}
        <TabsContent value="subjects">
          <div className="space-y-6">
            {/* Capacity Warning */}
            {totalCoreLessons > totalSlotsPerWeek && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Over Capacity</p>
                  <p className="text-sm text-muted-foreground">
                    Core subjects require {totalCoreLessons} lessons/week but only {totalSlotsPerWeek} slots are
                    available. Reduce lessons per subject or increase lessons per day.
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalSlotsPerWeek}</div>
                  <p className="text-sm text-muted-foreground">Total Weekly Slots</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalCoreLessons}</div>
                  <p className="text-sm text-muted-foreground">Core Subject Lessons</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.max(0, freeSlots - (localConfig.freePeriodsPerDay || 0) * 5)}
                  </div>
                  <p className="text-sm text-muted-foreground">Available for Optional</p>
                </CardContent>
              </Card>
            </div>

            {/* Core Subjects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Core Subject Allocation
                </CardTitle>
                <CardDescription>Set lessons per week for core subjects (required for all students)</CardDescription>
              </CardHeader>
              <CardContent>
                {coreSubjects.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No core subjects configured.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coreSubjects.map((subject) => {
                      const subjectLesson = getSubjectLessons(subject);
                      const subjectCfg = getSubjectConfig(subject);
                      return (
                        <div key={subject} className="flex items-center gap-3 p-3 border rounded-lg">
                          <span className="flex-1 font-medium text-sm">{subject}</span>
                          <Select
                            value={subjectLesson.lessonsPerWeek.toString()}
                            onValueChange={(v) => updateSubjectLessons(subject, parseInt(v), false)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.min(subjectCfg?.maxLessonsPerWeek || 10, 10) }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n} /week
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optional Subjects */}
            {optionalSubjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Optional Subject Allocation
                  </CardTitle>
                  <CardDescription>
                    Set lessons per week for optional subjects (based on student pathways)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {optionalSubjects.map((subject) => {
                      const subjectLesson = getSubjectLessons(subject);
                      const subjectCfg = getSubjectConfig(subject);
                      return (
                        <div key={subject} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{subject}</span>
                            {subjectCfg?.pathway && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {subjectCfg.pathway.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                          <Select
                            value={subjectLesson.lessonsPerWeek.toString()}
                            onValueChange={(v) =>
                              updateSubjectLessons(subject, parseInt(v), true, subjectCfg?.pathway)
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.min(subjectCfg?.maxLessonsPerWeek || 8, 8) }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n} /week
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Preview</CardTitle>
              <CardDescription>Preview of the daily schedule based on current configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {schedulePreview.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      item.type === "lesson"
                        ? "bg-primary/10 border border-primary/20"
                        : item.type === "break"
                        ? "bg-muted border border-muted-foreground/20"
                        : "bg-accent/50 border border-accent"
                    }`}
                  >
                    {item.type === "lesson" ? (
                      <>
                        <span className="font-medium">P{item.period}</span>
                        <span className="text-muted-foreground">
                          {item.start} - {item.end}
                        </span>
                      </>
                    ) : item.type === "break" ? (
                      <>
                        <Coffee className="w-4 h-4" />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {item.start} - {item.end}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Free</span>
                        <span className="text-muted-foreground">
                          {item.start} - {item.end}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
};

// Legacy export for backward compatibility
export { EnhancedTimetableConfig as TimetableConfig };

export const getDefaultTimetableConfig = (): TimetableConfiguration => ({
  startTime: "08:20",
  lessonDurationMinutes: 40,
  lessonsPerDay: 8,
  breaks: [
    { id: "1", name: "Short Break", afterPeriod: 3, durationMinutes: 15 },
    { id: "2", name: "Lunch Break", afterPeriod: 5, durationMinutes: 30 },
  ],
  subjectLessons: [],
  freePeriodsPerDay: 0,
  teacherMaxLessonsDefault: 30,
});
