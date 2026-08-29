import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  Search,
  RefreshCw,
  Users,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GradePhaseoutStep from "./GradePhaseoutStep";
import { archiveAcademicYearData, isYearArchived, ArchiveStats } from "@/services/archiveService";

interface Student {
  id: string;
  name: string;
  admissionNo: string;
  currentGradeId: string;
  currentGradeName: string;
  currentStreamId: string;
  currentStreamName: string;
  newGradeId: string | null;
  newGradeName: string | null;
  newStreamId: string;
  newStreamName: string;
  isGraduating: boolean;
}

interface Grade {
  id: string;
  name: string;
  level: number;
  curriculum: string;
}

interface GradeWithCounts {
  id: string;
  name: string;
  level: number;
  curriculum: string;
  studentCount: number;
  streamCount: number;
}

interface Stream {
  id: string;
  name: string;
  gradeId: string | null;
}

interface GradeStream {
  gradeId: string;
  gradeName: string;
  streamId: string;
  streamName: string;
}

interface GradeStudentCount {
  gradeId: string;
  gradeName: string;
  studentCount: number;
  isLoaded: boolean;
}

interface YearEndResetWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "review" | "phaseout" | "confirm" | "processing" | "complete";

const YearEndResetWizard = ({ onComplete, onCancel }: YearEndResetWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("review");
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [gradeStreams, setGradeStreams] = useState<GradeStream[]>([]);
  const [gradeStudentCounts, setGradeStudentCounts] = useState<GradeStudentCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingGradeId, setLoadingGradeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [gradesToRemove, setGradesToRemove] = useState<string[]>([]);
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null);
  const [results, setResults] = useState({
    promoted: 0,
    graduated: 0,
    streamTeachersReset: 0,
    subjectTeachersReset: 0,
    gradesRemoved: 0,
    dataArchived: false,
    errors: [] as { student: string; reason: string }[],
  });

  // Final grades for each curriculum (students in these grades graduate)
  const FINAL_GRADES: Record<string, string[]> = {
    cbc: ["Grade 9"],
    "cbc-senior": ["Grade 12"],
    "8-4-4": ["Form 4"],
  };

  useEffect(() => {
    if (user?.schoolId) {
      loadInitialData();
    }
  }, [user?.schoolId]);

  const loadInitialData = async () => {
    if (!user?.schoolId) return;
    setIsLoading(true);

    try {
      // Load grades
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("school_id", user.schoolId)
        .eq("is_active", true)
        .order("level", { ascending: true });

      if (gradesError) throw gradesError;

      // Load streams
      const { data: streamsData, error: streamsError } = await supabase
        .from("streams")
        .select("*")
        .eq("school_id", user.schoolId);

      if (streamsError) throw streamsError;

      // Load grade_streams combinations
      const { data: gradeStreamsData, error: gsError } = await supabase
        .from("grade_streams")
        .select(`
          id,
          grade_id,
          stream_id,
          grades!inner(id, name, level),
          streams!inner(id, name)
        `)
        .eq("grades.school_id", user.schoolId);

      if (gsError) throw gsError;

      // Get student counts per grade
      const { data: studentCounts, error: countError } = await supabase
        .from("students")
        .select("grade_id")
        .eq("school_id", user.schoolId)
        .eq("status", "active");

      if (countError) throw countError;

      const formattedGrades: Grade[] = (gradesData || []).map((g) => ({
        id: g.id,
        name: g.name,
        level: g.level,
        curriculum: g.curriculum,
      }));

      const formattedStreams: Stream[] = (streamsData || []).map((s) => ({
        id: s.id,
        name: s.name,
        gradeId: s.grade_id,
      }));

      // Create grade-stream combinations
      const gsCombo: GradeStream[] = (gradeStreamsData || []).map((gs: any) => ({
        gradeId: gs.grades.id,
        gradeName: gs.grades.name,
        streamId: gs.streams.id,
        streamName: gs.streams.name,
      }));

      // Calculate student counts per grade
      const countMap = new Map<string, number>();
      (studentCounts || []).forEach((s) => {
        const current = countMap.get(s.grade_id) || 0;
        countMap.set(s.grade_id, current + 1);
      });

      const gradeCounts: GradeStudentCount[] = formattedGrades.map((g) => ({
        gradeId: g.id,
        gradeName: g.name,
        studentCount: countMap.get(g.id) || 0,
        isLoaded: false,
      }));

      setGrades(formattedGrades);
      setStreams(formattedStreams);
      setGradeStreams(gsCombo);
      setGradeStudentCounts(gradeCounts);

      // Auto-select first grade with students
      const firstGradeWithStudents = gradeCounts.find((g) => g.studentCount > 0);
      if (firstGradeWithStudents) {
        setSelectedGrade(firstGradeWithStudents.gradeId);
        await loadStudentsForGrade(firstGradeWithStudents.gradeId, formattedGrades, formattedStreams, gsCombo);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load initial data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentsForGrade = async (
    gradeId: string,
    gradesData: Grade[] = grades,
    streamsData: Stream[] = streams,
    gsCombo: GradeStream[] = gradeStreams
  ) => {
    if (!user?.schoolId) return;
    
    // Check if already loaded
    const gradeCount = gradeStudentCounts.find((g) => g.gradeId === gradeId);
    if (gradeCount?.isLoaded) return;

    setLoadingGradeId(gradeId);

    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          name,
          admission_no,
          grade_id,
          stream_id,
          grades:grades!fk_students_grade(id, name, level, curriculum),
          streams:streams!fk_students_stream(id, name)
        `)
        .eq("school_id", user.schoolId)
        .eq("grade_id", gradeId)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (studentsError) throw studentsError;

      // Filter out students with missing grade or stream data
      const validStudentsData = (studentsData || []).filter(
        (s: any) => s.grades && s.streams
      );

      // Process students - determine their promotions
      const processedStudents: Student[] = validStudentsData.map((s: any) => {
        // Check if student is in final grade
        const isFinalGrade = Object.values(FINAL_GRADES)
          .flat()
          .some((finalGrade) => s.grades.name === finalGrade);

        // Find next grade (same curriculum, next level)
        const nextGrade = gradesData.find(
          (g) =>
            g.curriculum === s.grades.curriculum &&
            g.level === s.grades.level + 1
        );

        // Find matching stream in next grade (same stream name)
        let newStreamId = s.stream_id;
        let newStreamName = s.streams.name;

        if (nextGrade) {
          const matchingGradeStream = gsCombo.find(
            (gs) =>
              gs.gradeId === nextGrade.id &&
              gs.streamName.toLowerCase() === s.streams.name.toLowerCase()
          );
          if (matchingGradeStream) {
            newStreamId = matchingGradeStream.streamId;
            newStreamName = matchingGradeStream.streamName;
          }
        }

        return {
          id: s.id,
          name: s.name,
          admissionNo: s.admission_no,
          currentGradeId: s.grade_id,
          currentGradeName: s.grades.name,
          currentStreamId: s.stream_id,
          currentStreamName: s.streams.name,
          newGradeId: isFinalGrade ? null : nextGrade?.id || null,
          newGradeName: isFinalGrade ? "Graduated" : nextGrade?.name || "No next grade",
          newStreamId: newStreamId,
          newStreamName: newStreamName,
          isGraduating: isFinalGrade,
        };
      });

      // Add new students to the list (avoid duplicates)
      setStudents((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newStudents = processedStudents.filter((s) => !existingIds.has(s.id));
        return [...prev, ...newStudents];
      });

      // Mark grade as loaded
      setGradeStudentCounts((prev) =>
        prev.map((g) =>
          g.gradeId === gradeId ? { ...g, isLoaded: true } : g
        )
      );

      console.log(`Loaded ${processedStudents.length} students for grade ${gradeId}`);
    } catch (error) {
      console.error("Error loading students for grade:", error);
      toast({
        title: "Error",
        description: "Failed to load students for this grade",
        variant: "destructive",
      });
    } finally {
      setLoadingGradeId(null);
    }
  };

  const handleGradeSelect = async (gradeId: string) => {
    setSelectedGrade(gradeId);
    await loadStudentsForGrade(gradeId);
  };

  const loadAllRemainingGrades = async () => {
    const unloadedGrades = gradeStudentCounts.filter((g) => !g.isLoaded && g.studentCount > 0);
    
    for (const grade of unloadedGrades) {
      await loadStudentsForGrade(grade.gradeId);
    }
  };

  const handleStreamChange = (studentId: string, newStreamId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;

        const newStream = gradeStreams.find(
          (gs) => gs.streamId === newStreamId && gs.gradeId === s.newGradeId
        );

        return {
          ...s,
          newStreamId,
          newStreamName: newStream?.streamName || s.newStreamName,
        };
      })
    );
  };

  const getAvailableStreamsForGrade = (gradeId: string | null) => {
    if (!gradeId) return [];
    return gradeStreams.filter((gs) => gs.gradeId === gradeId);
  };

  const studentsForSelectedGrade = students.filter(
    (s) => s.currentGradeId === selectedGrade
  );

  const filteredStudents = studentsForSelectedGrade.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalStudentsLoaded = students.length;
  const totalStudentsExpected = gradeStudentCounts.reduce((sum, g) => sum + g.studentCount, 0);
  const allGradesLoaded = gradeStudentCounts.every((g) => g.isLoaded || g.studentCount === 0);
  const graduatingCount = students.filter((s) => s.isGraduating).length;
  const promotingCount = students.filter((s) => !s.isGraduating && s.newGradeId).length;

  const handleConfirm = async () => {
    // First, ensure all grades are loaded
    if (!allGradesLoaded) {
      toast({
        title: "Loading all students",
        description: "Please wait while we load all student data...",
      });
      await loadAllRemainingGrades();
    }

    setStep("processing");
    setProcessingProgress(0);

    console.log("=== YEAR-END RESET STARTED ===");
    console.log(`Total students to process: ${students.length}`);
    console.log(`Students to promote: ${promotingCount}`);
    console.log(`Students graduating: ${graduatingCount}`);

    try {
      // First, archive all academic data for this year
      if (user?.schoolId) {
        const { data: academicYear } = await supabase
          .from("academic_years")
          .select("id")
          .eq("school_id", user.schoolId)
          .eq("is_active", true)
          .maybeSingle();

        if (academicYear) {
          // Check if already archived
          const alreadyArchived = await isYearArchived(user.schoolId, academicYear.id);
          
          if (!alreadyArchived) {
            console.log("Archiving academic year data...");
            toast({
              title: "Archiving Data",
              description: "Saving all academic data before reset...",
            });

            const archiveResult = await archiveAcademicYearData(
              user.schoolId,
              academicYear.id,
              user.id
            );

            if (archiveResult.success) {
              setArchiveStats(archiveResult.stats || null);
              console.log("Archive completed successfully:", archiveResult.stats);
            } else {
              console.error("Archive failed:", archiveResult.error);
              // Continue with reset even if archive fails, but log warning
              toast({
                title: "Archive Warning",
                description: "Some data may not have been archived. Continuing with reset...",
                variant: "destructive",
              });
            }
          } else {
            console.log("Academic year already archived, skipping...");
          }
        }
      }

      const totalStudents = students.length;
      let processed = 0;
      let promoted = 0;
      let graduated = 0;
      const errors: { student: string; reason: string }[] = [];

      // Process students in batches
      for (const student of students) {
        try {
          if (student.isGraduating) {
            console.log(`[GRADUATING] ${student.name} (${student.admissionNo}) - From: ${student.currentGradeName}/${student.currentStreamName}`);

            const { error } = await supabase
              .from("students")
              .update({ status: "graduated" })
              .eq("id", student.id);

            if (error) throw error;
            graduated++;
          } else if (student.newGradeId) {
            console.log(`[PROMOTING] ${student.name} (${student.admissionNo}) - From: ${student.currentGradeName}/${student.currentStreamName} → To: ${student.newGradeName}/${student.newStreamName}`);

            const { error } = await supabase
              .from("students")
              .update({
                grade_id: student.newGradeId,
                stream_id: student.newStreamId,
              })
              .eq("id", student.id);

            if (error) throw error;
            promoted++;
          } else {
            console.warn(`[SKIPPED] ${student.name} (${student.admissionNo}) - No valid next grade found`);
          }
        } catch (err: any) {
          console.error(`[ERROR] ${student.name} (${student.admissionNo}):`, err.message);
          errors.push({
            student: student.name,
            reason: err.message || "Unknown error",
          });
        }

        processed++;
        setProcessingProgress(Math.round((processed / totalStudents) * 100));
      }

      console.log("=== PROMOTION SUMMARY ===");
      console.log(`Promoted: ${promoted}`);
      console.log(`Graduated: ${graduated}`);
      console.log(`Errors: ${errors.length}`);

      // Reset stream teacher assignments
      let streamTeachersReset = 0;
      let subjectTeachersReset = 0;
      let gradesRemovedCount = 0;

      if (user?.schoolId) {
        // Get active academic year
        const { data: academicYear } = await supabase
          .from("academic_years")
          .select("id")
          .eq("school_id", user.schoolId)
          .eq("is_active", true)
          .maybeSingle();

        // Reset stream teachers in grade_streams
        const { data: gradeStreamsToReset, error: gsError } = await supabase
          .from("grade_streams")
          .select("id")
          .in("grade_id", grades.map((g) => g.id));

        if (!gsError && gradeStreamsToReset) {
          const { error: resetError } = await supabase
            .from("grade_streams")
            .update({ teacher_id: null })
            .in("id", gradeStreamsToReset.map((gs) => gs.id));

          if (!resetError) {
            streamTeachersReset = gradeStreamsToReset.length;
          }
        }

        // Reset subject teacher assignments
        if (academicYear?.id) {
          const { data: subjectAssignments, error: saError } = await supabase
            .from("teacher_subject_assignments")
            .select("id")
            .eq("academic_year_id", academicYear.id);

          if (!saError && subjectAssignments && subjectAssignments.length > 0) {
            const { error: deleteError } = await supabase
              .from("teacher_subject_assignments")
              .delete()
              .eq("academic_year_id", academicYear.id);

            if (!deleteError) {
              subjectTeachersReset = subjectAssignments.length;
            }
          }
        }

        // Remove phased out grades
        if (gradesToRemove.length > 0) {
          console.log("=== REMOVING PHASED OUT GRADES ===");
          console.log(`Grades to remove: ${gradesToRemove.length}`);

          for (const gradeId of gradesToRemove) {
            try {
              // Delete grade_streams first
              await supabase
                .from("grade_streams")
                .delete()
                .eq("grade_id", gradeId);

              // Delete timetables for this grade
              await supabase
                .from("timetables")
                .delete()
                .eq("grade_id", gradeId);

              // Deactivate the grade (soft delete)
              await supabase
                .from("grades")
                .update({ is_active: false })
                .eq("id", gradeId);

              gradesRemovedCount++;
              console.log(`[REMOVED] Grade ID: ${gradeId}`);
            } catch (err: any) {
              console.error(`[ERROR] Failed to remove grade ${gradeId}:`, err.message);
            }
          }
        }
      }

      console.log(`Stream teachers reset: ${streamTeachersReset}`);
      console.log(`Subject teacher assignments reset: ${subjectTeachersReset}`);
      console.log(`Grades removed: ${gradesRemovedCount}`);
      console.log("=== YEAR-END RESET COMPLETE ===");

      setResults({ promoted, graduated, streamTeachersReset, subjectTeachersReset, gradesRemoved: gradesRemovedCount, dataArchived: archiveStats !== null, errors });
      setStep("complete");

      toast({
        title: "Year-End Reset Complete",
        description: `Promoted ${promoted} students, graduated ${graduated} students`,
      });
    } catch (error) {
      console.error("=== YEAR-END RESET FAILED ===", error);
      toast({
        title: "Error",
        description: "An error occurred during the reset process",
        variant: "destructive",
      });
      setStep("review");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading grade data...</span>
      </div>
    );
  }

  // Prepare grades with counts for phaseout step
  const gradesWithCounts: GradeWithCounts[] = grades.map((g) => {
    const gradeCount = gradeStudentCounts.find((gc) => gc.gradeId === g.id);
    const streamCount = gradeStreams.filter((gs) => gs.gradeId === g.id).length;
    return {
      ...g,
      studentCount: gradeCount?.studentCount || 0,
      streamCount,
    };
  });

  const handleGradeToggle = (gradeId: string) => {
    setGradesToRemove((prev) =>
      prev.includes(gradeId)
        ? prev.filter((id) => id !== gradeId)
        : [...prev, gradeId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full ${
              step === "review" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            1
          </div>
          <span className="hidden sm:inline">Review</span>
        </div>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full ${
              step === "phaseout" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            2
          </div>
          <span className="hidden sm:inline">Grades</span>
        </div>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full ${
              step === "confirm" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            3
          </div>
          <span className="hidden sm:inline">Confirm</span>
        </div>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full ${
              step === "complete" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            4
          </div>
          <span className="hidden sm:inline">Complete</span>
        </div>
      </div>

      {step === "review" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalStudentsExpected}</p>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{promotingCount}</p>
                    <p className="text-sm text-muted-foreground">To Promote</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{graduatingCount}</p>
                    <p className="text-sm text-muted-foreground">Graduating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {totalStudentsLoaded}/{totalStudentsExpected}
                    </p>
                    <p className="text-sm text-muted-foreground">Loaded</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grade tabs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Grade to Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {gradeStudentCounts
                  .filter((g) => g.studentCount > 0)
                  .map((grade) => (
                    <Button
                      key={grade.gradeId}
                      variant={selectedGrade === grade.gradeId ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleGradeSelect(grade.gradeId)}
                      disabled={loadingGradeId !== null}
                      className="relative"
                    >
                      {grade.gradeName}
                      <Badge
                        variant="secondary"
                        className="ml-2"
                      >
                        {grade.studentCount}
                      </Badge>
                      {grade.isLoaded && (
                        <CheckCircle className="ml-1 h-3 w-3 text-green-600" />
                      )}
                      {loadingGradeId === grade.gradeId && (
                        <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                      )}
                    </Button>
                  ))}
              </div>
              {!allGradesLoaded && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={loadAllRemainingGrades}
                  disabled={loadingGradeId !== null}
                  className="mt-2"
                >
                  Load all grades at once
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          {selectedGrade && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Student table */}
          {selectedGrade && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>
                    {gradeStudentCounts.find((g) => g.gradeId === selectedGrade)?.gradeName} Students
                  </span>
                  <Badge variant="outline">{filteredStudents.length} students</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingGradeId === selectedGrade ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading students...</span>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Current Class</TableHead>
                          <TableHead>New Class</TableHead>
                          <TableHead>New Stream</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No students found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {student.admissionNo}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {student.currentGradeName} {student.currentStreamName}
                              </TableCell>
                              <TableCell>
                                {student.isGraduating ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    <GraduationCap className="mr-1 h-3 w-3" />
                                    Graduating
                                  </Badge>
                                ) : student.newGradeId ? (
                                  student.newGradeName
                                ) : (
                                  <Badge variant="destructive">No next grade</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {!student.isGraduating && student.newGradeId ? (
                                  <Select
                                    value={student.newStreamId}
                                    onValueChange={(value) =>
                                      handleStreamChange(student.id, value)
                                    }
                                  >
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableStreamsForGrade(student.newGradeId).map(
                                        (gs) => (
                                          <SelectItem key={gs.streamId} value={gs.streamId}>
                                            {gs.streamName}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {student.isGraduating ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Final Year
                                  </Badge>
                                ) : student.newStreamName !== student.currentStreamName ? (
                                  <Badge className="bg-amber-100 text-amber-800">
                                    Stream Changed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Same Stream</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => setStep("phaseout")}>
              Continue to Grade Management
            </Button>
          </div>
        </>
      )}

      {step === "phaseout" && (
        <GradePhaseoutStep
          grades={gradesWithCounts}
          selectedGradesToRemove={gradesToRemove}
          onGradeToggle={handleGradeToggle}
          onContinue={() => setStep("confirm")}
          onBack={() => setStep("review")}
        />
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Year-End Reset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!allGradesLoaded && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">
                      Not all grades have been reviewed
                    </p>
                    <p className="text-sm text-blue-700">
                      {totalStudentsLoaded} of {totalStudentsExpected} students loaded. 
                      Remaining students will be loaded automatically when you confirm.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    This action cannot be undone
                  </p>
                  <p className="text-sm text-amber-700">
                    Please review the changes carefully before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Summary of changes:</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <strong>{promotingCount}</strong> students will be promoted to the
                  next grade
                </li>
                <li>
                  <strong>{graduatingCount}</strong> students will be marked as
                  graduated
                </li>
                {gradesToRemove.length > 0 && (
                  <li className="text-destructive">
                    <strong>{gradesToRemove.length}</strong> grade{gradesToRemove.length > 1 ? "s" : ""} will be phased out and deactivated
                  </li>
                )}
                <li>
                  Stream teacher assignments will be reset and need to be
                  reassigned
                </li>
                <li>
                  Subject teacher assignments will be cleared and need to be
                  reassigned for the new academic year
                </li>
                <li>Historical records will be preserved</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("phaseout")}>
                Back to Grade Management
              </Button>
              <Button variant="destructive" onClick={handleConfirm}>
                Confirm and Execute Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "processing" && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processing year-end reset...</p>
              <div className="w-full max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {processingProgress}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-lg font-medium">Year-End Reset Complete!</p>

              <div className="w-full max-w-md space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 font-medium">Results Summary</h4>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <strong>{results.promoted}</strong> students promoted
                    </li>
                    <li>
                      <strong>{results.graduated}</strong> students graduated
                    </li>
                    {results.gradesRemoved > 0 && (
                      <li>
                        <strong>{results.gradesRemoved}</strong> grades phased out
                      </li>
                    )}
                    <li>
                      <strong>{results.streamTeachersReset}</strong> stream teacher
                      assignments reset
                    </li>
                    <li>
                      <strong>{results.subjectTeachersReset}</strong> subject teacher
                      assignments cleared
                    </li>
                  </ul>
                </div>

                {results.errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="mb-2 font-medium text-red-800">
                      Errors ({results.errors.length})
                    </h4>
                    <ScrollArea className="h-[100px]">
                      <ul className="space-y-1 text-sm text-red-700">
                        {results.errors.map((err, i) => (
                          <li key={i}>
                            {err.student}: {err.reason}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Next steps:</strong> Please reassign stream teachers and
                    subject teachers for the new academic year. Teachers will see
                    updated assignments on their dashboards after reassignment.
                  </p>
                </div>
              </div>

              <Button onClick={onComplete} className="mt-4">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default YearEndResetWizard;
