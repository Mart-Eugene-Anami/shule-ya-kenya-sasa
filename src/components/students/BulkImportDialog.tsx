import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useBulkUpload } from "@/contexts/BulkUploadContext";
import { chunkedBulkUpload } from "@/services/bulkStudentUploadService";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Download, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BulkImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

const BulkImportDialog = ({
  isOpen,
  onOpenChange,
  onUploadComplete,
}: BulkImportDialogProps) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [createAccounts, setCreateAccounts] = useState(false);
  
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

    const uploadId = `upload-${Date.now()}`;
    
    // Start the upload in the background
    startUpload(uploadId, csvFile.name, 0);
    
    // Close dialog immediately so user can continue working
    handleClose();
    
    toast({
      title: "Upload started",
      description: "Your upload is processing in the background. You can continue working.",
    });

    // Process upload in background
    chunkedBulkUpload(csvFile, user.schoolId, {
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
        
        const accountNote = createAccounts 
          ? ' Student accounts were created with passwords set to their full name (lowercase, no spaces).'
          : '';
        
        toast({
          title: "Upload complete",
          description: `Successfully imported ${result.successful} students${result.failed > 0 ? ` with ${result.failed} errors` : ''}.${accountNote}`,
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
          description: `Cancelled after importing ${result.successful} students.`,
          variant: "default",
        });
      },
      isCancelled: () => isCancelled(uploadId),
    }, { createAccounts });
  };

  const downloadSampleCsv = () => {
    const csvContent = 
      "admission_number,name,date_of_birth,grade_stream,contact,pathway,track,email\n" +
      "001,John Kamau,2012-05-15,Grade 5 - Red,0712345678,,,john.kamau@school.com\n" +
      "002,Mary Wanjiru,2012-08-20,Grade 5 - Blue,0723456789,,,mary.wanjiru@school.com\n" +
      "003,James Maina,2010-03-10,Form 1 - Yellow,0734567890,,,\n" +
      "004,Sarah Otieno,2009-11-25,Form 2 - Green,0745678901,,,\n" +
      "005,Peter Ochieng,2008-07-12,Grade 10 - Red,0756789012,stem,Track A - Biology/Chemistry/Physics,peter.o@school.com\n" +
      "006,Grace Njeri,2007-04-08,Grade 11 - Blue,0767890123,arts_sports,Track B - Music/Theatre/Visual Arts,grace.n@school.com";
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setCsvFile(null);
    setPreviewData([]);
    setCreateAccounts(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
             Upload a CSV file with student details. Use "Grade X - Stream" for CBE or "Form X - Stream" for 8-4-4 schools.
             For CBE Senior students (Grade 10-12), include pathway (stem, arts_sports, or social_sciences) and optionally a track name.
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

          <div className="flex items-start space-x-3 rounded-md border p-3 bg-muted/30">
            <Checkbox
              id="create-accounts"
              checked={createAccounts}
              onCheckedChange={(checked) => setCreateAccounts(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="create-accounts"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Create student login accounts
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Automatically creates login accounts for students with email addresses. Passwords will be the student's full name in lowercase with no spaces.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Requires email column in CSV. Password format: full name (lowercase, no spaces)
              </p>
            </div>
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
                          <TableCell key={cellIndex}>{cell}</TableCell>
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

export default BulkImportDialog;
