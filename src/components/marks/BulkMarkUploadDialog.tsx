import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useBulkUpload } from "@/contexts/BulkUploadContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { chunkedBulkMarkUpload, generateSampleMarksCsv } from "@/services/bulkMarkUploadService";
import { Exam, Grade } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

interface BulkMarkUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam | null;
  exams?: Exam[];
  grades: Grade[];
  onUploadComplete?: () => void;
}

interface StreamOption {
  id: string;
  name: string;
  gradeName: string;
}

const BulkMarkUploadDialog = ({
  isOpen,
  onOpenChange,
  exam: examProp,
  exams = [],
  grades,
  onUploadComplete,
}: BulkMarkUploadDialogProps) => {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const { startUpload, updateProgress, completeUpload, setUploadError, isCancelled } = useBulkUpload();

  // Resolve the active exam: from prop or from selection
  const exam = examProp || exams.find(e => e.id === selectedExamId) || null;

  // Reset stream when exam changes
  useEffect(() => {
    setSelectedStreamId("");
  }, [selectedExamId, examProp?.id]);

  // Load streams for the exam's grades
  useEffect(() => {
    if (!isOpen || !exam || !exam.grades.length) return;

    const loadStreams = async () => {
      setStreamsLoading(true);
      try {
        // Get streams linked to exam grades via grade_streams
        const { data: gradeStreams, error } = await supabase
          .from("grade_streams")
          .select("stream_id, grade_id, streams(id, name), grades(id, name)")
          .in("grade_id", exam.grades);

        if (error) throw error;

        const allOptions: StreamOption[] = (gradeStreams || []).map((gs: any) => ({
          id: gs.streams?.id || gs.stream_id,
          name: gs.streams?.name || "Unknown",
          gradeName: gs.grades?.name || "Unknown",
        }));

        // Deduplicate by stream id — a stream can appear under multiple grades
        const seen = new Set<string>();
        const streamOptions = allOptions.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });

        // Sort by grade name then stream name
        streamOptions.sort((a, b) =>
          a.gradeName.localeCompare(b.gradeName) || a.name.localeCompare(b.name),
        );

        setStreams(streamOptions);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load streams",
          variant: "destructive",
        });
      } finally {
        setStreamsLoading(false);
      }
    };

    loadStreams();
  }, [isOpen, exam?.id, exam?.grades]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const csvText = event.target.result as string;
      const rows = csvText.split("\n").map((row) => row.split(","));
      setPreviewData(rows.slice(0, 6));
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = async () => {
    if (!selectedStreamId) {
      toast({
        title: "Select a stream",
        description: "Please select a stream first to generate the sample CSV with student names.",
        variant: "destructive",
      });
      return;
    }

    // Fetch students for this stream
    const { data: students, error } = await supabase
      .from("students")
      .select("name, admission_no")
      .eq("stream_id", selectedStreamId)
      .order("name");

    if (error || !students) {
      toast({
        title: "Error",
        description: "Failed to load students for sample CSV",
        variant: "destructive",
      });
      return;
    }

    const csv = generateSampleMarksCsv(
      students.map((s) => ({ name: s.name, admissionNo: s.admission_no || "" })),
      exam.subjects,
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const streamInfo = streams.find((s) => s.id === selectedStreamId);
    a.download = `marks_${exam.name}_${streamInfo?.gradeName}_${streamInfo?.name}.csv`.replace(/\s+/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!exam) {
      toast({ title: "Error", description: "Please select an exam", variant: "destructive" });
      return;
    }
    if (!csvFile) {
      toast({ title: "Error", description: "Please select a CSV file", variant: "destructive" });
      return;
    }
    if (!selectedStreamId) {
      toast({ title: "Error", description: "Please select a stream", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "Error", description: "User not found", variant: "destructive" });
      return;
    }

    const uploadId = `marks-upload-${Date.now()}`;
    startUpload(uploadId, csvFile.name, 0);
    handleClose();

    toast({
      title: "Upload started",
      description: "Marks upload is processing in the background. You can continue working.",
    });

    chunkedBulkMarkUpload(csvFile, {
      examId: exam.id,
      streamId: selectedStreamId,
      subjects: exam.subjects,
      recordedBy: user.id,
    }, {
      onParsingStart: () => {
        updateProgress(uploadId, { status: "parsing" });
      },
      onParsingComplete: (totalRows) => {
        updateProgress(uploadId, { status: "uploading", totalRows, processedRows: 0 });
      },
      onChunkComplete: (processedRows, successful, failed) => {
        updateProgress(uploadId, { processedRows, successful, failed });
      },
      onComplete: (result) => {
        completeUpload(uploadId, result);
        onUploadComplete?.();
        toast({
          title: "Upload complete",
          description: `Successfully uploaded marks for ${result.successful} students${result.failed > 0 ? ` with ${result.failed} errors` : ""}.`,
        });
      },
      onError: (error) => {
        setUploadError(uploadId, error);
        toast({ title: "Upload failed", description: error, variant: "destructive" });
      },
      onCancelled: (result) => {
        onUploadComplete?.();
        toast({
          title: "Upload cancelled",
          description: `Cancelled after uploading marks for ${result.successful} students.`,
        });
      },
      isCancelled: () => isCancelled(uploadId),
    });
  };

  const handleClose = () => {
    setCsvFile(null);
    setPreviewData([]);
    setSelectedStreamId("");
    setSelectedExamId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  const activeExams = exams.filter(e => e.isActive !== false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Bulk Upload Marks{exam ? ` — ${exam.name}` : ""}</DialogTitle>
          <DialogDescription>
            Upload a CSV file with student marks for a specific stream. The CSV should have columns for student name and each subject.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Exam Selection — only show if no exam prop */}
          {!examProp && (
            <div className="space-y-2">
              <Label>Select Exam</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an exam" />
                </SelectTrigger>
                <SelectContent>
                  {activeExams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stream Selection */}
          <div className="space-y-2">
            <Label>Select Stream</Label>
            <Select value={selectedStreamId} onValueChange={setSelectedStreamId} disabled={!exam}>
              <SelectTrigger>
                <SelectValue placeholder={streamsLoading ? "Loading streams..." : "Choose a stream"} />
              </SelectTrigger>
              <SelectContent>
                {streams.map((stream) => (
                  <SelectItem key={stream.id} value={stream.id}>
                    {stream.gradeName} — {stream.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subjects info */}
          {exam && (
            <div className="space-y-1">
              <Label>Exam Subjects</Label>
              <p className="text-xs text-muted-foreground">
                {exam.subjects.join(", ")}
              </p>
            </div>
          )}

          {/* Sample CSV download */}
          <Button
            variant="link"
            className="p-0 h-auto text-sm"
            onClick={handleDownloadSample}
          >
            <Download className="mr-1 h-3 w-3" />
            Download sample CSV {selectedStreamId ? "with student names" : "(select stream first)"}
          </Button>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label>CSV File</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {csvFile ? "Change File" : "Choose File"}
              </Button>
              <span className="text-sm text-muted-foreground truncate">
                {csvFile ? csvFile.name : "No file selected"}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <Label>Preview</Label>
              <div className="mt-2 max-h-40 overflow-auto rounded border">
                <Table>
                  <TableBody>
                    {previewData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="text-xs py-1 px-2">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Showing {previewData.length} rows preview
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 sm:justify-between">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleBulkUpload}
            disabled={!csvFile || !selectedStreamId || !exam}
          >
            Start Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMarkUploadDialog;
