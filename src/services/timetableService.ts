import { supabase } from "@/integrations/supabase/client";
import { 
  Room, 
  TimetableRule, 
  Timetable, 
  TimetableSlot, 
  TeacherAvailability, 
  TimetableGenerationOptions,
  TimetableGenerationResult,
  Grade,
  Stream
} from "@/types";

// Helper function to map database fields to our types
function mapGrade(grade: any): Grade {
  return {
    id: grade.id,
    name: grade.name,
    level: grade.level,
    curriculum: grade.curriculum,
    schoolId: grade.school_id,
    createdAt: grade.created_at,
    updatedAt: grade.updated_at
  };
}

function mapStream(stream: any): Stream {
  return {
    id: stream.id,
    name: stream.name,
    gradeId: stream.grade_id,
    academicYearId: stream.academic_year_id,
    createdAt: stream.created_at,
    updatedAt: stream.updated_at
  };
}

// Rooms CRUD
export const getRooms = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("rooms")
    .select(`
      *,
      grades:grade_id(id, name),
      streams:stream_id(id, name),
      cbc_senior_tracks:track_id(id, name, pathway)
    `)
    .eq("school_id", schoolId)
    .order("name");
    
  if (error) throw error;
  return data.map(room => ({
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    roomType: room.room_type,
    schoolId: room.school_id,
    gradeId: room.grade_id,
    streamId: room.stream_id,
    trackId: room.track_id,
    trackIds: (room as any).track_ids || [],
    roomMode: (room as any).room_mode || 'standard',
    gradeName: (room.grades as any)?.name,
    streamName: (room.streams as any)?.name,
    trackName: (room.cbc_senior_tracks as any)?.name,
    createdAt: room.created_at,
    updatedAt: room.updated_at
  })) as Room[];
};

// Generate rooms from all grade-stream combinations with proper linking
export const generateRoomsFromStreams = async (schoolId: string): Promise<{ created: number; skipped: number }> => {
  // Fetch all grade-stream combinations for this school
  const { data: gradeStreams, error: gsError } = await supabase
    .from("grade_streams")
    .select(`
      id,
      grade_id,
      stream_id,
      grades!inner(id, name, school_id),
      streams!inner(id, name)
    `)
    .eq("grades.school_id", schoolId);

  if (gsError) throw gsError;

  let created = 0;
  let skipped = 0;

  // Create rooms for each grade-stream combination
  for (const gs of gradeStreams || []) {
    const gradeName = (gs as any).grades?.name || "";
    const streamName = (gs as any).streams?.name || "";
    const roomName = `${gradeName} ${streamName}`.trim();

    if (!roomName) {
      skipped++;
      continue;
    }

    // Check if room already exists for this grade-stream combination
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("school_id", schoolId)
      .eq("grade_id", gs.grade_id)
      .eq("stream_id", gs.stream_id)
      .maybeSingle();

    if (existingRoom) {
      skipped++;
      continue;
    }

    // Also check by name and update if exists without grade/stream link
    const { data: existingByName } = await supabase
      .from("rooms")
      .select("id, grade_id, stream_id")
      .eq("school_id", schoolId)
      .ilike("name", roomName)
      .maybeSingle();

    if (existingByName) {
      // Update existing room to link grade/stream if not already linked
      if (!existingByName.grade_id || !existingByName.stream_id) {
        await supabase
          .from("rooms")
          .update({ grade_id: gs.grade_id, stream_id: gs.stream_id })
          .eq("id", existingByName.id);
      }
      skipped++;
      continue;
    }

    // Create the room with grade/stream link
    const { error: createError } = await supabase
      .from("rooms")
      .insert({
        school_id: schoolId,
        grade_id: gs.grade_id,
        stream_id: gs.stream_id,
        name: roomName,
        room_type: "CLASSROOM",
        capacity: 40
      });

    if (createError) {
      console.error(`Error creating room ${roomName}:`, createError);
      skipped++;
    } else {
      created++;
    }
  }

  return { created, skipped };
};

