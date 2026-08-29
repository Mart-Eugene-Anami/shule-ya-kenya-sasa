import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Archive,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Search,
  Eye,
  Loader2,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface ArchivedYear {
  id: string;
  year: string;
  school_id: string;
  archived_at: string;
  archived_by: string;
  original_academic_year_id: string;
  archive_data: any;
}

interface ArchivedStudentAssignment {
  id: string;
  student_id: string;
  grade_name: string;
  stream_name: string;
  student?: {
    name: string;
    admission_no: string;
  };
}

interface ArchivedMark {
  id: string;
  student_name: string;
  admission_no: string;
  exam_name: string;
  subject: string;
  score: number;
  out_of: number;
  grade: string | null;
  grade_name: string;
  stream_name: string;
  term_name: string | null;
}

interface ArchivedExam {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  subjects: string[];
  term_name: string | null;
}

const ArchivedYearsViewer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [archivedYears, setArchivedYears] = useState<ArchivedYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<ArchivedYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [searchTerm, setSearchTerm] = useState("");

  // Detailed data for selected year
  const [studentAssignments, setStudentAssignments] = useState<ArchivedStudentAssignment[]>([]);
  const [archivedMarks, setArchivedMarks] = useState<ArchivedMark[]>([]);
  const [archivedExams, setArchivedExams] = useState<ArchivedExam[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  useEffect(() => {
    if (user?.schoolId) {
      fetchArchivedYears();
    }
  }, [user?.schoolId]);

  const fetchArchivedYears = async () => {
    if (!user?.schoolId) return;

    try {
      const { data, error } = await supabase
        .from("archived_academic_years")
        .select("*")
        .eq("school_id", user.schoolId)
        .order("archived_at", { ascending: false });

      if (error) throw error;
      setArchivedYears(data || []);
    } catch (error: any) {
      console.error("Error fetching archived years:", error);
      toast({
        title: "Error",
        description: "Failed to load archived academic years",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewYearDetails = async (year: ArchivedYear) => {
    setSelectedYear(year);
    setIsDialogOpen(true);
    setIsDetailLoading(true);
    setActiveTab("students");

    try {
      // Fetch archived student assignments
      const { data: studentsData, error: studentsError } = await supabase
        .from("archived_student_assignments")
        .select(`
          *,
          student:students (name, admission_no)
        `)
        .eq("academic_year_id", year.original_academic_year_id);

      if (studentsError) throw studentsError;
      setStudentAssignments(studentsData || []);

      // Fetch archived marks
      const { data: marksData, error: marksError } = await supabase
        .from("archived_marks")
        .select("*")
        .eq("academic_year_id", year.original_academic_year_id)
        .eq("school_id", user?.schoolId);

      if (!marksError) {
        setArchivedMarks(marksData || []);
      }

      // Fetch archived exams
      const { data: examsData, error: examsError } = await supabase
        .from("archived_exams")
        .select("*")
        .eq("academic_year_id", year.original_academic_year_id)
        .eq("school_id", user?.schoolId);

      if (!examsError) {
        setArchivedExams(examsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching year details:", error);
      toast({
        title: "Error",
        description: "Failed to load archived data details",
        variant: "destructive",
      });
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Get unique grades for filtering
  const uniqueGrades = Array.from(
    new Set(studentAssignments.map((s) => s.grade_name))
  ).sort();

  // Filter student assignments
  const filteredStudents = studentAssignments.filter((s) => {
    const matchesSearch =
      s.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === "all" || s.grade_name === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  // Filter marks
  const filteredMarks = archivedMarks.filter((m) => {
    const matchesSearch =
      m.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.admission_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === "all" || m.grade_name === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (archivedYears.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Academic Years
          </CardTitle>
          <CardDescription>
            View historical data from previous academic years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Archive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Archived Data</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              When you complete a year-end reset, all academic data will be
              archived here for future reference.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Academic Years
          </CardTitle>
          <CardDescription>
            View historical data from previous academic years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {archivedYears.map((year) => (
              <div
                key={year.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{year.year}</h4>
                    <p className="text-sm text-muted-foreground">
                      Archived on {format(new Date(year.archived_at), "PPP")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewYearDetails(year)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Academic Year {selectedYear?.year} - Archived Data
            </DialogTitle>
            <DialogDescription>
              View all archived data from this academic year
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="students" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Students</span>
                  <Badge variant="secondary" className="ml-1">
                    {studentAssignments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="marks" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Marks</span>
                  <Badge variant="secondary" className="ml-1">
                    {archivedMarks.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="exams" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Exams</span>
                  <Badge variant="secondary" className="ml-1">
                    {archivedExams.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {uniqueGrades.length > 0 && (
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {uniqueGrades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <TabsContent value="students" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-[400px]">
                  {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No student records found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Admission No</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Stream</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">
                              {assignment.student?.name || "Unknown"}
                            </TableCell>
                            <TableCell>{assignment.student?.admission_no || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{assignment.grade_name}</Badge>
                            </TableCell>
                            <TableCell>{assignment.stream_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="marks" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-[400px]">
                  {filteredMarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No mark records found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Exam</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMarks.slice(0, 100).map((mark) => (
                          <TableRow key={mark.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{mark.student_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {mark.admission_no}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{mark.exam_name}</div>
                                {mark.term_name && (
                                  <div className="text-xs text-muted-foreground">
                                    {mark.term_name}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{mark.subject}</TableCell>
                            <TableCell>
                              {mark.score}/{mark.out_of}
                            </TableCell>
                            <TableCell>
                              {mark.grade ? (
                                <Badge variant="secondary">{mark.grade}</Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {filteredMarks.length > 100 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Showing 100 of {filteredMarks.length} records
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="exams" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-[400px]">
                  {archivedExams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No exam records found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {archivedExams.map((exam) => (
                        <div
                          key={exam.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{exam.name}</h4>
                              {exam.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {exam.description}
                                </p>
                              )}
                            </div>
                            {exam.term_name && (
                              <Badge variant="outline">{exam.term_name}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>
                              {format(new Date(exam.start_date), "PP")} -{" "}
                              {format(new Date(exam.end_date), "PP")}
                            </span>
                            <span>•</span>
                            <span>{exam.subjects.length} subjects</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exam.subjects.slice(0, 5).map((subject) => (
                              <Badge key={subject} variant="secondary" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                            {exam.subjects.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{exam.subjects.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArchivedYearsViewer;
