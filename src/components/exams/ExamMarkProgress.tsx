import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Exam, Grade } from "@/types";
import { CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface StreamInfo {
  streamId: string;
  streamName: string;
  gradeName: string;
  gradeId: string;
}

interface MarkEntryStatus {
  streamId: string;
  subject: string;
  hasMarks: boolean;
  markCount: number;
}

interface ExamMarkProgressProps {
  exam: Exam;
  grades: Grade[];
}

const ExamMarkProgress = ({ exam, grades }: ExamMarkProgressProps) => {
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [markStatuses, setMarkStatuses] = useState<MarkEntryStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    fetchProgress();
  }, [expanded, exam.id]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      // 1. Get all streams for the exam's grades
      const { data: streamData, error: streamError } = await supabase
        .from("streams")
        .select("id, name, grade_id")
        .in("grade_id", exam.grades);

      if (streamError) throw streamError;

      // Build stream info with grade names
      const streamInfos: StreamInfo[] = (streamData || []).map((s) => {
        const grade = grades.find((g) => g.id === s.grade_id);
        return {
          streamId: s.id,
          streamName: s.name,
          gradeName: grade?.name || "Unknown",
          gradeId: s.grade_id || "",
        };
      });
      setStreams(streamInfos);

      if (streamInfos.length === 0) {
        setMarkStatuses([]);
        setLoading(false);
        return;
      }

      // 2. Get students in these streams to map marks back to streams
      const streamIds = streamInfos.map((s) => s.streamId);
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, stream_id")
        .in("stream_id", streamIds);

      if (studentError) throw studentError;

      const studentStreamMap = new Map<string, string>();
      (studentData || []).forEach((st) => {
        studentStreamMap.set(st.id, st.stream_id);
      });

      // 3. Get marks for this exam
      const studentIds = (studentData || []).map((s) => s.id);
      let markEntries: MarkEntryStatus[] = [];

      if (studentIds.length > 0) {
        // Batch query if many students - get distinct stream+subject combos with counts
        const { data: markData, error: markError } = await supabase
          .from("marks")
          .select("student_id, subject")
          .eq("exam_id", exam.id)
          .in("student_id", studentIds);

        if (markError) throw markError;

        // Aggregate: count marks per stream+subject
        const countMap = new Map<string, number>();
        (markData || []).forEach((m) => {
          const streamId = studentStreamMap.get(m.student_id);
          if (streamId) {
            const key = `${streamId}::${m.subject}`;
            countMap.set(key, (countMap.get(key) || 0) + 1);
          }
        });

        // Build status for every stream+subject combo
        for (const stream of streamInfos) {
          for (const subject of exam.subjects) {
            const key = `${stream.streamId}::${subject}`;
            const count = countMap.get(key) || 0;
            markEntries.push({
              streamId: stream.streamId,
              subject,
              hasMarks: count > 0,
              markCount: count,
            });
          }
        }
      } else {
        // No students — all pending
        for (const stream of streamInfos) {
          for (const subject of exam.subjects) {
            markEntries.push({
              streamId: stream.streamId,
              subject,
              hasMarks: false,
              markCount: 0,
            });
          }
        }
      }

      setMarkStatuses(markEntries);
    } catch (err) {
      // Silently handle — progress is informational
    } finally {
      setLoading(false);
    }
  };

  // Summary calculations
  const totalCombinations = streams.length * exam.subjects.length;
  const completedCombinations = markStatuses.filter((m) => m.hasMarks).length;
  const progressPercent =
    totalCombinations > 0
      ? Math.round((completedCombinations / totalCombinations) * 100)
      : 0;

  // Group streams by grade
  const streamsByGrade = streams.reduce<
    Record<string, { gradeName: string; streams: StreamInfo[] }>
  >((acc, s) => {
    if (!acc[s.gradeId]) {
      acc[s.gradeId] = { gradeName: s.gradeName, streams: [] };
    }
    acc[s.gradeId].streams.push(s);
    return acc;
  }, {});

  const getStreamSubjectStatus = (streamId: string, subject: string) => {
    return markStatuses.find(
      (m) => m.streamId === streamId && m.subject === subject
    );
  };

  return (
    <div className="border-t bg-muted/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Mark Entry Progress
          {!expanded && completedCombinations > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCombinations}/{totalCombinations}
            </Badge>
          )}
        </span>
        {!expanded && totalCombinations > 0 && (
          <div className="w-24">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : streams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No streams found for the selected grades.
            </p>
          ) : (
            <>
              {/* Overall progress bar */}
              <div className="flex items-center gap-3">
                <Progress value={progressPercent} className="h-2 flex-1" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {completedCombinations}/{totalCombinations} completed
                </span>
              </div>

              {/* Per-grade breakdown */}
              {Object.entries(streamsByGrade).map(
                ([gradeId, { gradeName, streams: gradeStreams }]) => (
                  <div key={gradeId} className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {gradeName}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 pr-3 font-medium text-muted-foreground whitespace-nowrap">
                              Stream
                            </th>
                            {exam.subjects.map((subject) => (
                              <th
                                key={subject}
                                className="text-center px-1.5 py-1 font-medium text-muted-foreground whitespace-nowrap"
                              >
                                {subject}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gradeStreams.map((stream) => (
                            <tr key={stream.streamId} className="border-b border-border/50">
                              <td className="py-1.5 pr-3 font-medium whitespace-nowrap">
                                {stream.streamName}
                              </td>
                              {exam.subjects.map((subject) => {
                                const status = getStreamSubjectStatus(
                                  stream.streamId,
                                  subject
                                );
                                const done = status?.hasMarks ?? false;
                                return (
                                  <td
                                    key={subject}
                                    className="text-center px-1.5 py-1.5"
                                  >
                                    {done ? (
                                      <span className="inline-flex items-center gap-0.5 text-green-600">
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        <span className="text-[10px]">
                                          {status?.markCount}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-amber-500">
                                        <Clock className="h-3.5 w-3.5" />
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}

              {/* Legend */}
              <div className="flex gap-4 text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" /> Marks entered
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" /> Pending
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamMarkProgress;