export const createRoom = async (room: Omit<Room, "id" | "createdAt" | "updatedAt"> & { gradeId?: string; streamId?: string; trackId?: string; trackIds?: string[]; roomMode?: string }) => {
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      school_id: room.schoolId,
      name: room.name,
      capacity: room.capacity || null,
      room_type: room.roomType,
      grade_id: room.gradeId || null,
      stream_id: room.streamId || null,
      track_id: room.trackId || null,
      track_ids: room.trackIds || [],
      room_mode: room.roomMode || 'standard'
    })
    .select(`
      *,
      grades:grade_id(id, name),
      streams:stream_id(id, name),
      cbc_senior_tracks:track_id(id, name, pathway)
    `)
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    capacity: data.capacity,
    roomType: data.room_type,
    schoolId: data.school_id,
    gradeId: data.grade_id,
    streamId: data.stream_id,
    trackId: data.track_id,
    trackIds: (data as any).track_ids || [],
    roomMode: (data as any).room_mode || 'standard',
    gradeName: (data.grades as any)?.name,
    streamName: (data.streams as any)?.name,
    trackName: (data.cbc_senior_tracks as any)?.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Room;
};

export const updateRoom = async (id: string, room: Partial<Room> & { gradeId?: string; streamId?: string; trackId?: string; trackIds?: string[]; roomMode?: string }) => {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      name: room.name,
      capacity: room.capacity,
      room_type: room.roomType,
      grade_id: room.gradeId || null,
      stream_id: room.streamId || null,
      track_id: room.trackId || null,
      track_ids: room.trackIds || [],
      room_mode: room.roomMode || 'standard'
    })
    .eq("id", id)
    .select(`
      *,
      grades:grade_id(id, name),
      streams:stream_id(id, name),
      cbc_senior_tracks:track_id(id, name, pathway)
    `)
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    capacity: data.capacity,
    roomType: data.room_type,
    schoolId: data.school_id,
    gradeId: data.grade_id,
    streamId: data.stream_id,
    trackId: data.track_id,
    trackIds: (data as any).track_ids || [],
    roomMode: (data as any).room_mode || 'standard',
    gradeName: (data.grades as any)?.name,
    streamName: (data.streams as any)?.name,
    trackName: (data.cbc_senior_tracks as any)?.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Room;
};

export const deleteRoom = async (id: string) => {
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
  return true;
};

// Timetable Rules CRUD
export const getTimetableRules = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("timetable_rules")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("created_at");
    
  if (error) throw error;
  return data.map(rule => ({
    id: rule.id,
    schoolId: rule.school_id,
    ruleType: rule.rule_type,
    ruleData: rule.rule_data,
    isActive: rule.is_active,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at
  })) as TimetableRule[];
};

