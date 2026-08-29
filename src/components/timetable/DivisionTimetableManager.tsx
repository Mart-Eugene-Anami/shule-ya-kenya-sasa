import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, RefreshCw, Loader2, AlertTriangle, CheckCircle2, XCircle, Users, School, Building2, GraduationCap, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDivisions } from "@/hooks/useDivisions";
import { useTimetableGeneration } from "@/contexts/TimetableGenerationContext";
import { TimetableView } from "./TimetableView";
import { MasterGenerationResult } from "@/services/timetable/masterTimetableGenerator";
import { SchoolTerm } from "@/types";

interface DivisionTimetableManagerProps {
  schoolId: string;
  academicYearId: string;
  terms: SchoolTerm[];
  selectedTermId: string;
  onTermChange: (termId: string) => void;
}

export const DivisionTimetableManager: React.FC<DivisionTimetableManagerProps> = ({
  schoolId,
  academicYearId,
  terms,
  selectedTermId,
  onTermChange,
}) => {
  const { toast } = useToast(); // refreshed
  const { divisions, loading: divisionsLoading } = useDivisions();
  const { state: genState, startGeneration, dismissResult } = useTimetableGeneration();

  // Derive from global context
  const isGenerating = genState.isGenerating;
  const masterResult = genState.result;

  // Lower-level view state
  const [viewLevel, setViewLevel] = useState<"division" | "grade" | "stream">("stream");
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("");

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);

  // Fetch grades filtered by division
  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: ["grades", schoolId, selectedDivisionId, selectedDivision?.curriculum],
    queryFn: async () => {
      if (selectedDivisionId) {
        const { data: divisionGrades, error } = await supabase
          .from("grades")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .eq("division_id", selectedDivisionId)
          .order("level");

        if (!error && divisionGrades && divisionGrades.length > 0) {
          return divisionGrades;
        }

        if (selectedDivision) {
          const { data: curriculumGrades, error: currError } = await supabase
            .from("grades")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .eq("curriculum", selectedDivision.curriculum)
            .gte("level", selectedDivision.grade_level_start)
            .lte("level", selectedDivision.grade_level_end)
            .order("level");

          if (!currError) return curriculumGrades || [];
        }
      }

      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("level");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch streams for selected grade
  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ["streamsForGrade", schoolId, selectedGradeId],
    queryFn: async () => {
      const { data: gradeStreamData, error: gsError } = await supabase
        .from("grade_streams")
        .select(`stream_id, streams!inner(id, name)`)
        .eq("grade_id", selectedGradeId);

      if (!gsError && gradeStreamData && gradeStreamData.length > 0) {
        return gradeStreamData.map((gs: any) => ({ id: gs.streams.id, name: gs.streams.name }));
      }

      const { data: roomStreams, error: roomError } = await supabase
        .from("rooms")
        .select("stream_id, streams!inner(id, name)")
        .eq("school_id", schoolId)
        .eq("grade_id", selectedGradeId)
        .not("stream_id", "is", null);

      if (!roomError && roomStreams && roomStreams.length > 0) {
        const uniqueStreams = new Map();
        roomStreams.forEach((r: any) => {
          if (r.streams && !uniqueStreams.has(r.streams.id)) {
            uniqueStreams.set(r.streams.id, { id: r.streams.id, name: r.streams.name });
          }
        });
        return Array.from(uniqueStreams.values());
      }

      const { data: directStreams, error: directError } = await supabase
        .from("streams")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("grade_id", selectedGradeId);
      if (!directError && directStreams) return directStreams;
      return [];
    },
    enabled: !!selectedGradeId,
  });

  // Fetch timetables based on current filter level
  const { data: timetables = [] } = useQuery({
    queryKey: ["timetables", schoolId, academicYearId, selectedTermId, selectedDivisionId, selectedGradeId, selectedStreamId, viewLevel],
    queryFn: async () => {
      let query = supabase
        .from("timetables")
        .select(`*, grade:grades(id, name, curriculum, level), stream:streams(id, name)`)
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId)
        .eq("term_id", selectedTermId);

      if (viewLevel === "stream" && selectedStreamId) {
        query = query.eq("grade_id", selectedGradeId).eq("stream_id", selectedStreamId);
      } else if (viewLevel === "grade" && selectedGradeId) {
        query = query.eq("grade_id", selectedGradeId);
      } else if (viewLevel === "division" && selectedDivisionId) {
        // Filter by grades in this division
        const gradeIds = grades.map((g: any) => g.id);
        if (gradeIds.length > 0) {
          query = query.in("grade_id", gradeIds);
        } else {
          return [];
        }
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!academicYearId && !!selectedTermId && (
      (viewLevel === "stream" && !!selectedStreamId) ||
      (viewLevel === "grade" && !!selectedGradeId) ||
      (viewLevel === "division" && !!selectedDivisionId)
    ),
  });

  // Fetch selected timetable with slots
  const { data: selectedTimetable } = useQuery({
    queryKey: ["timetable", selectedTimetableId],
    queryFn: async () => {
      const { data: timetable, error } = await supabase
        .from("timetables")
        .select(`*, grade:grades(id, name, curriculum), stream:streams(id, name)`)
        .eq("id", selectedTimetableId)
        .single();
      if (error) throw error;

      const { data: slots } = await supabase
        .from("timetable_slots")
        .select(`*, teacher:teachers(id, name), room:rooms(id, name)`)
        .eq("timetable_id", selectedTimetableId);

      return { ...timetable, slots: slots || [] };
    },
    enabled: !!selectedTimetableId,
  });

  // Student counts
  const { data: streamStudentCount = 0 } = useQuery({
    queryKey: ["streamStudentCount", selectedGradeId, selectedStreamId],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("grade_id", selectedGradeId)
        .eq("stream_id", selectedStreamId)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!selectedGradeId && !!selectedStreamId,
  });

  const { data: gradeStudentCount = 0 } = useQuery({
    queryKey: ["gradeStudentCount", selectedGradeId],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("grade_id", selectedGradeId)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!selectedGradeId,
  });

  const handleGenerateMasterTimetable = () => {
    if (!selectedTermId || !academicYearId) {
      toast({ title: "Missing selections", description: "Please select a Term.", variant: "destructive" });
      return;
    }
    startGeneration({ schoolId, termId: selectedTermId, academicYearId, regenerate: true });
    toast({
      title: "Timetable generation started",
      description: "Generation is running in the background. You can navigate away safely.",
    });
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setSelectedGradeId("");
    setSelectedStreamId("");
    setSelectedTimetableId("");
  };

  const handleGradeChange = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    setSelectedStreamId("");
    setSelectedTimetableId("");
  };

  const getCurriculumLabel = (curriculum: string) => {
    switch (curriculum) {
       case "cbc": return "CBE";
       case "cbc-senior": return "CBE Senior";
      case "8-4-4": return "8-4-4";
      default: return curriculum.toUpperCase();
    }
  };

  // Auto-select first division when divisions load
  React.useEffect(() => {
    if (divisions.length > 0 && !selectedDivisionId) {
      setSelectedDivisionId(divisions[0].id);
    }
  }, [divisions, selectedDivisionId]);

  // Auto-select first grade when grades load
  React.useEffect(() => {
    if (grades.length > 0 && !selectedGradeId) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, selectedGradeId]);

  // Auto-select first stream when streams load
  React.useEffect(() => {
    if (streams.length > 0 && !selectedStreamId) {
      setSelectedStreamId(streams[0].id);
    }
  }, [streams, selectedStreamId]);

  // Auto-select first timetable when list changes
  React.useEffect(() => {
    if (timetables.length > 0 && !timetables.find((t: any) => t.id === selectedTimetableId)) {
      setSelectedTimetableId(timetables[0].id);
    } else if (timetables.length === 0) {
      setSelectedTimetableId("");
    }
  }, [timetables]);

  if (divisionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1: MASTER TIMETABLE GENERATION                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <School className="w-6 h-6 text-primary" />
                Master Timetable Generation
              </CardTitle>
              <CardDescription className="mt-1">
                Generate timetables for <strong>ALL</strong> divisions, grades, and streams in a single coordinated pass.
                This ensures no teacher or room conflicts across the entire school.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Term selector + Generate button */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Term</label>
              <Select value={selectedTermId} onValueChange={onTermChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} {term.isActive ? "(Active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerateMasterTimetable}
              disabled={isGenerating || !selectedTermId}
              size="lg"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating All Streams...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Generate Master Timetable
                </>
              )}
            </Button>
          </div>

          {!selectedTermId && (
            <p className="text-sm text-muted-foreground">Select a term to generate the master timetable.</p>
          )}

          {/* Master Generation Results */}
          {masterResult && (
            <div className="space-y-4 mt-4">
              {/* Summary Banner */}
              <Alert variant={masterResult.success ? "default" : "destructive"} className="border-2">
                <div className="flex items-start gap-3">
                  {masterResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <AlertTitle className="text-base">
                      {masterResult.success ? "Master Timetable Generated Successfully" : "Generation Failed"}
                    </AlertTitle>
                    <AlertDescription className="mt-1">{masterResult.message}</AlertDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => dismissResult()}>
                    Dismiss
                  </Button>
                </div>
              </Alert>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{masterResult.stats.successfulStreams}/{masterResult.stats.totalStreams}</div>
                    <p className="text-xs text-muted-foreground mt-1">Streams</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{masterResult.stats.totalSlots}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total Slots</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{masterResult.stats.filledSlots}</div>
                    <p className="text-xs text-muted-foreground mt-1">Filled Slots</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{masterResult.stats.freeSlots}</div>
                    <p className="text-xs text-muted-foreground mt-1">Free Slots</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{masterResult.stats.teacherUtilization}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Teacher Utilization</p>
                  </CardContent>
                </Card>
              </div>

              {/* Curriculum Breakdown */}
              {masterResult.curriculumBreakdown && Object.keys(masterResult.curriculumBreakdown).length > 1 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Curriculum Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(masterResult.curriculumBreakdown).map((cb) => (
                        <Badge key={cb.curriculum} variant="outline" className="gap-1.5">
                          <span className="font-medium">{cb.label}</span>
                          <span className="text-muted-foreground">
                            {cb.successCount}/{cb.streamCount} streams
                          </span>
                          <span className="text-xs px-1 py-0.5 rounded bg-muted">
                            {cb.strategy === "cbe-senior" ? "Track-based" : "Standard"}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Results in Accordion */}
              <Accordion type="multiple" className="w-full">
                {/* Stream Results */}
                {masterResult.streamResults.length > 0 && (
                  <AccordionItem value="streams">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Stream Results</span>
                        <Badge variant="secondary" className="ml-1">{masterResult.streamResults.length}</Badge>
                        {masterResult.streamResults.some(sr => !sr.success) && (
                          <Badge variant="destructive" className="ml-1">
                            {masterResult.streamResults.filter(sr => !sr.success).length} failed
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Grade</TableHead>
                              <TableHead>Stream</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-center">Core</TableHead>
                              <TableHead className="text-center">Optional</TableHead>
                              <TableHead className="text-center">Free</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterResult.streamResults.map((sr, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{sr.gradeName}</TableCell>
                                <TableCell>{sr.streamName}</TableCell>
                                <TableCell>
                                  {sr.success ? (
                                    <Badge variant="outline" className="border-green-500 text-green-600">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XCircle className="w-3 h-3 mr-1" /> Failed
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">{sr.coreSlots}</TableCell>
                                <TableCell className="text-center">{sr.optionalSlots}</TableCell>
                                <TableCell className="text-center">{sr.freeSlots}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{sr.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Warnings */}
                {masterResult.warnings.length > 0 && (
                  <AccordionItem value="warnings">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span>Warnings</span>
                        <Badge variant="outline" className="ml-1 border-yellow-500 text-yellow-600">
                          {masterResult.warnings.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border p-4 bg-yellow-50/50 dark:bg-yellow-900/10 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {masterResult.warnings.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Conflicts */}
                {masterResult.conflicts.length > 0 && (
                  <AccordionItem value="conflicts">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span>Conflicts</span>
                        <Badge variant="destructive" className="ml-1">
                          {masterResult.conflicts.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border border-destructive/20 p-4 bg-destructive/5 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {masterResult.conflicts.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                              <span>{c.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2: EXTRACT LOWER-LEVEL TIMETABLES             */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            View Timetables
          </CardTitle>
          <CardDescription>
            Extract and view timetables from the master schedule at different levels: by division, grade, or individual stream.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View Level Selector */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewLevel === "division" ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewLevel("division"); setSelectedGradeId(""); setSelectedStreamId(""); setSelectedTimetableId(""); }}
              className="gap-1"
            >
              <Building2 className="w-4 h-4" />
              Division
            </Button>
            <Button
              variant={viewLevel === "grade" ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewLevel("grade"); setSelectedStreamId(""); setSelectedTimetableId(""); }}
              className="gap-1"
            >
              <GraduationCap className="w-4 h-4" />
              Grade
            </Button>
            <Button
              variant={viewLevel === "stream" ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewLevel("stream"); setSelectedTimetableId(""); }}
              className="gap-1"
            >
              <Users className="w-4 h-4" />
              Stream
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Division - always shown */}
            <div>
              <label className="text-sm font-medium mb-2 block">Division</label>
              <Select value={selectedDivisionId} onValueChange={handleDivisionChange}>
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

            {/* Grade - shown for grade and stream levels */}
            {(viewLevel === "grade" || viewLevel === "stream") && (
              <div>
                <label className="text-sm font-medium mb-2 block">Grade</label>
                <Select
                  value={selectedGradeId}
                  onValueChange={handleGradeChange}
                  disabled={!selectedDivisionId || gradesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDivisionId ? "Select grade" : "Select division first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade: any) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stream - shown only for stream level */}
            {viewLevel === "stream" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Stream</label>
                <Select
                  value={selectedStreamId}
                  onValueChange={setSelectedStreamId}
                  disabled={!selectedGradeId || streamsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      streamsLoading ? "Loading..." :
                      selectedGradeId ? (streams.length === 0 ? "No streams found" : "Select stream") :
                      "Select grade first"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((stream: any) => (
                      <SelectItem key={stream.id} value={stream.id}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Division Info */}
          {selectedDivision && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedDivision.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedDivision.description}</p>
                </div>
                <Badge>{getCurriculumLabel(selectedDivision.curriculum)}</Badge>
              </div>
            </div>
          )}

          {/* Student count badges */}
          {selectedGradeId && (viewLevel === "grade" || viewLevel === "stream") && (
            <div className="flex flex-wrap gap-3 text-sm">
              {gradeStudentCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {gradeStudentCount} students in grade
                </Badge>
              )}
              {selectedStreamId && streamStudentCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-3 h-3" />
                  {streamStudentCount} students in stream
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Timetable Display */}
      {timetables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {viewLevel === "division" && selectedDivision
                ? `${selectedDivision.name} Timetables`
                : viewLevel === "grade" && selectedGradeId
                  ? `${grades.find((g: any) => g.id === selectedGradeId)?.name} Timetables`
                  : viewLevel === "stream" && selectedStreamId
                    ? `${grades.find((g: any) => g.id === selectedGradeId)?.name} — ${streams.find((s: any) => s.id === selectedStreamId)?.name} Timetable`
                    : "Timetables"
              }
            </CardTitle>
            <CardDescription>
              {timetables.length} timetable{timetables.length !== 1 ? "s" : ""} extracted from the master schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Timetable selector for multiple results */}
            {timetables.length > 1 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium whitespace-nowrap">View timetable:</label>
                <Select value={selectedTimetableId} onValueChange={setSelectedTimetableId}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Select a timetable" />
                  </SelectTrigger>
                  <SelectContent>
                    {timetables.map((tt: any) => (
                      <SelectItem key={tt.id} value={tt.id}>
                        {tt.grade?.name} — {tt.stream?.name} (v{tt.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Summary table for division/grade level */}
            {(viewLevel === "division" || viewLevel === "grade") && timetables.length > 1 && (
              <Card className="bg-muted/30">
                <CardHeader><CardTitle className="text-sm">Overview</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timetables.map((tt: any) => (
                        <TableRow key={tt.id} className={tt.id === selectedTimetableId ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">{tt.grade?.name}</TableCell>
                          <TableCell>{tt.stream?.name}</TableCell>
                          <TableCell><Badge variant="outline">v{tt.version}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={tt.id === selectedTimetableId ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setSelectedTimetableId(tt.id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* The actual timetable view */}
            {selectedTimetable && (
              <TimetableView
                timetable={selectedTimetable as any}
                showTeachers={true}
                showRooms={true}
                showConflicts={true}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when filters are set but no timetables */}
      {timetables.length === 0 && (
        (viewLevel === "division" && selectedDivisionId) ||
        (viewLevel === "grade" && selectedGradeId) ||
        (viewLevel === "stream" && selectedStreamId)
      ) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Timetables Found</h3>
            <p className="text-muted-foreground">
              Use the <strong>Generate Master Timetable</strong> button above to create timetables for all streams, then extract them here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial empty state */}
      {!selectedDivisionId && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Level to View</h3>
            <p className="text-muted-foreground">
              Choose a division above to browse timetables extracted from the master schedule.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
