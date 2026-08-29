import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDivisions } from "@/hooks/useDivisions";
import { useState } from "react";

interface SubjectStudentCountsProps {
  schoolId: string;
}

interface GradeSubjectCount {
  gradeId: string;
  gradeName: string;
  gradeLevel: number;
  totalStudents: number;
  subjects: {
    subjectId: string;
    subjectName: string;
    subjectType: string;
    pathway?: string;
    studentCount: number;
  }[];
}

export const SubjectStudentCounts: React.FC<SubjectStudentCountsProps> = ({ schoolId }) => {
  const { divisions, loading: divisionsLoading } = useDivisions();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const supportsPathways = selectedDivision?.curriculum === "cbc-senior";

  // Fetch grades for division
  const { data: grades = [] } = useQuery({
    queryKey: ["grades-for-counts", schoolId, selectedDivisionId, selectedDivision?.curriculum],
    queryFn: async () => {
      if (!selectedDivision) return [];
      const { data, error } = await supabase
        .from("grades")
        .select("id, name, level, curriculum")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .eq("curriculum", selectedDivision.curriculum)
        .gte("level", selectedDivision.grade_level_start)
        .lte("level", selectedDivision.grade_level_end)
        .order("level");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!selectedDivision,
  });

  // Fetch all students with their grade/stream/track info
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-counts", schoolId, grades.map((g: any) => g.id)],
    queryFn: async () => {
      if (!grades.length) return [];
      const gradeIds = grades.map((g: any) => g.id);
      const { data, error } = await supabase
        .from("students")
        .select("id, grade_id, stream_id, pathway, track_id, status")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .in("grade_id", gradeIds);
      if (error) throw error;
      return data || [];
    },
    enabled: grades.length > 0,
  });

  // Fetch subjects for the curriculum
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-for-counts", schoolId, selectedDivision?.curriculum],
    queryFn: async () => {
      if (!selectedDivision) return [];
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, subject_type, pathway")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .eq("curriculum", selectedDivision.curriculum)
        .order("subject_type")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDivision,
  });

  // Fetch tracks to map track_id -> pathway subjects
  const { data: tracks = [] } = useQuery({
    queryKey: ["tracks-for-counts", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbc_senior_tracks")
        .select("id, name, pathway, subject_ids")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && selectedDivision?.curriculum === "cbc-senior",
  });

  // Build the counts
  const gradeSubjectCounts: GradeSubjectCount[] = grades.map((grade: any) => {
    const gradeStudents = students.filter((s: any) => s.grade_id === grade.id);
    const totalStudents = gradeStudents.length;

    const subjectCounts = subjects.map((subject: any) => {
      let count = 0;

      if (subject.subject_type === "core") {
        // All students in the grade take core subjects
        count = totalStudents;
      } else if (subject.pathway) {
        // Optional with pathway - count students with matching pathway or track
        count = gradeStudents.filter((s: any) => {
          if (s.pathway === subject.pathway) return true;
          // Check track-based assignment
          if (s.track_id) {
            const track = tracks.find((t: any) => t.id === s.track_id);
            if (track && track.subject_ids?.includes(subject.id)) return true;
          }
          return false;
        }).length;
      } else {
        // Optional without pathway - assume all students can take it
        // In practice, this would depend on room allocation
        count = totalStudents;
      }

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectType: subject.subject_type,
        pathway: subject.pathway,
        studentCount: count,
      };
    });

    return {
      gradeId: grade.id,
      gradeName: grade.name,
      gradeLevel: grade.level,
      totalStudents,
      subjects: subjectCounts,
    };
  });

  // Build track student counts
  const trackStudentCounts = supportsPathways
    ? tracks.map((track: any) => {
        const trackSubjects = (track.subject_ids || [])
          .map((sid: string) => subjects.find((s: any) => s.id === sid))
          .filter(Boolean);

        const countsByGrade = grades.map((grade: any) => {
          const gradeStudents = students.filter((s: any) => s.grade_id === grade.id);
          const trackStudentCount = gradeStudents.filter((s: any) => s.track_id === track.id).length;
          
          const subjectBreakdown = trackSubjects.map((subject: any) => {
            // Students in this track take these subjects
            const count = gradeStudents.filter((s: any) => s.track_id === track.id).length;
            return { subjectId: subject.id, subjectName: subject.name, count };
          });

          return {
            gradeId: grade.id,
            gradeName: grade.name,
            totalStudents: gradeStudents.length,
            trackStudents: trackStudentCount,
            subjectBreakdown,
          };
        });

        return {
          trackId: track.id,
          trackName: track.name,
          pathway: track.pathway,
          subjects: trackSubjects.map((s: any) => s.name),
          countsByGrade,
        };
      })
    : [];

  const coreSubjects = subjects.filter((s: any) => s.subject_type === "core");
  const optionalSubjects = subjects.filter((s: any) => s.subject_type !== "core");

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
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Student Enrollment by Subject
          </CardTitle>
          <CardDescription>
            View how many students are enrolled in each subject across grades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <label className="text-sm font-medium mb-2 block">School Division</label>
            <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
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
        </CardContent>
      </Card>

      {selectedDivisionId && gradeSubjectCounts.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {gradeSubjectCounts.map((grade) => (
              <Card key={grade.gradeId}>
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{grade.gradeName}</p>
                  <p className="text-2xl font-bold">{grade.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">students</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Core Subjects Table */}
          {coreSubjects.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Core Subjects
                </CardTitle>
                <CardDescription>All students in each grade take these subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        {gradeSubjectCounts.map((grade) => (
                          <TableHead key={grade.gradeId} className="text-center min-w-[80px]">
                            {grade.gradeName}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coreSubjects.map((subject: any) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          {gradeSubjectCounts.map((grade) => {
                            const subjectData = grade.subjects.find((s) => s.subjectId === subject.id);
                            return (
                              <TableCell key={grade.gradeId} className="text-center">
                                <Badge variant="secondary" className="min-w-[40px] justify-center">
                                  {subjectData?.studentCount || 0}
                                </Badge>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optional Subjects Table */}
          {optionalSubjects.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Optional & Elective Subjects
                </CardTitle>
                <CardDescription>
                  {supportsPathways
                    ? "Student counts based on pathway/track enrollment"
                    : "Student counts based on subject enrollment"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        {supportsPathways && <TableHead>Pathway</TableHead>}
                        {gradeSubjectCounts.map((grade) => (
                          <TableHead key={grade.gradeId} className="text-center min-w-[80px]">
                            {grade.gradeName}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optionalSubjects.map((subject: any) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          {supportsPathways && (
                            <TableCell>
                              {subject.pathway ? (
                                <Badge variant="outline" className="text-xs">{subject.pathway}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                          {gradeSubjectCounts.map((grade) => {
                            const subjectData = grade.subjects.find((s) => s.subjectId === subject.id);
                            const count = subjectData?.studentCount || 0;
                            const total = grade.totalStudents;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <TableCell key={grade.gradeId} className="text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <Badge 
                                    variant={count > 0 ? "default" : "secondary"} 
                                    className="min-w-[40px] justify-center"
                                  >
                                    {count}
                                  </Badge>
                                  {count > 0 && total > 0 && (
                                    <span className="text-xs text-muted-foreground">{pct}%</span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Track Student Counts (CBE Senior) */}
          {supportsPathways && trackStudentCounts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Students by Track
                </CardTitle>
                <CardDescription>
                  Number of students enrolled in each track, with per-subject breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Track</TableHead>
                        <TableHead>Pathway</TableHead>
                        <TableHead>Subjects</TableHead>
                        {gradeSubjectCounts.map((grade) => (
                          <TableHead key={grade.gradeId} className="text-center min-w-[80px]">
                            {grade.gradeName}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackStudentCounts.map((track) => (
                        <React.Fragment key={track.trackId}>
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-semibold">{track.trackName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{track.pathway}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                              {track.subjects.join(", ")}
                            </TableCell>
                            {track.countsByGrade.map((gc) => (
                              <TableCell key={gc.gradeId} className="text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <Badge variant="default" className="min-w-[40px] justify-center">
                                    {gc.trackStudents}
                                  </Badge>
                                  {gc.totalStudents > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round((gc.trackStudents / gc.totalStudents) * 100)}%
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                          {/* Per-subject breakdown rows */}
                          {track.countsByGrade[0]?.subjectBreakdown.map((sb) => (
                            <TableRow key={`${track.trackId}-${sb.subjectId}`} className="text-sm">
                              <TableCell className="pl-8 text-muted-foreground">↳ {sb.subjectName}</TableCell>
                              <TableCell />
                              <TableCell />
                              {track.countsByGrade.map((gc) => {
                                const subjectData = gc.subjectBreakdown.find((s) => s.subjectId === sb.subjectId);
                                return (
                                  <TableCell key={gc.gradeId} className="text-center">
                                    <Badge variant="secondary" className="min-w-[40px] justify-center">
                                      {subjectData?.count || 0}
                                    </Badge>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedDivisionId && gradeSubjectCounts.length === 0 && !divisionsLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Grades Found</h3>
            <p className="text-muted-foreground">No grades found for this division.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