export const createTimetableRule = async (rule: Omit<TimetableRule, "id" | "createdAt" | "updatedAt">) => {
  const { data, error } = await supabase
    .from("timetable_rules")
    .insert({
      school_id: rule.schoolId,
      rule_type: rule.ruleType,
      rule_data: rule.ruleData,
      is_active: rule.isActive
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    schoolId: data.school_id,
    ruleType: data.rule_type,
    ruleData: data.rule_data,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as TimetableRule;
};

export const updateTimetableRule = async (id: string, rule: Partial<TimetableRule>) => {
  const { data, error } = await supabase
    .from("timetable_rules")
    .update({
      rule_type: rule.ruleType,
      rule_data: rule.ruleData,
      is_active: rule.isActive
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    schoolId: data.school_id,
    ruleType: data.rule_type,
    ruleData: data.rule_data,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as TimetableRule;
};

export const deleteTimetableRule = async (id: string) => {
  const { error } = await supabase
    .from("timetable_rules")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
  return true;
};

// Timetables CRUD
export const getTimetables = async (schoolId: string, academicYearId?: string, termId?: string) => {
  let query = supabase
    .from("timetables")
    .select(`
      *,
      grade:grades(*),
      stream:streams(*)
    `)
    .eq("school_id", schoolId);
    
  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }
  
  if (termId) {
    query = query.eq("term_id", termId);
  }
    
  const { data, error } = await query.order("created_at", { ascending: false });
    
  if (error) throw error;
  return data.map(timetable => ({
    id: timetable.id,
    schoolId: timetable.school_id,
    gradeId: timetable.grade_id,
    streamId: timetable.stream_id,
    academicYearId: timetable.academic_year_id,
    termId: timetable.term_id,
    version: timetable.version,
    isActive: timetable.is_active,
    createdAt: timetable.created_at,
    updatedAt: timetable.updated_at,
    grade: timetable.grade ? mapGrade(timetable.grade) : undefined,
    stream: timetable.stream ? mapStream(timetable.stream) : undefined
  })) as Timetable[];
};

export const getTimetable = async (id: string) => {
  const { data, error } = await supabase
    .from("timetables")
    .select(`
      *,
      grade:grades(*),
      stream:streams(*)
    `)
    .eq("id", id)
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    schoolId: data.school_id,
    gradeId: data.grade_id,
    streamId: data.stream_id,
    academicYearId: data.academic_year_id,
    termId: data.term_id,
    version: data.version,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    grade: data.grade ? mapGrade(data.grade) : undefined,
    stream: data.stream ? mapStream(data.stream) : undefined
  } as Timetable;
};

export const getTimetableWithSlots = async (id: string) => {
  const { data: timetable, error: timetableError } = await supabase
    .from("timetables")
    .select(`
      *,
      grade:grades(*),
      stream:streams(*)
    `)
    .eq("id", id)
    .single();
    
  if (timetableError) throw timetableError;
  
  const { data: slots, error: slotsError } = await supabase
    .from("timetable_slots")
    .select(`
      *,
      teacher:teachers(*),
      room:rooms(*)
    `)
    .eq("timetable_id", id)
    .order("day")
    .order("period");
    
  if (slotsError) throw slotsError;

  const mappedSlots = slots.map(slot => ({
    id: slot.id,
    timetableId: slot.timetable_id,
    day: slot.day,
    period: slot.period,
    startTime: slot.start_time,
    endTime: slot.end_time,
    subject: slot.subject,
    teacherId: slot.teacher_id,
    roomId: slot.room_id,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
    teacher: slot.teacher ? {
      id: slot.teacher.id,
      name: slot.teacher.name,
      email: slot.teacher.email,
      subject: slot.teacher.subject,
      schoolId: slot.teacher.school_id,
      isStreamTeacher: slot.teacher.is_stream_teacher,
      academicYearId: slot.teacher.academic_year_id,
      createdAt: slot.teacher.created_at,
      updatedAt: slot.teacher.updated_at
    } : undefined,
    room: slot.room ? {
      id: slot.room.id,
      name: slot.room.name,
      capacity: slot.room.capacity,
      roomType: slot.room.room_type,
      schoolId: slot.room.school_id,
      createdAt: slot.room.created_at,
      updatedAt: slot.room.updated_at
    } : undefined
  }));
  
  return {
    id: timetable.id,
    schoolId: timetable.school_id,
    gradeId: timetable.grade_id,
    streamId: timetable.stream_id,
    academicYearId: timetable.academic_year_id,
    termId: timetable.term_id,
    version: timetable.version,
    isActive: timetable.is_active,
    createdAt: timetable.created_at,
    updatedAt: timetable.updated_at,
    grade: timetable.grade ? mapGrade(timetable.grade) : undefined,
    stream: timetable.stream ? mapStream(timetable.stream) : undefined,
    slots: mappedSlots
  } as Timetable;
};

export const createTimetable = async (timetable: Omit<Timetable, "id" | "createdAt" | "updatedAt" | "grade" | "stream" | "slots">) => {
  const { data, error } = await supabase
    .from("timetables")
    .insert({
      school_id: timetable.schoolId,
      grade_id: timetable.gradeId,
      stream_id: timetable.streamId,
      academic_year_id: timetable.academicYearId,
      term_id: timetable.termId,
      version: timetable.version || 1,
      is_active: timetable.isActive
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    schoolId: data.school_id,
    gradeId: data.grade_id,
    streamId: data.stream_id,
    academicYearId: data.academic_year_id,
    termId: data.term_id,
    version: data.version,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Timetable;
};

export const createTimetableSlot = async (slot: Omit<TimetableSlot, "id" | "createdAt" | "updatedAt" | "teacher" | "room">) => {
  const { data, error } = await supabase
    .from("timetable_slots")
    .insert({
      timetable_id: slot.timetableId,
      day: slot.day,
      period: slot.period,
      start_time: slot.startTime,
      end_time: slot.endTime,
      subject: slot.subject,
      teacher_id: slot.teacherId || null,
      room_id: slot.roomId || null
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    timetableId: data.timetable_id,
    day: data.day,
    period: data.period,
    startTime: data.start_time,
    endTime: data.end_time,
    subject: data.subject,
    teacherId: data.teacher_id,
    roomId: data.room_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as TimetableSlot;
};

export const createTimetableSlots = async (slots: Omit<TimetableSlot, "id" | "createdAt" | "updatedAt" | "teacher" | "room">[]) => {
  const { data, error } = await supabase
    .from("timetable_slots")
    .insert(slots.map(slot => ({
      timetable_id: slot.timetableId,
      day: slot.day,
      period: slot.period,
      start_time: slot.startTime,
      end_time: slot.endTime,
      subject: slot.subject,
      teacher_id: slot.teacherId || null,
      room_id: slot.roomId || null
    })))
    .select();
    
  if (error) throw error;
  return data.map(slot => ({
    id: slot.id,
    timetableId: slot.timetable_id,
    day: slot.day,
    period: slot.period,
    startTime: slot.start_time,
    endTime: slot.end_time,
    subject: slot.subject,
    teacherId: slot.teacher_id,
    roomId: slot.room_id,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at
  })) as TimetableSlot[];
};

export const updateTimetableSlot = async (id: string, slot: Partial<TimetableSlot>) => {
  const { data, error } = await supabase
    .from("timetable_slots")
    .update({
      day: slot.day,
      period: slot.period,
      start_time: slot.startTime,
      end_time: slot.endTime,
      subject: slot.subject,
      teacher_id: slot.teacherId,
      room_id: slot.roomId
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    timetableId: data.timetable_id,
    day: data.day,
    period: data.period,
    startTime: data.start_time,
    endTime: data.end_time,
    subject: data.subject,
    teacherId: data.teacher_id,
    roomId: data.room_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as TimetableSlot;
};

export const deleteTimetableSlot = async (id: string) => {
  const { error } = await supabase
    .from("timetable_slots")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
  return true;
};

// Teacher Availability CRUD
export const getTeacherAvailability = async (teacherId: string, termId: string) => {
  const { data, error } = await supabase
    .from("teacher_availability")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("term_id", termId)
    .order("day")
    .order("start_time");
    
  if (error) throw error;
  return data.map(availability => ({
    id: availability.id,
    teacherId: availability.teacher_id,
    day: availability.day,
    startTime: availability.start_time,
    endTime: availability.end_time,
    isAvailable: availability.is_available,
    academicYearId: availability.academic_year_id,
    termId: availability.term_id,
    createdAt: availability.created_at,
    updatedAt: availability.updated_at
  })) as TeacherAvailability[];
};

export const createTeacherAvailability = async (availability: Omit<TeacherAvailability, "id" | "createdAt" | "updatedAt" | "teacher">) => {
  const { data, error } = await supabase
    .from("teacher_availability")
    .insert({
      teacher_id: availability.teacherId,
      day: availability.day,
      start_time: availability.startTime,
      end_time: availability.endTime,
      is_available: availability.isAvailable,
      academic_year_id: availability.academicYearId,
      term_id: availability.termId
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    teacherId: data.teacher_id,
    day: data.day,
    startTime: data.start_time,
    endTime: data.end_time,
    isAvailable: data.is_available,
    academicYearId: data.academic_year_id,
    termId: data.term_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as TeacherAvailability;
};

export const updateTeacherAvailability = async (id: string, availability: Partial<TeacherAvailability>) => {
  const { data, error } = await supabase
    .from("teacher_availability")
    .update({
      day: availability.day,
      start_time: availability.startTime,
      end_time: availability.endTime,
      is_available: availability.isAvailable
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    teacherId: data.teacher_id,
    day: data.day,
    startTime: data.start_time,
    endTime: data.end_time,
    isAvailable: data.is_available,
    academicYearId: data.academic_year_id,
    termId: data.term_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as TeacherAvailability;
};

export const deleteTeacherAvailability = async (id: string) => {
  const { error } = await supabase
    .from("teacher_availability")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
  return true;
};

// Timetable Generation
export const generateTimetable = async (options: TimetableGenerationOptions): Promise<TimetableGenerationResult> => {
  try {
    console.log("Starting timetable generation with options:", options);
    
    // Validate required fields
    if (!options.schoolId || !options.gradeId || !options.streamId || !options.termId || !options.academicYearId) {
      console.error("Missing required fields:", options);
      return {
        success: false,
        message: "Missing required fields for timetable generation"
      };
    }
    
    // Default configuration
    const config = options.config || {
      startTime: "08:20",
      lessonDurationMinutes: 40,
      lessonsPerDay: 8,
      breaks: [
        { id: "1", name: "Short Break", afterPeriod: 3, durationMinutes: 15 },
        { id: "2", name: "Lunch Break", afterPeriod: 5, durationMinutes: 30 },
      ],
      subjectLessons: [],
    };
    
    // First, check for existing timetable
    const { data: existingTimetables, error: checkError } = await supabase
      .from("timetables")
      .select("id")
      .eq("school_id", options.schoolId)
      .eq("grade_id", options.gradeId)
      .eq("stream_id", options.streamId)
      .eq("term_id", options.termId)
      .eq("academic_year_id", options.academicYearId);
      
    if (checkError) {
      console.error("Error checking existing timetables:", checkError);
      throw checkError;
    }
      
    if (existingTimetables && existingTimetables.length > 0 && !options.regenerate) {
      return {
        success: false,
        message: "A timetable already exists for this class and term. Set 'regenerate' to true to override it."
      };
    }
    
    console.log("Existing timetables found:", existingTimetables?.length || 0);
    
    // If regenerating, delete existing timetable and slots
    if (existingTimetables && existingTimetables.length > 0 && options.regenerate) {
      console.log("Deleting existing timetables for regeneration");
      for (const timetable of existingTimetables) {
        // Delete all slots first
        const { error: deleteSlotError } = await supabase
          .from("timetable_slots")
          .delete()
          .eq("timetable_id", timetable.id);
          
        if (deleteSlotError) {
          console.error("Error deleting slots:", deleteSlotError);
          throw deleteSlotError;
        }
          
        // Then delete the timetable
        const { error: deleteTimetableError } = await supabase
          .from("timetables")
          .delete()
          .eq("id", timetable.id);
          
        if (deleteTimetableError) {
          console.error("Error deleting timetable:", deleteTimetableError);
          throw deleteTimetableError;
        }
      }
    }
    
    // Create a new timetable
    console.log("Creating new timetable");
    const { data: newTimetable, error: timetableError } = await supabase
      .from("timetables")
      .insert({
        school_id: options.schoolId,
        grade_id: options.gradeId,
        stream_id: options.streamId,
        term_id: options.termId,
        academic_year_id: options.academicYearId,
        version: 1,
        is_active: true
      })
      .select()
      .single();
      
    if (timetableError) {
      console.error("Error creating timetable:", timetableError);
      throw timetableError;
    }
    
    console.log("Timetable created successfully:", newTimetable.id);
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    // Fetch subjects from the school
    const { data: schoolSubjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("name")
      .eq("school_id", options.schoolId)
      .eq("is_active", true);
      
    if (subjectsError) {
      console.error("Error fetching subjects:", subjectsError);
    }
    
    const subjects = schoolSubjects?.map(s => s.name) || ["Mathematics", "English", "Science", "Social Studies"];
    
    // Fetch available teachers with their assignments
    const { data: teachers, error: teachersError } = await supabase
      .from("teachers")
      .select("*")
      .eq("school_id", options.schoolId);
      
    if (teachersError) {
      console.error("Error fetching teachers:", teachersError);
    }
    console.log("Teachers available:", teachers?.length || 0);
      
    // Fetch the stream to get its name for room assignment
    const { data: streamData, error: streamError } = await supabase
      .from("streams")
      .select("id, name, grade_id")
      .eq("id", options.streamId)
      .single();
      
    if (streamError) {
      console.error("Error fetching stream:", streamError);
    }
    
    // Fetch the grade name separately
    const { data: gradeData } = await supabase
      .from("grades")
      .select("name")
      .eq("id", options.gradeId)
      .single();
    const gradeName = gradeData?.name || "";
    const streamName = streamData?.name || "";
    const streamRoomName = `${gradeName} ${streamName}`.trim();
    console.log("Stream room name:", streamRoomName);
    
    // Fetch available rooms
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("school_id", options.schoolId);
      
    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
    }
    console.log("Rooms available:", rooms?.length || 0);
    
    // Find or create a room matching the stream name
    let streamRoom = rooms?.find(r => 
      r.name.toLowerCase() === streamRoomName.toLowerCase() ||
      r.name.toLowerCase().includes(streamRoomName.toLowerCase())
    );
    
    // If no matching room found, create one
    if (!streamRoom && streamRoomName) {
      console.log("Creating room for stream:", streamRoomName);
      const { data: newRoom, error: newRoomError } = await supabase
        .from("rooms")
        .insert({
          school_id: options.schoolId,
          name: streamRoomName,
          room_type: "classroom",
          capacity: 40
        })
        .select()
        .single();
        
      if (newRoomError) {
        console.error("Error creating stream room:", newRoomError);
      } else {
        streamRoom = newRoom;
        console.log("Stream room created:", streamRoom?.id);
      }
    }
    
    const streamRoomId = streamRoom?.id || null;
    console.log("Using room for all lessons:", streamRoomId);
    
    // Get teacher-subject assignments for this grade-stream
    const { data: gradeStream } = await supabase
      .from("grade_streams")
      .select("id")
      .eq("grade_id", options.gradeId)
      .eq("stream_id", options.streamId)
      .maybeSingle();
      
    const { data: teacherAssignments } = await supabase
      .from("teacher_subject_assignments")
      .select("*")
      .eq("grade_stream_id", gradeStream?.id || "")
      .eq("academic_year_id", options.academicYearId);
    
    console.log("Teacher assignments for this grade-stream:", teacherAssignments?.length || 0);
    
    // Build subject-to-teacher mapping from assignments
    const subjectTeacherMap: Record<string, string> = {};
    teacherAssignments?.forEach(assignment => {
      subjectTeacherMap[assignment.subject] = assignment.teacher_id;
    });
    
    // Calculate time slots based on configuration
    const [startHour, startMinute] = config.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;
    
    // Build schedule with breaks
    const periodTimes: Array<{ period: number; startTime: string; endTime: string }> = [];
    
    for (let period = 1; period <= config.lessonsPerDay; period++) {
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}:00`;
      currentMinutes += config.lessonDurationMinutes;
      const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}:00`;
      
      periodTimes.push({ period, startTime, endTime });
      
      // Check for breaks after this period
      const breakAfter = config.breaks.find(b => b.afterPeriod === period);
      if (breakAfter) {
        currentMinutes += breakAfter.durationMinutes;
      }
    }
    
    // Build subject distribution based on config
    const subjectLessonsPerWeek: Record<string, number> = {};
    config.subjectLessons.forEach(sl => {
      subjectLessonsPerWeek[sl.subject] = sl.lessonsPerWeek;
    });
    
    // Default to 4 lessons per week if not specified
    subjects.forEach(subject => {
      if (!subjectLessonsPerWeek[subject]) {
        subjectLessonsPerWeek[subject] = 4;
      }
    });
    
    // Calculate total slots available
    const totalSlotsPerWeek = config.lessonsPerDay * 5; // 5 days
    
    // Create subject pool based on lessons per week
    const subjectPool: string[] = [];
    Object.entries(subjectLessonsPerWeek).forEach(([subject, count]) => {
      for (let i = 0; i < count; i++) {
        subjectPool.push(subject);
      }
    });
    
    // Shuffle the pool
    const shuffledPool = [...subjectPool].sort(() => Math.random() - 0.5);
    
    // Create slots
    const slots: Omit<TimetableSlot, "id" | "createdAt" | "updatedAt" | "teacher" | "room">[] = [];
    let poolIndex = 0;
    
    for (const day of days) {
      for (const periodTime of periodTimes) {
        // Get subject from pool, cycling if needed
        const subject = shuffledPool[poolIndex % shuffledPool.length] || subjects[0];
        poolIndex++;
        
        // Get teacher for this subject from assignments
        const teacherId = subjectTeacherMap[subject] || null;
        
        // Use the stream's dedicated room for all lessons
        slots.push({
          timetableId: newTimetable.id,
          day,
          period: periodTime.period,
          startTime: periodTime.startTime,
          endTime: periodTime.endTime,
          subject,
          teacherId: teacherId || undefined,
          roomId: streamRoomId || undefined
        });
      }
    }
    
    // Create all the slots
    console.log("Creating timetable slots, total:", slots.length);
    const { error: slotsError } = await supabase
      .from("timetable_slots")
      .insert(slots.map(slot => ({
        timetable_id: slot.timetableId,
        day: slot.day,
        period: slot.period,
        start_time: slot.startTime,
        end_time: slot.endTime,
        subject: slot.subject,
        teacher_id: slot.teacherId || null,
        room_id: slot.roomId || null
      })));
      
    if (slotsError) {
      console.error("Error creating slots:", slotsError);
      throw slotsError;
    }
    
    console.log("Slots created successfully");
    
    const filledSlots = slots.filter(s => s.teacherId).length;
    
    return {
      success: true,
      message: "Timetable generated successfully",
      timetableId: newTimetable.id,
      stats: {
        totalSlots: slots.length,
        filledSlots,
        roomUtilization: rooms && rooms.length > 0 ? 100 : 0,
        teacherUtilization: filledSlots > 0 ? Math.round((filledSlots / slots.length) * 100) : 0
      }
    };
  } catch (error: any) {
    console.error("Timetable generation error:", error);
    return {
      success: false,
      message: error.message || "Failed to generate timetable"
    };
  }
};
