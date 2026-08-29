import { supabase } from "@/integrations/supabase/client";

export interface RoomWithGradeStream {
  id: string;
  name: string;
  capacity?: number;
  roomType: string;
  schoolId: string;
  gradeId?: string;
  streamId?: string;
  gradeName?: string;
  streamName?: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSubjectAllocation {
  id: string;
  roomId: string;
  subjectId: string;
  subjectName?: string;
  schoolId: string;
  isCore: boolean;
  academicYearId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomTeacherAllocation {
  id: string;
  roomId: string;
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  schoolId: string;
  academicYearId?: string;
  lessonsPerWeek: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all rooms with grade/stream info for a school
 */
export async function getRoomsWithGradeStream(schoolId: string): Promise<RoomWithGradeStream[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select(`
      *,
      grades:grade_id(id, name),
      streams:stream_id(id, name)
    `)
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    roomType: r.room_type,
    schoolId: r.school_id,
    gradeId: r.grade_id,
    streamId: r.stream_id,
    gradeName: r.grades?.name,
    streamName: r.streams?.name,
    isShared: r.is_shared || false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Get rooms for a specific grade.
 * First tries direct grade_id match, then falls back to finding rooms
 * via grade_streams junction table streams, and also includes shared rooms.
 */
export async function getRoomsByGrade(schoolId: string, gradeId: string): Promise<RoomWithGradeStream[]> {
  const mapRoom = (r: any, fallbackGradeId?: string, fallbackGradeName?: string): RoomWithGradeStream => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    roomType: r.room_type,
    schoolId: r.school_id,
    gradeId: r.grade_id || fallbackGradeId,
    streamId: r.stream_id,
    gradeName: r.grades?.name || fallbackGradeName,
    streamName: r.streams?.name,
    isShared: r.is_shared || false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const roomSelect = `*, grades:grade_id(id, name), streams:stream_id(id, name)`;
  const seenIds = new Set<string>();
  const results: RoomWithGradeStream[] = [];

  const addRooms = (rooms: any[], fallbackGradeId?: string, fallbackGradeName?: string) => {
    for (const r of rooms) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        results.push(mapRoom(r, fallbackGradeId, fallbackGradeName));
      }
    }
  };

  // 1. Direct grade_id match
  const { data: directRooms, error } = await supabase
    .from("rooms")
    .select(roomSelect)
    .eq("school_id", schoolId)
    .eq("grade_id", gradeId)
    .order("name");

  if (error) throw error;
  addRooms(directRooms || []);

  // 2. Rooms linked via grade_streams junction table
  const { data: gradeStreamData } = await supabase
    .from("grade_streams")
    .select("stream_id")
    .eq("grade_id", gradeId);

  const streamIds = (gradeStreamData || []).map((gs) => gs.stream_id);

  if (streamIds.length > 0) {
    const { data: streamRooms } = await supabase
      .from("rooms")
      .select(roomSelect)
      .eq("school_id", schoolId)
      .in("stream_id", streamIds)
      .order("name");

    if (streamRooms) {
      // Auto-link grade_id for future queries
      for (const room of streamRooms) {
        if (!room.grade_id) {
          await supabase.from("rooms").update({ grade_id: gradeId }).eq("id", room.id);
        }
      }
      addRooms(streamRooms, gradeId);
    }
  }

  // 3. Fallback: rooms by grade name pattern
  if (results.length === 0) {
    const { data: gradeData } = await supabase
      .from("grades")
      .select("name")
      .eq("id", gradeId)
      .single();

    if (gradeData?.name) {
      const { data: nameRooms } = await supabase
        .from("rooms")
        .select(roomSelect)
        .eq("school_id", schoolId)
        .ilike("name", `${gradeData.name}%`)
        .order("name");

      if (nameRooms) {
        for (const room of nameRooms) {
          if (!room.grade_id) {
            await supabase.from("rooms").update({ grade_id: gradeId }).eq("id", room.id);
          }
        }
        addRooms(nameRooms, gradeId, gradeData.name);
      }
    }
  }

  // 4. Always include shared rooms for this school
  const { data: sharedRooms } = await supabase
    .from("rooms")
    .select(roomSelect)
    .eq("school_id", schoolId)
    .eq("is_shared", true)
    .order("name");

  if (sharedRooms) {
    addRooms(sharedRooms);
  }

  return results;
}

/**
 * Create a room linked to a grade-stream
 */
export async function createRoomForGradeStream(
  schoolId: string,
  gradeId: string,
  streamId: string,
  roomName: string,
  capacity?: number
): Promise<RoomWithGradeStream> {
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      school_id: schoolId,
      grade_id: gradeId,
      stream_id: streamId,
      name: roomName,
      room_type: "CLASSROOM",
      capacity: capacity || 40,
    })
    .select(`
      *,
      grades:grade_id(id, name),
      streams:stream_id(id, name)
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
    gradeName: data.grades?.name,
    streamName: data.streams?.name,
    isShared: data.is_shared || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Generate rooms from all grade-stream combinations
 */
export async function generateRoomsFromGradeStreams(schoolId: string): Promise<{ created: number; skipped: number }> {
  // Fetch all grade-streams for the school
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

  for (const gs of gradeStreams || []) {
    const gradeName = (gs.grades as any)?.name || "";
    const streamName = (gs.streams as any)?.name || "";
    const roomName = `${gradeName} ${streamName}`.trim();

    // Check if room already exists
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

    // Also check by name
    const { data: existingByName } = await supabase
      .from("rooms")
      .select("id")
      .eq("school_id", schoolId)
      .ilike("name", roomName)
      .maybeSingle();

    if (existingByName) {
      // Update existing room to link grade/stream
      await supabase
        .from("rooms")
        .update({ grade_id: gs.grade_id, stream_id: gs.stream_id })
        .eq("id", existingByName.id);
      skipped++;
      continue;
    }

    // Create new room
    const { error: insertError } = await supabase.from("rooms").insert({
      school_id: schoolId,
      grade_id: gs.grade_id,
      stream_id: gs.stream_id,
      name: roomName,
      room_type: "CLASSROOM",
      capacity: 40,
    });

    if (!insertError) {
      created++;
    }
  }

  return { created, skipped };
}

/**
 * Get subject allocations for a room
 */
export async function getRoomSubjectAllocations(
  roomId: string,
  academicYearId?: string
): Promise<RoomSubjectAllocation[]> {
  let query = supabase
    .from("room_subject_allocations")
    .select(`
      *,
      subjects:subject_id(id, name)
    `)
    .eq("room_id", roomId);

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((a: any) => ({
    id: a.id,
    roomId: a.room_id,
    subjectId: a.subject_id,
    subjectName: a.subjects?.name,
    schoolId: a.school_id,
    isCore: a.is_core,
    academicYearId: a.academic_year_id,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));
}

/**
 * Get all subject allocations for a grade (all rooms in that grade)
 */
export async function getGradeSubjectAllocations(
  schoolId: string,
  gradeId: string,
  academicYearId?: string
): Promise<{ roomId: string; roomName: string; allocations: RoomSubjectAllocation[] }[]> {
  // First get all rooms for this grade
  const rooms = await getRoomsByGrade(schoolId, gradeId);

  const result: { roomId: string; roomName: string; allocations: RoomSubjectAllocation[] }[] = [];

  for (const room of rooms) {
    const allocations = await getRoomSubjectAllocations(room.id, academicYearId);
    result.push({
      roomId: room.id,
      roomName: room.name,
      allocations,
    });
  }

  return result;
}

/**
 * Allocate a subject to a room
 */
export async function allocateSubjectToRoom(
  roomId: string,
  subjectId: string,
  schoolId: string,
  isCore: boolean,
  academicYearId?: string
): Promise<RoomSubjectAllocation> {
  const { data, error } = await supabase
    .from("room_subject_allocations")
    .upsert({
      room_id: roomId,
      subject_id: subjectId,
      school_id: schoolId,
      is_core: isCore,
      academic_year_id: academicYearId,
    }, {
      onConflict: "room_id,subject_id,academic_year_id",
    })
    .select(`
      *,
      subjects:subject_id(id, name)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    roomId: data.room_id,
    subjectId: data.subject_id,
    subjectName: data.subjects?.name,
    schoolId: data.school_id,
    isCore: data.is_core,
    academicYearId: data.academic_year_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Allocate core subjects to all rooms in a grade
 */
export async function allocateCoreSubjectsToGrade(
  schoolId: string,
  gradeId: string,
  coreSubjectIds: string[],
  academicYearId?: string
): Promise<number> {
  const rooms = await getRoomsByGrade(schoolId, gradeId);
  let allocated = 0;

  for (const room of rooms) {
    for (const subjectId of coreSubjectIds) {
      try {
        await allocateSubjectToRoom(room.id, subjectId, schoolId, true, academicYearId);
        allocated++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  return allocated;
}

/**
 * Remove a subject allocation from a room
 */
export async function removeSubjectFromRoom(allocationId: string): Promise<void> {
  const { error } = await supabase
    .from("room_subject_allocations")
    .delete()
    .eq("id", allocationId);

  if (error) throw error;
}

/**
 * Get teacher allocations for a room
 */
export async function getRoomTeacherAllocations(
  roomId: string,
  academicYearId?: string
): Promise<RoomTeacherAllocation[]> {
  let query = supabase
    .from("room_teacher_allocations")
    .select(`
      *,
      teachers:teacher_id(id, name),
      subjects:subject_id(id, name)
    `)
    .eq("room_id", roomId);

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((a: any) => ({
    id: a.id,
    roomId: a.room_id,
    teacherId: a.teacher_id,
    teacherName: a.teachers?.name,
    subjectId: a.subject_id,
    subjectName: a.subjects?.name,
    schoolId: a.school_id,
    academicYearId: a.academic_year_id,
    lessonsPerWeek: a.lessons_per_week,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));
}

/**
 * Allocate a teacher to a room for a subject
 */
export async function allocateTeacherToRoom(
  roomId: string,
  teacherId: string,
  subjectId: string,
  schoolId: string,
  lessonsPerWeek: number,
  academicYearId?: string
): Promise<RoomTeacherAllocation> {
  const { data, error } = await supabase
    .from("room_teacher_allocations")
    .upsert({
      room_id: roomId,
      teacher_id: teacherId,
      subject_id: subjectId,
      school_id: schoolId,
      lessons_per_week: lessonsPerWeek,
      academic_year_id: academicYearId,
    }, {
      onConflict: "room_id,teacher_id,subject_id,academic_year_id",
    })
    .select(`
      *,
      teachers:teacher_id(id, name),
      subjects:subject_id(id, name)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    roomId: data.room_id,
    teacherId: data.teacher_id,
    teacherName: data.teachers?.name,
    subjectId: data.subject_id,
    subjectName: data.subjects?.name,
    schoolId: data.school_id,
    academicYearId: data.academic_year_id,
    lessonsPerWeek: data.lessons_per_week,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Remove a teacher allocation from a room
 */
export async function removeTeacherFromRoom(allocationId: string): Promise<void> {
  const { error } = await supabase
    .from("room_teacher_allocations")
    .delete()
    .eq("id", allocationId);

  if (error) throw error;
}

/**
 * Update lessons per week for a teacher-room allocation
 */
export async function updateTeacherLessons(
  allocationId: string,
  lessonsPerWeek: number
): Promise<void> {
  const { error } = await supabase
    .from("room_teacher_allocations")
    .update({ lessons_per_week: lessonsPerWeek, updated_at: new Date().toISOString() })
    .eq("id", allocationId);

  if (error) throw error;
}
