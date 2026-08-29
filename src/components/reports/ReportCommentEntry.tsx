import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Save, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  type CommentType,
  type ReportComment,
  PRESET_COMMENTS,
  GRADE_BASED_COMMENTS,
  getCommentsForStudent,
  upsertComment,
} from "@/services/reportCommentService";
import { sanitizeInput } from "@/utils/sanitize";

interface ReportCommentEntryProps {
  studentId: string;
  examId: string;
  subjects?: string[];
  commentType: CommentType;
  /** For subject_teacher, which subject */
  subject?: string;
  onSaved?: () => void;
}

const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  subject_teacher: "Subject Teacher's Comment",
  class_teacher: "Class Teacher's Comment",
  head_teacher: "Head Teacher's Comment",
};

export function ReportCommentEntry({
  studentId,
  examId,
  commentType,
  subject,
  onSaved,
}: ReportCommentEntryProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingComment, setExistingComment] = useState<ReportComment | null>(null);
  const [mode, setMode] = useState<"preset" | "custom">("preset");

  useEffect(() => {
    loadExisting();
  }, [studentId, examId, commentType, subject]);

  const loadExisting = async () => {
    try {
      const comments = await getCommentsForStudent(studentId, examId);
      const match = comments.find(
        (c) =>
          c.comment_type === commentType &&
          (commentType === "subject_teacher" ? c.subject === (subject || null) : true)
      );
      if (match) {
        setExistingComment(match);
        setComment(match.comment);
        // Check if it's a preset
        const isPreset = PRESET_COMMENTS[commentType].includes(match.comment);
        setMode(isPreset ? "preset" : "custom");
      }
    } catch {
      // silent
    }
  };

  const handleSave = async () => {
    if (!comment.trim() || !user?.id) return;
    setSaving(true);
    try {
      const sanitized = sanitizeInput(comment.trim());
      await upsertComment(studentId, examId, commentType, sanitized, user.id, subject);
      setSaved(true);
      toast.success("Comment saved");
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err: any) {
      toast.error("Failed to save comment");
    } finally {
      setSaving(false);
    }
  };

  const selectPreset = (preset: string) => {
    setComment(preset);
  };

  const presets = PRESET_COMMENTS[commentType];

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {COMMENT_TYPE_LABELS[commentType]}
          {subject && (
            <Badge variant="secondary" className="text-xs">
              {subject}
            </Badge>
          )}
          {existingComment && (
            <Badge variant="outline" className="text-xs text-primary">
              Saved
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex gap-2">
          <Button
            variant={mode === "preset" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("preset")}
            className="text-xs"
          >
            Preset
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("custom")}
            className="text-xs"
          >
            Custom
          </Button>
        </div>

        {mode === "preset" ? (
          <Select value={comment} onValueChange={selectPreset}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select a comment..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p, i) => (
                <SelectItem key={i} value={p} className="text-sm">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Type your comment..."
            className="text-sm min-h-[60px]"
            maxLength={500}
          />
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {comment.length}/500
          </span>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!comment.trim() || saving}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : saved ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Bulk comment entry panel for a list of students */
interface BulkCommentPanelProps {
  students: Array<{ id: string; name: string; admission_no: string }>;
  examId: string;
  commentType: CommentType;
  subject?: string;
}

export function BulkCommentPanel({
  students,
  examId,
  commentType,
  subject,
}: BulkCommentPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const currentStudent = students.find((s) => s.id === selectedStudent);

  return (
    <div className="space-y-3">
      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
        <SelectTrigger>
          <SelectValue placeholder="Select a student..." />
        </SelectTrigger>
        <SelectContent>
          {students.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.admission_no} - {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentStudent && (
        <ReportCommentEntry
          key={currentStudent.id}
          studentId={currentStudent.id}
          examId={examId}
          commentType={commentType}
          subject={subject}
        />
      )}
    </div>
  );
}
