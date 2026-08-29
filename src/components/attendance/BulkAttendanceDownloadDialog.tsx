import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  generateBulkAttendancePDFs,
  generateAndDownloadPeriodAttendance,
  type PeriodAttendanceData,
} from "@/utils/attendanceExport";

interface StreamGradeOption {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
}

interface BulkAttendanceDownloadDialogProps {
  schoolId: string;
  combinations: StreamGradeOption[];
}

const BulkAttendanceDownloadDialog = ({
  schoolId,
  combinations,
}: BulkAttendanceDownloadDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCombinations, setSelectedCombinations] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Select all by default when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCombinations(combinations.map((c) => c.id));
    }
  }, [open, combinations]);

  const toggleCombination = (id: string) => {
    setSelectedCombinations((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCombinations.length === combinations.length) {
      setSelectedCombinations([]);
    } else {
      setSelectedCombinations(combinations.map((c) => c.id));
    }
  };

  const handleDownload = async () => {
    if (selectedCombinations.length === 0) {
      toast({ title: "No streams selected", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: selectedCombinations.length });

    try {
      const selected = combinations.filter((c) => selectedCombinations.includes(c.id));
      const periodDataItems: PeriodAttendanceData[] = [];

      // Fetch school name
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .single();

      for (const combo of selected) {
        // Get students for this stream+grade
        const { data: students } = await supabase
          .from("students")
          .select("id, name, admission_no")
          .eq("stream_id", combo.streamId)
          .eq("grade_id", combo.gradeId)
          .eq("status", "active")
          .order("name");

        if (!students?.length) continue;

        const studentIds = students.map((s) => s.id);

        // Get attendance records in date range
        const { data: records } = await supabase
          .from("attendance")
          .select("id, date, status, student_id")
          .in("student_id", studentIds)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date");

        if (!records?.length) continue;

        // Build date list from actual records
        const uniqueDates = [...new Set(records.map((r) => r.date))].sort();

        // Build period data for each student
        const periodStudents = students.map((s) => {
          const dailyStatuses = uniqueDates.map((d) => {
            const rec = records.find((r) => r.student_id === s.id && r.date === d);
            return { date: d, status: rec?.status || "-" };
          });
          const presentCount = dailyStatuses.filter((ds) => ds.status === "Present").length;
          const absentCount = dailyStatuses.filter((ds) => ds.status === "Absent").length;
          const lateCount = dailyStatuses.filter((ds) => ds.status === "Late").length;
          const totalRecorded = presentCount + absentCount + lateCount;

          return {
            admissionNo: s.admission_no,
            studentName: s.name,
            dailyStatuses,
            presentCount,
            absentCount,
            lateCount,
            attendanceRate: totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0,
          };
        });

        periodDataItems.push({
          schoolName: school?.name,
          gradeName: combo.gradeName,
          streamName: combo.streamName,
          startDate,
          endDate,
          students: periodStudents,
          dates: uniqueDates,
        });
      }

      if (periodDataItems.length === 0) {
        toast({
          title: "No records found",
          description: "No attendance records found for the selected streams and date range.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Single stream → direct PDF, multiple → ZIP
      if (periodDataItems.length === 1) {
        generateAndDownloadPeriodAttendance(periodDataItems[0]);
      } else {
        await generateBulkAttendancePDFs(periodDataItems, (current, total) => {
          setProgress({ current, total });
        });
      }

      toast({ title: "Download complete", description: `${periodDataItems.length} attendance sheet(s) generated.` });
      setOpen(false);
    } catch (error) {
      console.error("Bulk download error:", error);
      toast({ title: "Download failed", description: "An error occurred generating PDFs.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Bulk Download
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Attendance Download</DialogTitle>
          <DialogDescription>
            Download attendance sheets as PDF for multiple streams over a custom period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>

          {/* Stream selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Grades / Streams</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {selectedCombinations.length === combinations.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
              {combinations.map((combo) => (
                <label
                  key={combo.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedCombinations.includes(combo.id)}
                    onCheckedChange={() => toggleCombination(combo.id)}
                  />
                  {combo.gradeName} - {combo.streamName}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCombinations.length} of {combinations.length} selected
            </p>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} />
              <p className="text-xs text-muted-foreground text-center">
                Generating PDF {progress.current} of {progress.total}...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating || selectedCombinations.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Download PDFs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAttendanceDownloadDialog;
