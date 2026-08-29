import { supabase } from "@/integrations/supabase/client";

export interface ExamTimetableSlot {
  id: string;
  examId: string;
  schoolId: string;
  dayNumber: number;
  dayLabel?: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
  entries?: ExamTimetableEntry[];
}

export interface ExamTimetableEntry {
  id: string;
  slotId: string;
  examId: string;
  schoolId: string;
  subject: string;
  gradeIds: string[];
  roomId?: string;
  invigilatorId?: string;
  isConcurrent: boolean;
  notes?: string;
  // Joined fields
  roomName?: string;
  invigilatorName?: string;
}

export interface SlotConfig {
  dayNumber: number;
  dayLabel?: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
}

export interface AutoGenerateOptions {
  examId: string;
  schoolId: string;
  slots: SlotConfig[];
  subjects: string[];
  gradeIds: string[];
  allowConcurrent: boolean;
}

export const examTimetableService = {
  // Save slot definitions for an exam
  async saveSlots(examId: string, schoolId: string, slots: SlotConfig[]) {
    // Delete existing slots first (cascade deletes entries)
    await supabase
      .from('exam_timetable_slots')
      .delete()
      .eq('exam_id', examId);

    if (slots.length === 0) return [];

    const { data, error } = await supabase
      .from('exam_timetable_slots')
      .insert(
        slots.map(s => ({
          exam_id: examId,
          school_id: schoolId,
          day_number: s.dayNumber,
          day_label: s.dayLabel || `Day ${s.dayNumber}`,
          slot_number: s.slotNumber,
          start_time: s.startTime,
          end_time: s.endTime,
        }))
      )
      .select();

    if (error) throw error;
    return data;
  },

  // Get all slots and entries for an exam
  async getExamTimetable(examId: string): Promise<ExamTimetableSlot[]> {
    const { data: slotsData, error: slotsError } = await supabase
      .from('exam_timetable_slots')
      .select('*')
      .eq('exam_id', examId)
      .order('day_number')
      .order('slot_number');

    if (slotsError) throw slotsError;
    if (!slotsData?.length) return [];

    const { data: entriesData, error: entriesError } = await supabase
      .from('exam_timetable_entries')
      .select('*')
      .eq('exam_id', examId);

    if (entriesError) throw entriesError;

    // Fetch room and teacher names for entries
    const roomIds = [...new Set((entriesData || []).filter(e => e.room_id).map(e => e.room_id!))];
    const teacherIds = [...new Set((entriesData || []).filter(e => e.invigilator_id).map(e => e.invigilator_id!))];

    let roomMap: Record<string, string> = {};
    let teacherMap: Record<string, string> = {};

    if (roomIds.length > 0) {
      const { data: rooms } = await supabase.from('rooms').select('id, name').in('id', roomIds);
      roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r.name]));
    }
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase.from('teachers').select('id, name').in('id', teacherIds);
      teacherMap = Object.fromEntries((teachers || []).map(t => [t.id, t.name]));
    }

    return slotsData.map(slot => ({
      id: slot.id,
      examId: slot.exam_id,
      schoolId: slot.school_id,
      dayNumber: slot.day_number,
      dayLabel: slot.day_label,
      slotNumber: slot.slot_number,
      startTime: slot.start_time,
      endTime: slot.end_time,
      entries: (entriesData || [])
        .filter(e => e.slot_id === slot.id)
        .map(e => ({
          id: e.id,
          slotId: e.slot_id,
          examId: e.exam_id,
          schoolId: e.school_id,
          subject: e.subject,
          gradeIds: e.grade_ids || [],
          roomId: e.room_id,
          invigilatorId: e.invigilator_id,
          isConcurrent: e.is_concurrent,
          notes: e.notes,
          roomName: e.room_id ? roomMap[e.room_id] : undefined,
          invigilatorName: e.invigilator_id ? teacherMap[e.invigilator_id] : undefined,
        })),
    }));
  },

  // Add an entry to a slot
  async addEntry(entry: Omit<ExamTimetableEntry, 'id' | 'roomName' | 'invigilatorName'>) {
    const { data, error } = await supabase
      .from('exam_timetable_entries')
      .insert({
        slot_id: entry.slotId,
        exam_id: entry.examId,
        school_id: entry.schoolId,
        subject: entry.subject,
        grade_ids: entry.gradeIds,
        room_id: entry.roomId || null,
        invigilator_id: entry.invigilatorId || null,
        is_concurrent: entry.isConcurrent,
        notes: entry.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update an entry
  async updateEntry(id: string, updates: Partial<ExamTimetableEntry>) {
    const updateData: any = {};
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.gradeIds !== undefined) updateData.grade_ids = updates.gradeIds;
    if (updates.roomId !== undefined) updateData.room_id = updates.roomId || null;
    if (updates.invigilatorId !== undefined) updateData.invigilator_id = updates.invigilatorId || null;
    if (updates.isConcurrent !== undefined) updateData.is_concurrent = updates.isConcurrent;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { error } = await supabase
      .from('exam_timetable_entries')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  },

  // Delete an entry
  async deleteEntry(id: string) {
    const { error } = await supabase
      .from('exam_timetable_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Auto-generate exam timetable
  async autoGenerate(options: AutoGenerateOptions): Promise<{
    success: boolean;
    message: string;
    warnings: string[];
  }> {
    const { examId, schoolId, slots, subjects, gradeIds, allowConcurrent } = options;
    const warnings: string[] = [];

    // Save slots first
    const savedSlots = await this.saveSlots(examId, schoolId, slots);
    if (!savedSlots?.length) {
      return { success: false, message: 'Failed to create time slots', warnings };
    }

    // Fetch rooms and teachers for allocation
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, capacity')
      .eq('school_id', schoolId);

    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, name, subjects_taught')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const availableRooms = rooms || [];
    const availableTeachers = teachers || [];

    // Build allocation: distribute subjects across slots
    const subjectsToAllocate = [...subjects];
    const slotEntries: Array<{
      slotId: string;
      subject: string;
      gradeIds: string[];
      roomId?: string;
      invigilatorId?: string;
      isConcurrent: boolean;
    }> = [];

    // Track used resources per slot
    const slotRoomUsage = new Map<string, Set<string>>();
    const slotTeacherUsage = new Map<string, Set<string>>();

    for (const slot of savedSlots) {
      if (subjectsToAllocate.length === 0) break;

      slotRoomUsage.set(slot.id, new Set());
      slotTeacherUsage.set(slot.id, new Set());

      // Assign one subject per slot normally
      const subject = subjectsToAllocate.shift()!;
      
      // Find available room
      const usedRooms = slotRoomUsage.get(slot.id)!;
      const room = availableRooms.find(r => !usedRooms.has(r.id));
      if (room) usedRooms.add(room.id);

      // Find invigilator (prefer teacher who teaches the subject)
      const usedTeachers = slotTeacherUsage.get(slot.id)!;
      const invigilator = availableTeachers.find(
        t => !usedTeachers.has(t.id) && (t.subjects_taught || []).includes(subject)
      ) || availableTeachers.find(t => !usedTeachers.has(t.id));
      if (invigilator) usedTeachers.add(invigilator.id);

      slotEntries.push({
        slotId: slot.id,
        subject,
        gradeIds,
        roomId: room?.id,
        invigilatorId: invigilator?.id,
        isConcurrent: false,
      });

      // If concurrent allowed and subjects remain, try to add more to same slot
      if (allowConcurrent && subjectsToAllocate.length > 0) {
        // Add concurrent subjects for different grades or non-clashing optional subjects
        const concurrentSubject = subjectsToAllocate.shift()!;
        const concRoom = availableRooms.find(r => !usedRooms.has(r.id));
        if (concRoom) usedRooms.add(concRoom.id);

        const concInvigilator = availableTeachers.find(
          t => !usedTeachers.has(t.id) && (t.subjects_taught || []).includes(concurrentSubject)
        ) || availableTeachers.find(t => !usedTeachers.has(t.id));
        if (concInvigilator) usedTeachers.add(concInvigilator.id);

        slotEntries.push({
          slotId: slot.id,
          subject: concurrentSubject,
          gradeIds,
          roomId: concRoom?.id,
          invigilatorId: concInvigilator?.id,
          isConcurrent: true,
        });
      }
    }

    if (subjectsToAllocate.length > 0) {
      warnings.push(`${subjectsToAllocate.length} subject(s) could not be allocated: ${subjectsToAllocate.join(', ')}. Add more time slots.`);
    }

    if (!availableRooms.length) {
      warnings.push('No rooms found. Entries created without room assignments.');
    }
    if (!availableTeachers.length) {
      warnings.push('No teachers found. Entries created without invigilator assignments.');
    }

    // Insert entries
    if (slotEntries.length > 0) {
      const { error } = await supabase
        .from('exam_timetable_entries')
        .insert(
          slotEntries.map(e => ({
            slot_id: e.slotId,
            exam_id: examId,
            school_id: schoolId,
            subject: e.subject,
            grade_ids: e.gradeIds,
            room_id: e.roomId || null,
            invigilator_id: e.invigilatorId || null,
            is_concurrent: e.isConcurrent,
          }))
        );

      if (error) throw error;
    }

    return {
      success: true,
      message: `Allocated ${slotEntries.length} subject(s) across ${savedSlots.length} slot(s).`,
      warnings,
    };
  },

  // Clear entire exam timetable
  async clearTimetable(examId: string) {
    const { error } = await supabase
      .from('exam_timetable_slots')
      .delete()
      .eq('exam_id', examId);

    if (error) throw error;
  },
};
