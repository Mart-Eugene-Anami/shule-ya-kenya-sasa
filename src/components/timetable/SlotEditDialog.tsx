
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { TimetableSlot, Teacher, Room } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TeacherAssignment {
  id: string;
  teacherId: string;
  subject: string;
  teacherName: string;
}

interface ConflictInfo {
  type: "teacher" | "room" | "subject_time";
  message: string;
  severity: "error" | "warning";
}

type SlotEditDialogProps = {
  open: boolean;
  slot: TimetableSlot | null;
  subjects: string[];
  teachers: Teacher[];
  rooms: Room[];
  teacherAssignments?: TeacherAssignment[];
  onClose: () => void;
  onSave: (updatedSlot: Partial<TimetableSlot>) => Promise<void>;
};

export const SlotEditDialog: React.FC<SlotEditDialogProps> = ({
  open,
  slot,
  subjects,
  teachers,
  rooms,
  teacherAssignments = [],
  onClose,
  onSave,
}) => {
  const [subject, setSubject] = React.useState<string>("");
  const [teacherId, setTeacherId] = React.useState<string>("");
  const [roomId, setRoomId] = React.useState<string>("");
  const [startTime, setStartTime] = React.useState<string>("");
  const [endTime, setEndTime] = React.useState<string>("");
  const [saving, setSaving] = React.useState<boolean>(false);

  // Initialize form values when slot changes
  React.useEffect(() => {
    if (slot) {
      setSubject(slot.subject);
      setTeacherId(slot.teacherId || "");
      setRoomId(slot.roomId || "");
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
    }
  }, [slot]);

  // Fetch all slots for the same timetable to detect conflicts in real-time
  const { data: allSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["timetableSlots", slot?.timetableId],
    queryFn: async () => {
      if (!slot?.timetableId) return [];
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, day, period, subject, teacher_id, room_id, start_time, end_time, timetable_id")
        .eq("timetable_id", slot.timetableId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!slot?.timetableId && open,
  });

  // Also fetch slots from OTHER timetables for the same school/term to detect cross-class conflicts
  const { data: schoolWideSlots = [], isLoading: loadingSchoolSlots } = useQuery({
    queryKey: ["schoolTimetableSlots", slot?.timetableId, slot?.day, slot?.period],
    queryFn: async () => {
      if (!slot?.timetableId || !slot?.day) return [];
      
      // Get the timetable info to find school/term context
      const { data: timetable } = await supabase
        .from("timetables")
        .select("school_id, term_id, academic_year_id")
        .eq("id", slot.timetableId)
        .single();
      
      if (!timetable) return [];

      // Fetch all timetable IDs for the same school/term
      const { data: timetables } = await supabase
        .from("timetables")
        .select("id")
        .eq("school_id", timetable.school_id)
        .eq("term_id", timetable.term_id)
        .eq("academic_year_id", timetable.academic_year_id)
        .neq("id", slot.timetableId);

      if (!timetables || timetables.length === 0) return [];

      const timetableIds = timetables.map(t => t.id);

      // Fetch slots from other timetables for the same day and period
      const { data: otherSlots, error } = await supabase
        .from("timetable_slots")
        .select("id, day, period, subject, teacher_id, room_id, timetable_id")
        .in("timetable_id", timetableIds)
        .eq("day", slot.day)
        .eq("period", slot.period);

      if (error) throw error;
      return otherSlots || [];
    },
    enabled: !!slot?.timetableId && !!slot?.day && open,
  });

  // Fetch subject time constraints
  const { data: timeConstraints = [] } = useQuery({
    queryKey: ["subjectTimeConstraints", slot?.timetableId],
    queryFn: async () => {
      if (!slot?.timetableId) return [];
      const { data: timetable } = await supabase
        .from("timetables")
        .select("school_id")
        .eq("id", slot.timetableId)
        .single();
      if (!timetable) return [];
      
      const { data, error } = await supabase
        .from("timetable_constraints")
        .select("entity_name, max_value")
        .eq("school_id", timetable.school_id)
        .eq("constraint_type", "subject_max_period")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!slot?.timetableId && open,
  });

  // Compute conflicts in real-time based on current selections
  const conflicts = useMemo<ConflictInfo[]>(() => {
    if (!slot) return [];
    const result: ConflictInfo[] = [];

    const effectiveTeacherId = teacherId === "none" ? "" : teacherId;
    const effectiveRoomId = roomId === "none" ? "" : roomId;

    // 1. Teacher double-booking: same teacher assigned to another class at the same day/period
    if (effectiveTeacherId) {
      const teacherConflicts = schoolWideSlots.filter(
        s => s.teacher_id === effectiveTeacherId && s.id !== slot.id
      );

      // Also check same timetable, different period is fine — same day+period is a conflict
      const sameTableConflicts = allSlots.filter(
        s => s.teacher_id === effectiveTeacherId &&
          s.day === slot.day &&
          s.period === slot.period &&
          s.id !== slot.id
      );

      const allTeacherConflicts = [...teacherConflicts, ...sameTableConflicts];
      
      if (allTeacherConflicts.length > 0) {
        const teacherName = teachers.find(t => t.id === effectiveTeacherId)?.name || "Selected teacher";
        result.push({
          type: "teacher",
          message: `${teacherName} is already teaching in another class on ${slot.day}, Period ${slot.period}.`,
          severity: "error",
        });
      }
    }

    // 2. Room double-booking: same room used elsewhere at the same day/period
    if (effectiveRoomId) {
      const roomConflicts = schoolWideSlots.filter(
        s => s.room_id === effectiveRoomId && s.id !== slot.id
      );

      const sameTableRoomConflicts = allSlots.filter(
        s => s.room_id === effectiveRoomId &&
          s.day === slot.day &&
          s.period === slot.period &&
          s.id !== slot.id
      );

      const allRoomConflicts = [...roomConflicts, ...sameTableRoomConflicts];

      if (allRoomConflicts.length > 0) {
        const roomName = rooms.find(r => r.id === effectiveRoomId)?.name || "Selected room";
        result.push({
          type: "room",
          message: `${roomName} is already in use by another class on ${slot.day}, Period ${slot.period}.`,
          severity: "error",
        });
      }
    }

    // 3. Subject time restriction: subject cannot occur after a certain period
    if (subject) {
      const restriction = timeConstraints.find(c => c.entity_name === subject);
      if (restriction && slot.period > restriction.max_value) {
        result.push({
          type: "subject_time",
          message: `${subject} cannot be scheduled after Period ${restriction.max_value}. Current: Period ${slot.period}.`,
          severity: "warning",
        });
      }
    }

    return result;
  }, [slot, teacherId, roomId, subject, allSlots, schoolWideSlots, timeConstraints, teachers, rooms]);

  const hasErrors = conflicts.some(c => c.severity === "error");
  const isCheckingConflicts = loadingSlots || loadingSchoolSlots;

  // Get filtered subjects based on selected teacher's assignments
  const getFilteredSubjects = () => {
    if (!teacherId || teacherId === "none") {
      return subjects;
    }
    
    const teacherSubjects = teacherAssignments
      .filter(a => a.teacherId === teacherId)
      .map(a => a.subject);
    
    if (teacherSubjects.length === 0) {
      return subjects;
    }
    
    return subjects.filter(s => teacherSubjects.includes(s));
  };

  // Get filtered teachers based on selected subject
  const getFilteredTeachers = () => {
    if (!subject) {
      return teachers;
    }
    
    const assignedTeacherIds = teacherAssignments
      .filter(a => a.subject === subject)
      .map(a => a.teacherId);
    
    if (assignedTeacherIds.length === 0) {
      return teachers;
    }
    
    return teachers.filter(t => assignedTeacherIds.includes(t.id));
  };

  const filteredSubjects = getFilteredSubjects();
  const filteredTeachers = getFilteredTeachers();

  // Reset subject if it's not in the filtered list when teacher changes
  React.useEffect(() => {
    if (teacherId && teacherId !== "none" && subject) {
      const available = getFilteredSubjects();
      if (!available.includes(subject)) {
        setSubject("");
      }
    }
  }, [teacherId]);

  const handleSave = async () => {
    if (!slot) return;
    
    setSaving(true);
    try {
      await onSave({
        id: slot.id,
        subject,
        teacherId: teacherId || undefined,
        roomId: roomId || undefined,
        startTime,
        endTime,
      });
      onClose();
    } catch (error) {
      console.error("Error saving slot:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit Slot — {slot.day}, Period {slot.period}
          </DialogTitle>
        </DialogHeader>

        {/* Real-time conflict alerts */}
        {isCheckingConflicts && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking for conflicts…
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="space-y-2">
            {conflicts.map((conflict, idx) => (
              <Alert key={idx} variant={conflict.severity === "error" ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {conflict.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {!isCheckingConflicts && conflicts.length === 0 && (teacherId || roomId) && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            No conflicts detected
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacher" className="text-right">
              Teacher
            </Label>
            <Select
              value={teacherId}
              onValueChange={setTeacherId}
            >
              <SelectTrigger id="teacher" className="col-span-3">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.subject})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Select
              value={subject}
              onValueChange={setSubject}
            >
              <SelectTrigger id="subject" className="col-span-3">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {filteredSubjects.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room" className="text-right">
              Room
            </Label>
            <Select
              value={roomId}
              onValueChange={setRoomId}
            >
              <SelectTrigger id="room" className="col-span-3">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} ({room.roomType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime?.substring(0, 5) || ""}
              onChange={(e) => setStartTime(e.target.value + ":00")}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              End Time
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime?.substring(0, 5) || ""}
              onChange={(e) => setEndTime(e.target.value + ":00")}
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={saving || hasErrors}
            variant={hasErrors ? "destructive" : "default"}
          >
            {saving ? "Saving..." : hasErrors ? "Fix Conflicts First" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
