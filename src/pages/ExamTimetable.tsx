import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDataQuery } from "@/hooks/useDataQuery";
import { examTimetableService, ExamTimetableSlot, SlotConfig } from "@/services/examTimetableService";
import { Exam, Grade } from "@/types";
import { ArrowLeft, Plus, Trash2, Wand2, Calendar, Clock, Users, Building2, UserCheck } from "lucide-react";

const ExamTimetable = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [timetable, setTimetable] = useState<ExamTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Slot config state
  const [numDays, setNumDays] = useState(3);
  const [slotsPerDay, setSlotsPerDay] = useState(2);
  const [defaultStartTime, setDefaultStartTime] = useState("08:00");
  const [defaultDuration, setDefaultDuration] = useState(120); // minutes
  const [defaultBreak, setDefaultBreak] = useState(30); // minutes
  const [allowConcurrent, setAllowConcurrent] = useState(true);

  // Entry dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [entrySubject, setEntrySubject] = useState("");
  const [entryRoomId, setEntryRoomId] = useState("");
  const [entryInvigilatorId, setEntryInvigilatorId] = useState("");
  const [entryGradeIds, setEntryGradeIds] = useState<string[]>([]);
  const [entryConcurrent, setEntryConcurrent] = useState(false);

  // Fetch exam details
  const { data: exams = [] } = useDataQuery<Exam>({
    tableName: 'exams',
    schoolId: user?.schoolId,
  });
  const exam = exams.find(e => e.id === examId);

  const { data: grades = [] } = useDataQuery<Grade>({
    tableName: 'grades',
    schoolId: user?.schoolId,
    orderBy: 'level',
    orderDirection: 'asc',
  });

  const { data: rooms = [] } = useDataQuery<{ id: string; name: string }>({
    tableName: 'rooms',
    schoolId: user?.schoolId,
    orderBy: 'name',
  });

  const { data: teachers = [] } = useDataQuery<{ id: string; name: string }>({
    tableName: 'teachers',
    schoolId: user?.schoolId,
    orderBy: 'name',
  });

  const loadTimetable = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const data = await examTimetableService.getExamTimetable(examId);
      setTimetable(data);
    } catch (err) {
      console.error('Failed to load exam timetable:', err);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const generateSlotConfigs = (): SlotConfig[] => {
    const configs: SlotConfig[] = [];
    for (let day = 1; day <= numDays; day++) {
      let currentMinutes = parseInt(defaultStartTime.split(':')[0]) * 60 + parseInt(defaultStartTime.split(':')[1]);
      for (let slot = 1; slot <= slotsPerDay; slot++) {
        const startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        const startM = (currentMinutes % 60).toString().padStart(2, '0');
        const endMinutes = currentMinutes + defaultDuration;
        const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0');
        const endM = (endMinutes % 60).toString().padStart(2, '0');

        configs.push({
          dayNumber: day,
          dayLabel: `Day ${day}`,
          slotNumber: slot,
          startTime: `${startH}:${startM}`,
          endTime: `${endH}:${endM}`,
        });

        currentMinutes = endMinutes + defaultBreak;
      }
    }
    return configs;
  };

  const handleAutoGenerate = async () => {
    if (!examId || !user?.schoolId || !exam) return;
    setGenerating(true);
    try {
      const slots = generateSlotConfigs();
      const result = await examTimetableService.autoGenerate({
        examId,
        schoolId: user.schoolId,
        slots,
        subjects: exam.subjects,
        gradeIds: exam.grades,
        allowConcurrent,
      });

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast({ title: "Warning", description: w }));
      }

      toast({
        title: result.success ? "Timetable Generated" : "Generation Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

      await loadTimetable();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to generate timetable", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleClearTimetable = async () => {
    if (!examId) return;
    try {
      await examTimetableService.clearTimetable(examId);
      setTimetable([]);
      toast({ title: "Cleared", description: "Exam timetable has been cleared." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to clear timetable", variant: "destructive" });
    }
  };

  const openAddEntry = (slotId: string) => {
    setSelectedSlotId(slotId);
    setEntrySubject("");
    setEntryRoomId("");
    setEntryInvigilatorId("");
    setEntryGradeIds(exam?.grades || []);
    setEntryConcurrent(false);
    setEntryDialogOpen(true);
  };

  const handleAddEntry = async () => {
    if (!entrySubject || !examId || !user?.schoolId) return;
    try {
      await examTimetableService.addEntry({
        slotId: selectedSlotId,
        examId,
        schoolId: user.schoolId,
        subject: entrySubject,
        gradeIds: entryGradeIds,
        roomId: entryRoomId || undefined,
        invigilatorId: entryInvigilatorId || undefined,
        isConcurrent: entryConcurrent,
      });
      setEntryDialogOpen(false);
      toast({ title: "Entry Added", description: `${entrySubject} added to slot.` });
      await loadTimetable();
    } catch (err) {
      toast({ title: "Error", description: "Failed to add entry", variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await examTimetableService.deleteEntry(entryId);
      toast({ title: "Deleted", description: "Entry removed." });
      await loadTimetable();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    }
  };

  const getGradeName = (id: string) => grades.find(g => g.id === id)?.name || id;

  // Group timetable by day
  const dayGroups = timetable.reduce((acc, slot) => {
    const day = slot.dayNumber;
    if (!acc[day]) acc[day] = { label: slot.dayLabel || `Day ${day}`, slots: [] };
    acc[day].slots.push(slot);
    return acc;
  }, {} as Record<number, { label: string; slots: ExamTimetableSlot[] }>);

  if (!exam) {
    return (
      <DashboardLayout title="Exam Timetable">
        <div className="text-center py-12 text-muted-foreground">
          {loading ? "Loading..." : "Exam not found."}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Exam Timetable: ${exam.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Exams
          </Button>
        </div>

        <Tabs defaultValue={timetable.length > 0 ? "view" : "configure"}>
          <TabsList>
            <TabsTrigger value="configure">Configure & Generate</TabsTrigger>
            <TabsTrigger value="view">View Timetable</TabsTrigger>
          </TabsList>

          {/* Configure Tab */}
          <TabsContent value="configure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Slot Configuration
                </CardTitle>
                <CardDescription>
                  Define the time structure for exam days. The system will allocate subjects to slots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>Number of Days</Label>
                    <Input type="number" min={1} max={30} value={numDays} onChange={e => setNumDays(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Slots per Day</Label>
                    <Input type="number" min={1} max={6} value={slotsPerDay} onChange={e => setSlotsPerDay(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Time</Label>
                    <Input type="time" value={defaultStartTime} onChange={e => setDefaultStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Duration (mins)</Label>
                    <Input type="number" min={30} max={300} value={defaultDuration} onChange={e => setDefaultDuration(parseInt(e.target.value) || 120)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>Break (mins)</Label>
                    <Input type="number" min={0} max={120} value={defaultBreak} onChange={e => setDefaultBreak(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Checkbox
                      id="concurrent"
                      checked={allowConcurrent}
                      onCheckedChange={(v) => setAllowConcurrent(!!v)}
                    />
                    <Label htmlFor="concurrent" className="text-sm">Allow concurrent subjects</Label>
                  </div>
                </div>

                {/* Preview */}
                <div className="border rounded-md p-3 bg-muted/30">
                  <p className="text-sm font-medium mb-2">Preview: {numDays} days × {slotsPerDay} slots = {numDays * slotsPerDay} total slots for {exam.subjects.length} subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {generateSlotConfigs().slice(0, 10).map((s, i) => (
                      <Badge key={i} variant="outline">
                        {s.dayLabel} S{s.slotNumber}: {s.startTime}-{s.endTime}
                      </Badge>
                    ))}
                    {numDays * slotsPerDay > 10 && <Badge variant="secondary">+{numDays * slotsPerDay - 10} more</Badge>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleAutoGenerate} disabled={generating} className="bg-primary">
                    <Wand2 className="h-4 w-4 mr-2" />
                    {generating ? "Generating..." : "Auto-Generate Timetable"}
                  </Button>
                  {timetable.length > 0 && (
                    <Button variant="destructive" onClick={handleClearTimetable}>
                      <Trash2 className="h-4 w-4 mr-2" /> Clear Timetable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Exam info summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exam Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subjects:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exam.subjects.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grades:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exam.grades.map(g => <Badge key={g} variant="outline">{getGradeName(g)}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dates:</span>
                    <p className="mt-1">{exam.startDate} → {exam.endDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* View Tab */}
          <TabsContent value="view" className="space-y-4">
            {Object.keys(dayGroups).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No timetable generated yet. Go to Configure & Generate to create one.</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(dayGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([dayNum, day]) => (
                <Card key={dayNum}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {day.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Time</TableHead>
                          <TableHead>Subject(s)</TableHead>
                          <TableHead>Grades</TableHead>
                          <TableHead><Building2 className="h-4 w-4 inline mr-1" />Room</TableHead>
                          <TableHead><UserCheck className="h-4 w-4 inline mr-1" />Invigilator</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {day.slots.map(slot => {
                          const entries = slot.entries || [];
                          if (entries.length === 0) {
                            return (
                              <TableRow key={slot.id}>
                                <TableCell className="font-mono text-sm">{slot.startTime?.slice(0,5)}-{slot.endTime?.slice(0,5)}</TableCell>
                                <TableCell colSpan={4} className="text-muted-foreground italic">No subjects assigned</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={() => openAddEntry(slot.id)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return entries.map((entry, idx) => (
                            <TableRow key={entry.id}>
                              {idx === 0 && (
                                <TableCell rowSpan={entries.length} className="font-mono text-sm align-top">
                                  {slot.startTime?.slice(0,5)}-{slot.endTime?.slice(0,5)}
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {entry.subject}
                                  {entry.isConcurrent && <Badge variant="secondary" className="text-xs">Concurrent</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {entry.gradeIds.map(g => (
                                    <Badge key={g} variant="outline" className="text-xs">{getGradeName(g)}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>{entry.roomName || <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell>{entry.invigilatorName || <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {idx === 0 && (
                                    <Button size="sm" variant="outline" onClick={() => openAddEntry(slot.id)}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteEntry(entry.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ));
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject to Slot</DialogTitle>
            <DialogDescription>Assign a subject, room, and invigilator to this exam slot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Select value={entrySubject} onValueChange={setEntrySubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {(exam?.subjects || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Grades</Label>
              <div className="grid grid-cols-3 gap-2 border rounded-md p-2 max-h-32 overflow-y-auto">
                {(exam?.grades || []).map(gId => (
                  <div key={gId} className="flex items-center gap-1">
                    <Checkbox
                      id={`eg-${gId}`}
                      checked={entryGradeIds.includes(gId)}
                      onCheckedChange={() => {
                        setEntryGradeIds(prev =>
                          prev.includes(gId) ? prev.filter(x => x !== gId) : [...prev, gId]
                        );
                      }}
                    />
                    <label htmlFor={`eg-${gId}`} className="text-sm">{getGradeName(gId)}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Room (optional)</Label>
              <Select value={entryRoomId} onValueChange={setEntryRoomId}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Invigilator (optional)</Label>
              <Select value={entryInvigilatorId} onValueChange={setEntryInvigilatorId}>
                <SelectTrigger><SelectValue placeholder="Select invigilator" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="entry-concurrent"
                checked={entryConcurrent}
                onCheckedChange={(v) => setEntryConcurrent(!!v)}
              />
              <Label htmlFor="entry-concurrent">Mark as concurrent (shares time slot with other subjects)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEntry} disabled={!entrySubject}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ExamTimetable;
