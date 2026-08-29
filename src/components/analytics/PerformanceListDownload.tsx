import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Printer, Loader2 } from "lucide-react";
import { performanceListService } from "@/services/performanceListService";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Exam {
  id: string;
  name: string;
  term_id?: string | null;
  term_name?: string | null;
}

interface PerformanceListDownloadProps {
  gradeId: string;
  streamId?: string;
  exams: Exam[];
  selectedExamId?: string;
}

export function PerformanceListDownload({
  gradeId,
  streamId,
  exams,
  selectedExamId,
}: PerformanceListDownloadProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>(
    selectedExamId ? [selectedExamId] : []
  );
  const [loading, setLoading] = useState(false);

  // Group exams by term
  const groupedExams = useMemo(() => {
    const groups: { termName: string; termId: string | null; exams: Exam[] }[] = [];
    const termMap = new Map<string, Exam[]>();
    const noTermExams: Exam[] = [];

    exams.forEach((exam) => {
      const key = exam.term_id || "__no_term__";
      if (key === "__no_term__") {
        noTermExams.push(exam);
      } else {
        if (!termMap.has(key)) termMap.set(key, []);
        termMap.get(key)!.push(exam);
      }
    });

    termMap.forEach((termExams, termId) => {
      groups.push({
        termName: termExams[0]?.term_name || "Unknown Term",
        termId,
        exams: termExams,
      });
    });

    if (noTermExams.length > 0) {
      groups.push({ termName: "No Term", termId: null, exams: noTermExams });
    }

    return groups;
  }, [exams]);

  const toggleExam = (examId: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(examId)
        ? prev.filter((id) => id !== examId)
        : [...prev, examId]
    );
  };

  const toggleTerm = (termExams: Exam[]) => {
    const termExamIds = termExams.map((e) => e.id);
    const allSelected = termExamIds.every((id) => selectedExamIds.includes(id));
    if (allSelected) {
      setSelectedExamIds((prev) => prev.filter((id) => !termExamIds.includes(id)));
    } else {
      setSelectedExamIds((prev) => [...new Set([...prev, ...termExamIds])]);
    }
  };

  const handleAction = async (action: "download" | "print") => {
    if (selectedExamIds.length === 0) {
      toast({
        title: "No exams selected",
        description: "Please select at least one exam",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = streamId
        ? await performanceListService.getStreamPerformanceList(streamId, gradeId, selectedExamIds)
        : await performanceListService.getGradePerformanceList(gradeId, selectedExamIds);

      if (!data) {
        toast({
          title: "No data",
          description: "No marks found for the selected exams",
          variant: "destructive",
        });
        return;
      }

      if (action === "download") {
        await performanceListService.downloadAsPDF(data);
        toast({ title: "PDF Downloaded", description: data.title });
      } else {
        performanceListService.printList(data);
      }
      setOpen(false);
    } catch (error) {
      console.error("Error generating performance list:", error);
      toast({
        title: "Error",
        description: "Failed to generate performance list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasTermGroups = groupedExams.length > 1 || (groupedExams.length === 1 && groupedExams[0].termId !== null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Performance List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Performance List</DialogTitle>
          <DialogDescription>
            Select exams to include. Choose multiple for an aggregate report combining scores across exams.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto py-2">
          {exams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No exams available
            </p>
          ) : hasTermGroups ? (
            <Accordion type="multiple" defaultValue={groupedExams.map((g) => g.termName)} className="space-y-1">
              {groupedExams.map((group) => {
                const termExamIds = group.exams.map((e) => e.id);
                const selectedCount = termExamIds.filter((id) => selectedExamIds.includes(id)).length;
                const allSelected = selectedCount === termExamIds.length;

                return (
                  <AccordionItem key={group.termName} value={group.termName} className="border rounded-md px-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleTerm(group.exams)}
                        className="ml-1"
                      />
                      <AccordionTrigger className="flex-1 py-2 text-sm font-medium hover:no-underline">
                        <div className="flex items-center gap-2">
                          {group.termName}
                          {selectedCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedCount}/{termExamIds.length}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="pb-2">
                      <div className="space-y-1 pl-6">
                        {group.exams.map((exam) => (
                          <label
                            key={exam.id}
                            className="flex items-center gap-3 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedExamIds.includes(exam.id)}
                              onCheckedChange={() => toggleExam(exam.id)}
                            />
                            <span className="text-sm">{exam.name}</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="space-y-2">
              {exams.map((exam) => (
                <label
                  key={exam.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedExamIds.includes(exam.id)}
                    onCheckedChange={() => toggleExam(exam.id)}
                  />
                  <span className="text-sm">{exam.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedExamIds.length > 1 && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            📊 <strong>Aggregate mode:</strong> Scores will be averaged across {selectedExamIds.length} exams
          </p>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleAction("print")}
            disabled={loading || selectedExamIds.length === 0}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button
            onClick={() => handleAction("download")}
            disabled={loading || selectedExamIds.length === 0}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
