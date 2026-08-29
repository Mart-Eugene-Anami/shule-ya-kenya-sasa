import React, { useState, useEffect } from "react";
import { useTimetableGeneration } from "@/contexts/TimetableGenerationContext";
import { CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TimetableGenerationStatus: React.FC = () => {
  const { state, dismissResult } = useTimetableGeneration();
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer for elapsed time during generation
  useEffect(() => {
    if (!state.isGenerating || !state.startedAt) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startedAt!.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isGenerating, state.startedAt]);

  // Nothing to show
  if (!state.isGenerating && !state.result) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 shadow-lg rounded-lg border bg-background overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer",
          state.isGenerating
            ? "bg-primary/10"
            : state.result?.success
              ? "bg-green-500/10"
              : "bg-destructive/10"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {state.isGenerating ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
        ) : state.result?.success ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {state.isGenerating
              ? "Generating timetable…"
              : state.result?.success
                ? "Timetable generated"
                : "Generation failed"}
          </p>
          {state.isGenerating && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(elapsed)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!state.isGenerating && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                dismissResult();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && state.result && (
        <div className="px-4 py-3 space-y-2 border-t max-h-48 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{state.result.message}</p>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {state.result.stats.successfulStreams}/{state.result.stats.totalStreams} streams
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {state.result.stats.filledSlots} filled
            </Badge>
            {state.result.conflicts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {state.result.conflicts.length} conflicts
              </Badge>
            )}
            {state.result.warnings.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {state.result.warnings.length} warnings
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Go to Timetables page for full details.
          </p>
        </div>
      )}

      {/* Progress bar during generation */}
      {state.isGenerating && (
        <div className="h-1 bg-muted overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}
    </div>
  );
};
