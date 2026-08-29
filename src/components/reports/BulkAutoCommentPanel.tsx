import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Wand2, Edit2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  GRADE_BASED_COMMENTS,
  getCommentForGrade,
  bulkAutoApplyComments,
} from "@/services/reportCommentService";
import { rubricService } from "@/services/rubricService";
import type { RubricGradeRange } from "@/types/marks";

interface BulkAutoCommentPanelProps {
  examId: string;
  gradeId: string;
  streamId: string;
  subject: string;
  schoolId: string;
}

export function BulkAutoCommentPanel({
  examId,
  gradeId,
  streamId,
  subject,
  schoolId,
}: BulkAutoCommentPanelProps) {
  const { user } = useAuth();
  const [applying, setApplying] = useState(false);
  const [gradeRanges, setGradeRanges] = useState<RubricGradeRange[]>([]);
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [rubricName, setRubricName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRubric();
  }, [subject, schoolId]);

  const loadRubric = async () => {
    setLoading(true);
    try {
      const rubrics = await rubricService.getActiveRubrics(schoolId);

      // Priority: individual rubric for subject > multi-subject rubric containing subject
      const individual = rubrics.find(
        (r) => !r.is_multi_subject && r.subject === subject
      );
      const multi = rubrics.find(
        (r) => r.is_multi_subject && r.subjects.includes(subject)
      );

      const rubric = individual || multi;
      if (rubric) {
        setGradeRanges(rubric.grade_ranges);
        setRubricName(rubric.name);
        // Initialize custom mappings with defaults
        const mappings: Record<string, string> = {};
        for (const range of rubric.grade_ranges) {
          mappings[range.actual_level] = getCommentForGrade(range.actual_level);
        }
        setCustomMappings(mappings);
      } else {
        setGradeRanges([]);
        setRubricName("");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user?.id || gradeRanges.length === 0) return;
    setApplying(true);
    try {
      const result = await bulkAutoApplyComments(
        examId,
        streamId,
        gradeId,
        subject,
        user.id,
        gradeRanges,
        customMappings
      );
      toast.success(
        `Comments applied to ${result.applied} student${result.applied !== 1 ? "s" : ""}` +
          (result.skipped > 0 ? `. ${result.skipped} skipped (no marks found).` : ".")
      );
    } catch (err: any) {
      toast.error("Failed to apply comments: " + (err.message || "Unknown error"));
    } finally {
      setApplying(false);
    }
  };

  const updateMapping = (level: string, comment: string) => {
    setCustomMappings((prev) => ({ ...prev, [level]: comment }));
  };

  const resetMapping = (level: string) => {
    setCustomMappings((prev) => ({
      ...prev,
      [level]: getCommentForGrade(level),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (gradeRanges.length === 0) {
    return (
      <Card className="border-dashed border-muted">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No rubric found for <strong>{subject}</strong>. Create a rubric first to use
          grade-based auto comments.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Auto-Apply Grade-Based Comments
          <Badge variant="secondary" className="text-xs">
            {rubricName}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Automatically assign comments to all students based on their grade in{" "}
          <strong>{subject}</strong>. You can customise the comment for each grade level
          before applying.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="mappings" className="border-b-0">
            <AccordionTrigger className="text-xs py-2 hover:no-underline">
              <span className="flex items-center gap-1">
                <Edit2 className="h-3 w-3" />
                Customise comments per grade ({gradeRanges.length} levels)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {gradeRanges.map((range) => (
                  <div key={range.actual_level} className="flex gap-2 items-start">
                    <Badge
                      variant="outline"
                      className="min-w-[40px] justify-center mt-1.5 text-xs shrink-0"
                    >
                      {range.actual_level}
                    </Badge>
                    <Textarea
                      value={customMappings[range.actual_level] || ""}
                      onChange={(e) =>
                        updateMapping(range.actual_level, e.target.value)
                      }
                      className="text-xs min-h-[40px] flex-1"
                      rows={2}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 mt-1"
                      onClick={() => resetMapping(range.actual_level)}
                      title="Reset to default"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button onClick={handleApply} disabled={applying} className="w-full">
          {applying ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          {applying ? "Applying..." : "Apply Comments to All Students"}
        </Button>
      </CardContent>
    </Card>
  );
}
