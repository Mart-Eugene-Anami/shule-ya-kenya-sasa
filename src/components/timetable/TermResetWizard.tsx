import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";

interface GradeStream {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
}

interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  gradeStreamId: string;
  gradeName: string;
  streamName: string;
}

interface TermResetWizardProps {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  academicYearId: string;
  termId: string;
  termName: string;
  gradeStreams: GradeStream[];
  currentAssignments: TeacherAssignment[];
  onComplete: () => void;
}

type Step = "review" | "confirm" | "processing" | "complete";

export const TermResetWizard: React.FC<TermResetWizardProps> = ({
  open,
  onClose,
  schoolId,
  academicYearId,
  termId,
  termName,
  gradeStreams,
  currentAssignments,
  onComplete,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("review");
  const [clearTimetables, setClearTimetables] = useState(true);
  const [clearAssignments, setClearAssignments] = useState(false);
  const [selectedGradeStream, setSelectedGradeStream] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState({
    timetablesCleared: 0,
    assignmentsCleared: 0,
  });

  // Filter assignments by selected grade-stream
  const filteredAssignments =
    selectedGradeStream === "all"
      ? currentAssignments
      : currentAssignments.filter(
          (a) => a.gradeStreamId === selectedGradeStream
        );

  // Group assignments by grade-stream
  const assignmentsByGradeStream = currentAssignments.reduce((acc, a) => {
    const key = `${a.gradeName} - ${a.streamName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, TeacherAssignment[]>);

  const handleConfirm = async () => {
    setStep("processing");
    setIsProcessing(true);

    try {
      let timetablesCleared = 0;
      let assignmentsCleared = 0;

      // Clear timetables for this term if selected
      if (clearTimetables) {
        const { data: timetables } = await supabase
          .from("timetables")
          .select("id")
          .eq("school_id", schoolId)
          .eq("term_id", termId);

        for (const timetable of timetables || []) {
          await supabase
            .from("timetable_slots")
            .delete()
            .eq("timetable_id", timetable.id);

          await supabase.from("timetables").delete().eq("id", timetable.id);

          timetablesCleared++;
        }
      }

      // Clear teacher subject assignments if selected
      if (clearAssignments) {
        const { data: assignments } = await supabase
          .from("teacher_subject_assignments")
          .select("id")
          .eq("academic_year_id", academicYearId);

        if (assignments && assignments.length > 0) {
          await supabase
            .from("teacher_subject_assignments")
            .delete()
            .eq("academic_year_id", academicYearId);

          assignmentsCleared = assignments.length;
        }
      }

      setResults({ timetablesCleared, assignmentsCleared });
      setStep("complete");

      toast({
        title: "Term Reset Complete",
        description: `Reset completed for ${termName}.`,
      });
    } catch (error: any) {
      console.error("Term reset error:", error);
      toast({
        title: "Reset Error",
        description: error.message || "Failed to complete term reset.",
        variant: "destructive",
      });
      setStep("review");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (step === "complete") {
      onComplete();
    }
    setStep("review");
    setClearTimetables(true);
    setClearAssignments(false);
    setSelectedGradeStream("all");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "review" && `Term Reset: ${termName}`}
            {step === "confirm" && "Confirm Term Reset"}
            {step === "processing" && "Processing Reset..."}
            {step === "complete" && "Reset Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "review" &&
              "Review current teacher assignments and prepare for the new term."}
            {step === "confirm" && "Please confirm the reset actions."}
            {step === "processing" && "Please wait while we process the reset."}
            {step === "complete" && "The term reset has been completed."}
          </DialogDescription>
        </DialogHeader>

        {step === "review" && (
          <div className="space-y-6">
            {/* Current Assignments Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Current Teacher-Subject Assignments
                  <Badge variant="secondary">
                    {currentAssignments.length} assignments
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select
                    value={selectedGradeStream}
                    onValueChange={setSelectedGradeStream}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {gradeStreams.map((gs) => (
                        <SelectItem key={gs.id} value={gs.id}>
                          {gs.gradeName} - {gs.streamName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredAssignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No teacher assignments found.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              {a.gradeName} - {a.streamName}
                            </TableCell>
                            <TableCell>{a.subject}</TableCell>
                            <TableCell>{a.teacherName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reset Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reset Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="clearTimetables"
                    checked={clearTimetables}
                    onCheckedChange={(checked) =>
                      setClearTimetables(checked as boolean)
                    }
                  />
                  <div>
                    <label
                      htmlFor="clearTimetables"
                      className="font-medium cursor-pointer"
                    >
                      Clear all timetables for this term
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Removes all generated timetables so new ones can be
                      created with updated assignments.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="clearAssignments"
                    checked={clearAssignments}
                    onCheckedChange={(checked) =>
                      setClearAssignments(checked as boolean)
                    }
                  />
                  <div>
                    <label
                      htmlFor="clearAssignments"
                      className="font-medium cursor-pointer"
                    >
                      Clear all teacher-subject assignments
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Removes all teacher-subject assignments. Use this if you
                      want to start fresh with new assignments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!clearTimetables && !clearAssignments}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">
                    Confirm Reset Actions
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">
                    The following actions will be performed:
                  </p>
                  <ul className="list-disc list-inside text-sm text-amber-700 mt-2">
                    {clearTimetables && (
                      <li>All timetables for {termName} will be deleted</li>
                    )}
                    {clearAssignments && (
                      <li>
                        All {currentAssignments.length} teacher-subject
                        assignments will be cleared
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
              <p className="text-sm text-blue-700">
                After the reset, you will need to:
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                {clearAssignments && (
                  <li>Reassign teachers to subjects for each class</li>
                )}
                <li>Generate new timetables for each grade-stream</li>
                <li>Review and edit timetables as needed</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("review")}>
                Back
              </Button>
              <Button onClick={handleConfirm} variant="destructive">
                <RefreshCw className="w-4 h-4 mr-2" />
                Confirm Reset
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Processing term reset...</p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold">Reset Complete!</h3>
              <p className="text-muted-foreground mt-2">
                The term reset for {termName} has been completed successfully.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.timetablesCleared > 0 && (
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <strong>{results.timetablesCleared}</strong> timetables
                        cleared
                      </span>
                    </li>
                  )}
                  {results.assignmentsCleared > 0 && (
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <strong>{results.assignmentsCleared}</strong> teacher
                        assignments cleared
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-800">
                <strong>Next steps:</strong> Go to the Teacher Assignments tab
                to set up teacher-subject assignments, then generate new
                timetables for each class.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
