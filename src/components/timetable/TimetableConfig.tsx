import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Clock, Coffee, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface BreakConfig {
  id: string;
  name: string;
  afterPeriod: number;
  durationMinutes: number;
}

export interface SubjectLessonsConfig {
  subject: string;
  lessonsPerWeek: number;
}

export interface TimetableConfiguration {
  startTime: string; // e.g., "08:20"
  lessonDurationMinutes: number;
  lessonsPerDay: number;
  breaks: BreakConfig[];
  subjectLessons: SubjectLessonsConfig[];
}

interface TimetableConfigProps {
  subjects: string[];
  config: TimetableConfiguration;
  onConfigChange: (config: TimetableConfiguration) => void;
  onSave?: () => void;
}

export const TimetableConfig: React.FC<TimetableConfigProps> = ({
  subjects,
  config,
  onConfigChange,
  onSave,
}) => {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState<TimetableConfiguration>(config);

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
    updateConfig({ breaks: localConfig.breaks.filter(b => b.id !== id) });
  };

  const updateBreak = (id: string, updates: Partial<BreakConfig>) => {
    updateConfig({
      breaks: localConfig.breaks.map(b =>
        b.id === id ? { ...b, ...updates } : b
      ),
    });
  };

  const updateSubjectLessons = (subject: string, lessonsPerWeek: number) => {
    const existing = localConfig.subjectLessons.find(s => s.subject === subject);
    if (existing) {
      updateConfig({
        subjectLessons: localConfig.subjectLessons.map(s =>
          s.subject === subject ? { ...s, lessonsPerWeek } : s
        ),
      });
    } else {
      updateConfig({
        subjectLessons: [...localConfig.subjectLessons, { subject, lessonsPerWeek }],
      });
    }
  };

  const getSubjectLessons = (subject: string): number => {
    return localConfig.subjectLessons.find(s => s.subject === subject)?.lessonsPerWeek || 4;
  };

  // Calculate end time for preview
  const calculateEndTime = () => {
    const [hours, minutes] = localConfig.startTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    // Add lesson times
    totalMinutes += localConfig.lessonsPerDay * localConfig.lessonDurationMinutes;
    
    // Add break times
    const totalBreakMinutes = localConfig.breaks.reduce((sum, b) => sum + b.durationMinutes, 0);
    totalMinutes += totalBreakMinutes;
    
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  // Calculate the schedule preview
  const generateSchedulePreview = () => {
    const [hours, minutes] = localConfig.startTime.split(':').map(Number);
    let currentMinutes = hours * 60 + minutes;
    const schedule: Array<{ type: 'lesson' | 'break'; period?: number; name?: string; start: string; end: string }> = [];
    
    for (let period = 1; period <= localConfig.lessonsPerDay; period++) {
      // Add the lesson
      const lessonStart = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      currentMinutes += localConfig.lessonDurationMinutes;
      const lessonEnd = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      
      schedule.push({ type: 'lesson', period, start: lessonStart, end: lessonEnd });
      
      // Check for breaks after this period
      const breakAfter = localConfig.breaks.find(b => b.afterPeriod === period);
      if (breakAfter) {
        const breakStart = lessonEnd;
        currentMinutes += breakAfter.durationMinutes;
        const breakEnd = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
        
        schedule.push({ type: 'break', name: breakAfter.name, start: breakStart, end: breakEnd });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lesson Timing
          </CardTitle>
          <CardDescription>
            Configure when lessons start, how long they last, and how many per day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              School day ends at approximately <strong>{calculateEndTime()}</strong> (including breaks)
            </p>
          </div>
        </CardContent>
      </Card>

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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBreak(breakItem.id)}
                      >
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

      {/* Note about subject allocation being in Subject Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Subject Allocation
          </CardTitle>
          <CardDescription>
            Subject lesson allocations are managed in the Subject Management section. 
            Navigate to Subjects tab to configure how many lessons each subject should have per week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Go to the <strong>Subjects</strong> tab to configure subject lesson allocations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Preview</CardTitle>
          <CardDescription>
            Preview of the daily schedule based on current configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {schedulePreview.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  item.type === 'lesson'
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted border border-muted-foreground/20'
                }`}
              >
                {item.type === 'lesson' ? (
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

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export const getDefaultTimetableConfig = (): TimetableConfiguration => ({
  startTime: "08:20",
  lessonDurationMinutes: 40,
  lessonsPerDay: 8,
  breaks: [
    { id: "1", name: "Short Break", afterPeriod: 3, durationMinutes: 15 },
    { id: "2", name: "Lunch Break", afterPeriod: 5, durationMinutes: 30 },
  ],
  subjectLessons: [],
});
