import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { StudentReportCard } from "./StudentReportCard";
import { elementToPdfBlob } from "@/utils/pdfGenerator";
import JSZip from "jszip";

interface Student {
  id: string;
  name: string;
  admission_no: string;
}

interface BulkReportGeneratorProps {
  students: Student[];
  examId?: string;
  examName?: string;
  gradeName?: string;
  streamName?: string;
  onComplete?: () => void;
}

export function BulkReportGenerator({
  students,
  examId,
  examName,
  gradeName,
  streamName,
}: BulkReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStudent, setCurrentStudent] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [renderStudentId, setRenderStudentId] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isComplete, setIsComplete] = useState(false);

  const generateBulkReports = async () => {
    if (students.length === 0) return;

    setIsGenerating(true);
    setProgress(0);
    setCompletedCount(0);
    setFailedCount(0);
    setIsComplete(false);

    const zip = new JSZip();
    const folder = zip.folder(`Reports_${gradeName || 'All'}_${streamName || 'All'}_${examName || 'Exam'}`);

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      setCurrentStudent(student.name);
      setRenderStudentId(student.id);
      
      // Wait for the component to render
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        if (reportRef.current) {
          const fileName = `${student.name.replace(/\s+/g, '_')}_${student.admission_no}_Report.pdf`;
          
          const pdfBlob = await elementToPdfBlob(reportRef.current, {
            filename: fileName,
            margin: 10,
            orientation: "portrait",
            format: "a4",
          });

          folder?.file(fileName, pdfBlob);
          setCompletedCount(prev => prev + 1);
        }
      } catch (error) {
        console.error(`Failed to generate report for ${student.name}:`, error);
        setFailedCount(prev => prev + 1);
      }

      setProgress(Math.round(((i + 1) / students.length) * 100));
    }

    // Generate and download the ZIP file
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Student_Reports_${gradeName || 'All'}_${streamName || 'All'}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to create ZIP file:", error);
    }

    setCurrentStudent(null);
    setRenderStudentId(null);
    setIsGenerating(false);
    setIsComplete(true);
  };

  return (
    <div className="space-y-4">
      {!isGenerating && !isComplete && (
        <Button 
          onClick={generateBulkReports} 
          disabled={students.length === 0}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          Download All Reports as ZIP ({students.length} students)
        </Button>
      )}

      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium">Generating Reports...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {completedCount + failedCount} / {students.length}
                </span>
              </div>
              
              <Progress value={progress} className="h-2" />
              
              {currentStudent && (
                <p className="text-sm text-muted-foreground">
                  Currently processing: <span className="font-medium">{currentStudent}</span>
                </p>
              )}
              
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {completedCount} completed
                </span>
                {failedCount > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> {failedCount} failed
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  Reports Generated Successfully!
                </p>
                <p className="text-sm text-green-600">
                  {completedCount} reports downloaded as ZIP file.
                  {failedCount > 0 && ` ${failedCount} reports failed.`}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsComplete(false)}
            >
              Generate More Reports
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hidden report renderer */}
      <div className="fixed left-[-9999px] top-0" aria-hidden="true">
        <div ref={reportRef} className="bg-white p-4" style={{ width: '210mm' }}>
          {renderStudentId && (
            <StudentReportCard 
              studentId={renderStudentId} 
              examId={examId} 
              isPrintable={false} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
