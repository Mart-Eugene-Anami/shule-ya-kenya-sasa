
import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  streamId?: string;
  gradeId?: string;
}

export function ReportGenerator({
  open,
  onOpenChange,
  studentId,
  streamId,
  gradeId,
}: ReportGeneratorProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<"individual" | "stream" | "grade">(
    studentId ? "individual" : streamId ? "stream" : "grade"
  );
  const [examPeriod, setExamPeriod] = useState<string>("latest");
  const [reportFormat, setReportFormat] = useState<"pdf" | "excel">("pdf");
  const [includeComparison, setIncludeComparison] = useState<boolean>(true);
  const [includeAttendance, setIncludeAttendance] = useState<boolean>(true);
  const [includeTeacherRemarks, setIncludeTeacherRemarks] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  const handleGenerate = async () => {
    setGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setGenerating(false);
      onOpenChange(false);
      
      toast({
        title: "Report Generated Successfully",
        description: "Your report is ready for download.",
        action: (
          <Button variant="outline" size="sm" className="flex items-center">
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        ),
      });
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Generate Student Report
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive academic report with customized options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="report-type">Report Type</Label>
            <RadioGroup 
              value={reportType} 
              onValueChange={(value) => setReportType(value as "individual" | "stream" | "grade")}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" disabled={!studentId} />
                <Label htmlFor="individual" className={!studentId ? "text-gray-400" : ""}>
                  Individual Student Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stream" id="stream" disabled={!streamId} />
                <Label htmlFor="stream" className={!streamId ? "text-gray-400" : ""}>
                  Stream Performance Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grade" id="grade" disabled={!gradeId} />
                <Label htmlFor="grade" className={!gradeId ? "text-gray-400" : ""}>
                  Grade Performance Report
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="exam-period">Exam Period</Label>
            <Select
              value={examPeriod}
              onValueChange={setExamPeriod}
            >
              <SelectTrigger id="exam-period">
                <SelectValue placeholder="Select exam period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest Exam</SelectItem>
                <SelectItem value="term1">Term 1 Exams</SelectItem>
                <SelectItem value="term2">Term 2 Exams</SelectItem>
                <SelectItem value="term3">Term 3 Exams</SelectItem>
                <SelectItem value="yearly">Yearly Average</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="report-format">Report Format</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="pdf" 
                  id="pdf" 
                  checked={reportFormat === "pdf"}
                  onClick={() => setReportFormat("pdf")}
                />
                <Label htmlFor="pdf">PDF Document</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="excel" 
                  id="excel" 
                  checked={reportFormat === "excel"}
                  onClick={() => setReportFormat("excel")}
                />
                <Label htmlFor="excel">Excel Spreadsheet</Label>
              </div>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="font-medium">Additional Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="comparison" 
                  checked={includeComparison}
                  onCheckedChange={(checked) => setIncludeComparison(!!checked)}
                />
                <Label htmlFor="comparison" className="text-sm">
                  Include comparison with previous term
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="attendance" 
                  checked={includeAttendance}
                  onCheckedChange={(checked) => setIncludeAttendance(!!checked)}
                />
                <Label htmlFor="attendance" className="text-sm">
                  Include attendance records
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remarks" 
                  checked={includeTeacherRemarks}
                  onCheckedChange={(checked) => setIncludeTeacherRemarks(!!checked)}
                />
                <Label htmlFor="remarks" className="text-sm">
                  Include teacher's remarks
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <span className="animate-pulse">Generating...</span>
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" /> Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
