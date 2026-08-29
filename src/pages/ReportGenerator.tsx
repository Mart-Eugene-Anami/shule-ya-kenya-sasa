import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Printer, FileSearch, Filter, Loader2, Archive, MessageSquare } from "lucide-react";
import { StudentReportCard } from "@/components/reports/StudentReportCard";
import { BulkReportGenerator } from "@/components/reports/BulkReportGenerator";
import { ReportCommentsTab } from "@/components/reports/ReportCommentsTab";
import { downloadElementAsPdf } from "@/utils/pdfGenerator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Grade {
  id: string;
  name: string;
}

interface Stream {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  admission_no: string;
  grade: { name: string } | null;
  stream: { name: string } | null;
}

const ReportGeneratorPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedStream, setSelectedStream] = useState<string>("all");
  const [selectedExam, setSelectedExam] = useState<string>("latest");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGrade !== "all" || selectedStream !== "all") {
      loadStudents();
    }
  }, [selectedGrade, selectedStream]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.school_id) return;

      // Load grades
      const { data: gradesData } = await supabase
        .from("grades")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .order("name");

      // Load streams
      const { data: streamsData } = await supabase
        .from("streams")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name");

      // Load exams
      const { data: examsData } = await supabase
        .from("exams")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      setGrades(gradesData || []);
      setStreams(streamsData || []);
      setExams(examsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.school_id) return;

      let query = supabase
        .from("students")
        .select(`
          id,
          name,
          admission_no,
          grade:grades!students_grade_id_fkey(name),
          stream:streams!students_stream_id_fkey(name)
        `)
        .eq("school_id", profile.school_id)
        .eq("status", "active");

      if (selectedGrade !== "all") {
        query = query.eq("grade_id", selectedGrade);
      }

      if (selectedStream !== "all") {
        query = query.eq("stream_id", selectedStream);
      }

      const { data } = await query.order("name");
      setStudents(data || []);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const handleViewReport = (studentId: string) => {
    setSelectedStudent(studentId);
    setReportPreviewOpen(true);
  };

  const handlePrintReport = () => {
    if (reportRef.current) {
      const printContent = reportRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const studentName = students.find(s => s.id === selectedStudent)?.name || 'Student';
        const safeTitle = `Report - ${studentName}`
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${safeTitle}</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current || !selectedStudent) return;
    
    setIsDownloading(true);
    try {
      const studentName = students.find(s => s.id === selectedStudent)?.name || 'Student';
      const examName = exams.find(e => e.id === selectedExam)?.name || 'Report';
      const fileName = `${studentName.replace(/\s+/g, '_')}_${examName.replace(/\s+/g, '_')}_Report.pdf`;
      
      const element = reportRef.current;
      
      await downloadElementAsPdf(element, {
        filename: fileName,
        margin: 10,
        orientation: "portrait",
        format: "a4",
      });
      
      toast({
        title: "Report Downloaded",
        description: `PDF report for ${studentName} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Report Generator">
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Report Generator">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Generate Student Reports</h2>
          <Button variant="outline" onClick={() => navigate("/exams/analytics")}>
            <FileSearch className="mr-2 h-4 w-4" /> View Exam Analytics
          </Button>
        </div>
        <p className="text-gray-500">
          Create and download individual or bulk student reports based on exam performance.
        </p>
      </div>

      <Tabs defaultValue="individual">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="individual">Individual Reports</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Reports</TabsTrigger>
          <TabsTrigger value="comments">Report Comments</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle>Generate Individual Student Reports</CardTitle>
              <CardDescription>
                Generate detailed performance reports for specific students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-4">
                  <div className="w-[180px]">
                    <p className="text-sm font-medium mb-1">Grade</p>
                    <Select
                      value={selectedGrade}
                      onValueChange={setSelectedGrade}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-[180px]">
                    <p className="text-sm font-medium mb-1">Stream</p>
                    <Select
                      value={selectedStream}
                      onValueChange={setSelectedStream}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stream" />
                      </SelectTrigger>
                      <SelectContent>
                        {streams.map((stream) => (
                          <SelectItem key={stream.id} value={stream.id}>
                            {stream.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-[180px]">
                    <p className="text-sm font-medium mb-1">Exam Period</p>
                    <Select
                      value={selectedExam}
                      onValueChange={setSelectedExam}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button variant="outline" className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" /> More Filters
                </Button>
              </div>

              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.length === students.length && students.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.admission_no}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.stream?.name || "-"}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewReport(student.id)}>
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex justify-between items-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    {selectedStudents.length > 0 
                      ? `${selectedStudents.length} of ${students.length} students selected`
                      : `Showing ${students.length} students`
                    }
                  </p>
                  <div className="flex gap-2">
                    {selectedStudents.length > 0 && (
                      <BulkReportGenerator
                        students={students.filter(s => selectedStudents.includes(s.id))}
                        examId={selectedExam !== "latest" ? selectedExam : undefined}
                        examName={exams.find(e => e.id === selectedExam)?.name}
                        gradeName={grades.find(g => g.id === selectedGrade)?.name}
                        streamName={streams.find(s => s.id === selectedStream)?.name}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          {/* Explanation cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-start gap-3">
                  <Filter className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm mb-1">Grade &amp; Stream</p>
                    <p className="text-xs text-muted-foreground">
                      Select a grade level and optionally a stream to narrow down which students' reports will be generated. Leave stream empty to include all streams in the grade.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-start gap-3">
                  <FileSearch className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm mb-1">Exam Period</p>
                    <p className="text-xs text-muted-foreground">
                      Choose the exam whose marks will populate each report card. Only exams with recorded marks will produce meaningful reports.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm mb-1">Report Format</p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Single PDF</strong> merges all reports into one file. <strong>Individual PDFs (ZIP)</strong> creates a separate PDF per student, bundled into a downloadable ZIP archive.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generate Bulk Reports</CardTitle>
              <CardDescription>
                Create reports for entire grades or streams at once. Use the filters below, then click the download button to generate all reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Report Options</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Grade Level</p>
                        <Select
                          value={selectedGrade}
                          onValueChange={setSelectedGrade}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {grades.map((grade) => (
                              <SelectItem key={grade.id} value={grade.id}>
                                {grade.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Stream</p>
                        <Select
                          value={selectedStream}
                          onValueChange={setSelectedStream}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stream" />
                          </SelectTrigger>
                          <SelectContent>
                            {streams.map((stream) => (
                              <SelectItem key={stream.id} value={stream.id}>
                                {stream.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Exam Period</p>
                        <Select
                          value={selectedExam}
                          onValueChange={setSelectedExam}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select exam" />
                          </SelectTrigger>
                          <SelectContent>
                            {exams.map((exam) => (
                              <SelectItem key={exam.id} value={exam.id}>
                                {exam.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Report Format</h3>
                    <div className="flex space-x-4">
                      <Button variant="outline" className="flex-1">
                        Single PDF
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Individual PDFs (ZIP)
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Report Summary</h3>
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <p className="text-sm">Grade Level:</p>
                          <p className="font-medium">{grades.find(g => g.id === selectedGrade)?.name || "Select a grade"}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm">Stream:</p>
                          <p className="font-medium">{streams.find(s => s.id === selectedStream)?.name || "All Streams"}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm">Exam Period:</p>
                          <p className="font-medium">{exams.find(e => e.id === selectedExam)?.name || "Select an exam"}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm">Students:</p>
                          <p className="font-medium">{students.length}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm">Report Type:</p>
                          <p className="font-medium">Individual PDFs (ZIP)</p>
                        </div>
                        
                        <div className="pt-4 border-t">
                          <BulkReportGenerator
                            students={students}
                            examId={selectedExam !== "latest" ? selectedExam : undefined}
                            examName={exams.find(e => e.id === selectedExam)?.name}
                            gradeName={grades.find(g => g.id === selectedGrade)?.name}
                            streamName={streams.find(s => s.id === selectedStream)?.name}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <ReportCommentsTab 
            grades={grades} 
            streams={streams} 
            exams={exams}
            schoolId={user?.schoolId || ""}
          />
        </TabsContent>
        
        <TabsContent value="transcripts">
          <Card>
            <CardHeader>
              <CardTitle>Generate Transcripts</CardTitle>
              <CardDescription>
                Create comprehensive academic transcripts for students
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">Transcript Generator</h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  Create official student transcripts with comprehensive academic history across multiple terms.
                </p>
                <Button>Access Transcript Generator</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Report Preview Dialog */}
      <Dialog open={reportPreviewOpen} onOpenChange={setReportPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Student Report Preview</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button size="sm" onClick={handleDownloadReport} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              {selectedStudent && students.find(s => s.id === selectedStudent)?.name} - {exams.find(e => e.id === selectedExam)?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div ref={reportRef}>
            {selectedStudent && (
              <StudentReportCard studentId={selectedStudent} examId={selectedExam !== "latest" ? selectedExam : undefined} isPrintable={false} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ReportGeneratorPage;
