import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface TimetableSlot {
  id: string;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherName?: string;
}

interface ClassTimetableProps {
  streamId: string;
  gradeId: string;
  gradeName: string;
  streamName: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function ClassTimetable({
  streamId,
  gradeId,
  gradeName,
  streamName
}: ClassTimetableProps) {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<number[]>([]);

  useEffect(() => {
    fetchTimetable();
  }, [streamId, gradeId]);

  const fetchTimetable = async () => {
    try {
      // Get active timetable for this grade-stream
      const { data: timetable } = await supabase
        .from("timetables")
        .select("id")
        .eq("grade_id", gradeId)
        .eq("stream_id", streamId)
        .eq("is_active", true)
        .maybeSingle();

      if (!timetable) {
        setLoading(false);
        return;
      }

      // Get slots for this timetable
      const { data: slotsData, error } = await supabase
        .from("timetable_slots")
        .select(`
          id,
          day,
          period,
          start_time,
          end_time,
          subject,
          teacher_id,
          teachers!timetable_slots_teacher_id_fkey(name)
        `)
        .eq("timetable_id", timetable.id)
        .order("day")
        .order("period");

      if (error) throw error;

      const mappedSlots: TimetableSlot[] = (slotsData || []).map((s: any) => ({
        id: s.id,
        day: s.day,
        period: s.period,
        startTime: s.start_time,
        endTime: s.end_time,
        subject: s.subject,
        teacherName: s.teachers?.name
      }));

      setSlots(mappedSlots);

      // Get unique periods
      const uniquePeriods = [...new Set(mappedSlots.map(s => s.period))].sort((a, b) => a - b);
      setPeriods(uniquePeriods);
    } catch (error) {
      console.error("Error fetching timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSlot = (day: string, period: number) => {
    return slots.find(s => s.day === day && s.period === period);
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Class Timetable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No timetable available for this class yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">Timetable: {gradeName} {streamName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Mobile: Card-based view */}
        <div className="block sm:hidden space-y-3">
          {DAYS.map(day => {
            const daySlots = slots.filter(s => s.day === day);
            if (daySlots.length === 0) return null;
            return (
              <div key={day} className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2 text-primary">{day}</h4>
                <div className="space-y-2">
                  {daySlots.sort((a, b) => a.period - b.period).map((slot, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/50 rounded p-2 text-xs">
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">
                          {slot.subject}
                        </Badge>
                        <p className="text-muted-foreground">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </p>
                      </div>
                      {slot.teacherName && (
                        <p className="text-muted-foreground text-right">{slot.teacherName}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="border p-2 bg-muted text-left text-xs sm:text-sm">Period</th>
                {DAYS.map(day => (
                  <th key={day} className="border p-2 bg-muted text-center text-xs sm:text-sm min-w-[90px] lg:min-w-[120px]">
                    {day.slice(0, 3)}
                    <span className="hidden lg:inline">{day.slice(3)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => {
                const firstSlot = slots.find(s => s.period === period);
                return (
                  <tr key={period}>
                    <td className="border p-2 bg-muted/50">
                      <div className="font-medium text-xs sm:text-sm">P{period}</div>
                      {firstSlot && (
                        <div className="text-xs text-muted-foreground hidden lg:block">
                          {formatTime(firstSlot.startTime)}
                        </div>
                      )}
                    </td>
                    {DAYS.map(day => {
                      const slot = getSlot(day, period);
                      return (
                        <td key={day} className="border p-1 sm:p-2 text-center">
                          {slot ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="font-medium text-xs">
                                {slot.subject}
                              </Badge>
                              {slot.teacherName && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {slot.teacherName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
