import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Timetable, TimetableSlot } from "@/types";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TeacherAssignment {
  teacherId: string;
  subject: string;
  gradeStreamId?: string;
}

type TimetableViewProps = {
  timetable: Timetable;
  editable?: boolean;
  showTeachers?: boolean;
  showRooms?: boolean;
  showConflicts?: boolean;
  teacherAssignments?: TeacherAssignment[];
  gradeStreamId?: string;
  onSlotClick?: (slot: TimetableSlot) => void;
};

interface SlotConflict {
  slot: TimetableSlot;
  reason: string;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  editable = false,
  showTeachers = true,
  showRooms = true,
  showConflicts = true,
  teacherAssignments = [],
  gradeStreamId,
  onSlotClick,
}) => {
  // Detect conflicts - slots where teacher is assigned but not to that subject
  const conflicts = useMemo(() => {
    if (!showConflicts || !teacherAssignments.length || !timetable?.slots) {
      return new Map<string, SlotConflict>();
    }

    const conflictMap = new Map<string, SlotConflict>();

    // Build valid teacher-subject pairs for this grade-stream
    const validAssignments = new Set<string>();
    teacherAssignments.forEach((a) => {
      // If gradeStreamId is provided, only consider assignments for that grade-stream
      if (!gradeStreamId || a.gradeStreamId === gradeStreamId) {
        validAssignments.add(`${a.teacherId}-${a.subject}`);
      }
    });

    timetable.slots.forEach((slot) => {
      if (slot.teacherId && slot.subject) {
        const key = `${slot.teacherId}-${slot.subject}`;
        
        // Check if this teacher-subject combination is valid
        if (!validAssignments.has(key) && validAssignments.size > 0) {
          conflictMap.set(slot.id, {
            slot,
            reason: `${slot.teacher?.name || "Teacher"} is not assigned to teach ${slot.subject} in this class`,
          });
        }
      }
    });

    return conflictMap;
  }, [timetable?.slots, teacherAssignments, gradeStreamId, showConflicts]);

  const conflictCount = conflicts.size;

  if (!timetable || !timetable.slots || timetable.slots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No timetable data available.</p>
        </CardContent>
      </Card>
    );
  }

  const days = Array.from(new Set(timetable.slots.map((slot) => slot.day)));
  const periods = Array.from(
    new Set(timetable.slots.map((slot) => slot.period))
  ).sort((a, b) => a - b);

  // Group slots by day and period for easier access
  const slotsByDayAndPeriod: Record<string, Record<number, TimetableSlot>> = {};
  
  timetable.slots.forEach((slot) => {
    if (!slotsByDayAndPeriod[slot.day]) {
      slotsByDayAndPeriod[slot.day] = {};
    }
    slotsByDayAndPeriod[slot.day][slot.period] = slot;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {timetable.grade?.name} - {timetable.stream?.name} Timetable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conflictCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Assignment Conflicts Detected</AlertTitle>
            <AlertDescription>
              {conflictCount} slot{conflictCount !== 1 ? "s" : ""} have teachers
              who are no longer assigned to the subject. Please update these
              slots or reassign teachers.
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Period</TableHead>
                  {days.map((day) => (
                    <TableHead key={day}>{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period}>
                    <TableCell className="font-medium">
                      {period}{" "}
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          const slotWithTime = timetable.slots.find(
                            (s) => s.period === period
                          );
                          if (slotWithTime) {
                            return slotWithTime.startTime && slotWithTime.endTime ? `(${slotWithTime.startTime.substring(0, 5)} - ${slotWithTime.endTime.substring(0, 5)})` : "";
                          }
                          return "";
                        })()}
                      </span>
                    </TableCell>
                    {days.map((day) => {
                      const slot = slotsByDayAndPeriod[day]?.[period];
                      const conflict = slot ? conflicts.get(slot.id) : null;
                      const hasConflict = !!conflict;

                      return (
                        <TableCell
                          key={`${day}-${period}`}
                          className={`
                            ${editable ? "cursor-pointer hover:bg-muted" : ""}
                            ${hasConflict ? "bg-destructive/10 border-l-2 border-l-destructive" : ""}
                          `}
                          onClick={() => {
                            if (editable && onSlotClick && slot) {
                              onSlotClick(slot);
                            }
                          }}
                        >
                          {slot ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{slot.subject}</span>
                                {hasConflict && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{conflict.reason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              {showTeachers && slot.teacher && (
                                <Badge
                                  variant={hasConflict ? "destructive" : "outline"}
                                  className="text-xs"
                                >
                                  {slot.teacher.name}
                                </Badge>
                              )}
                              {showRooms && slot.room && (
                                <Badge variant="outline" className="text-xs">
                                  {slot.room.name}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};
