import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useBulkUpload } from "@/contexts/BulkUploadContext";
import { chunkedTeacherBulkUpload } from "@/services/bulkTeacherUploadService";
import { useAuth } from "@/contexts/AuthContext";
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
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

interface TeacherBulkImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

const TeacherBulkImportDialog = ({
  isOpen,
  onOpenChange,
  onUploadComplete,
}: TeacherBulkImportDialogProps) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { startUpload, updateProgress, completeUpload, setUploadError, isCancelled } = useBulkUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      
      const csvText = event.target.result as string;
      const rows = csvText.split('\n').map(row => row.split(','));
      
      setPreviewData(rows.slice(0, 6));
    };
    
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!user?.schoolId) {
      toast({
        title: "Error",
        description: "No school ID found",
        variant: "destructive",
      });
      return;
    }

    const uploadId = `teacher-upload-${Date.now()}`;
    
    // Start the upload in the background
    startUpload(uploadId, csvFile.name, 0);
    
    // Close dialog immediately so user can continue working
    handleClose();
    
    toast({
      title: "Upload started",
      description: "Teacher upload is processing in the background. You can continue working.",
    });

    // Process upload in background
    chunkedTeacherBulkUpload(csvFile, user.schoolId, {
      onParsingStart: () => {
        updateProgress(uploadId, { status: 'parsing' });
      },
      onParsingComplete: (totalRows) => {
        updateProgress(uploadId, { 
          status: 'uploading', 
          totalRows,
          processedRows: 0,
        });
      },
      onChunkComplete: (processedRows, successful, failed) => {
        updateProgress(uploadId, { 
          processedRows, 
          successful, 
          failed,
        });
      },
      onComplete: (result) => {
        completeUpload(uploadId, result);
        onUploadComplete?.();
        
        toast({
          title: "Upload complete",
          description: `Successfully imported ${result.successful} teachers${result.failed > 0 ? ` with ${result.failed} errors` : ''}.`,
        });
      },
      onError: (error) => {
        setUploadError(uploadId, error);
        
        toast({
          title: "Upload failed",
          description: error,
          variant: "destructive",
        });
      },
      onCancelled: (result) => {
        onUploadComplete?.();
        
        toast({
          title: "Upload cancelled",
          description: `Cancelled after importing ${result.successful} teachers.`,
          variant: "default",
        });
      },
      isCancelled: () => isCancelled(uploadId),
    });
  };

  const downloadSampleCsv = () => {
    const csvContent = 
      "name,email,subject,subjects_taught,is_stream_teacher,qualification,employment_type,hire_date\n" +
      "John Kamau,john.kamau@school.com,Mathematics,Physics|Chemistry,false,B.Ed Mathematics,Full-time,2020-01-15\n" +
      "Mary Wanjiru,,English,,true,,,\n" +
      "James Maina,james.maina@school.com,Science,Biology,false,B.Sc Biology,Part-time,2021-03-10\n" +
      "Sarah Otieno,,,,,,,";
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teachers_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setCsvFile(null);
    setPreviewData([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Teachers</DialogTitle>
          <DialogDescription>
            Upload a CSV file with teacher details. Only <strong>name</strong> is required — all other fields are optional and can be filled later.
            <Button variant="link" className="p-0 h-auto" onClick={downloadSampleCsv}>
              Download sample CSV
              <Download className="ml-1 h-3 w-3" />
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="csv-upload">CSV File</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {previewData.length > 0 && (
            <div>
              <Label>Preview</Label>
              <div className="mt-2 max-h-40 overflow-auto rounded border">
                <Table>
                  <TableBody>
                    {previewData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="text-xs">{cell}</TableCell>
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

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleBulkUpload}
            disabled={!csvFile}
          >
            Start Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherBulkImportDialog;
