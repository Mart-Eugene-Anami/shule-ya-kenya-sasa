import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Clock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudentReportCard } from "@/components/reports/StudentReportCard";
import { downloadElementAsPdf } from "@/utils/pdfGenerator";

interface ExamReport {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  termName: string | null;
  hasMarks: boolean;
}

const StudentReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [reports, setReports] = useState<ExamReport[]>([]);
  const [previewExam, setPreviewExam] = useState<ExamReport | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchStudentAndReports();
    }
  }, [user?.id]);

  const fetchStudentAndReports = async () => {
    try {
      // Get student info
      const { data: student } = await supabase
        .from('students')
        .select('id, grade_id, school_id')
        .eq('user_id', user?.id)
        .single();

      if (!student) {
        setLoading(false);
        return;
      }

      setStudentId(student.id);

      // Fetch all exams that include this student's grade
      const { data: exams } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          start_date,
          end_date,
          grades,
          terms!exams_term_id_fkey(name)
        `)
        .eq('school_id', student.school_id)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (exams) {
        // Check which exams have marks for this student
        const { data: studentMarks } = await supabase
          .from('marks')
          .select('exam_id')
          .eq('student_id', student.id);

        const examsWithMarks = new Set(studentMarks?.map(m => m.exam_id) || []);

        const examReports: ExamReport[] = exams
          .filter((exam: any) => exam.grades?.includes(student.grade_id))
          .map((exam: any) => ({
            id: exam.id,
            name: exam.name,
            startDate: exam.start_date,
            endDate: exam.end_date,
            termName: exam.terms?.name || null,
            hasMarks: examsWithMarks.has(exam.id)
          }));

        setReports(examReports);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report: ExamReport) => {
    if (!studentId) return;
    
    setDownloading(report.id);
    
    try {
      // Wait for report to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById(`report-${report.id}`);
      if (!element) {
        console.error("Report element not found");
        return;
      }

      await downloadElementAsPdf(element, {
        filename: `Report_${report.name.replace(/\s+/g, '_')}.pdf`,
        margin: 12,
        orientation: "portrait",
        format: "a4",
      });
    } catch (error) {
      console.error("Error downloading report:", error);
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('report-preview-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Report Card</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header { text-align: center; margin-bottom: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <DashboardLayout title="My Reports">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Reports">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium">Available Report Cards</h2>
          <p className="text-sm text-muted-foreground">
            Download or view your academic reports for each exam
          </p>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      {report.termName && (
                        <Badge variant="secondary" className="mt-1">
                          {report.termName}
                        </Badge>
                      )}
                    </div>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {format(new Date(report.startDate), 'MMM dd')} - {format(new Date(report.endDate), 'MMM dd, yyyy')}
                  </p>
                  
                  {report.hasMarks ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setPreviewExam(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleDownload(report)}
                        disabled={downloading === report.id}
                      >
                        {downloading === report.id ? (
                          <Clock className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Download
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="w-full justify-center py-2">
                      Marks not yet entered
                    </Badge>
                  )}
                  
                  {/* Hidden report for download */}
                  {report.hasMarks && studentId && (
                    <div id={`report-${report.id}`} className="hidden">
                      <StudentReportCard 
                        studentId={studentId} 
                        examId={report.id}
                        isPrintable={false}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Report Preview Dialog */}
        <Dialog open={!!previewExam} onOpenChange={() => setPreviewExam(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{previewExam?.name} Report Card</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => previewExam && handleDownload(previewExam)}
                    disabled={!!downloading}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div id="report-preview-content">
              {previewExam && studentId && (
                <StudentReportCard 
                  studentId={studentId} 
                  examId={previewExam.id}
                  isPrintable={false}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentReports;
