import { supabase } from "@/integrations/supabase/client";
import {
  TimetableGenerationContext,
  GenerationSlot,
  GenerationConflict,
  EnhancedGenerationResult,
  SubjectConfig,
  TeacherWithConstraints,
  RoomWithType,
  Pathway,
} from "@/types/timetable";
import { TimetableGenerationOptions, TimetableSlot } from "@/types";

interface SubjectLessonAllocation {
  subject: string;
  lessonsPerWeek: number;
  isOptional: boolean;
  pathway?: Pathway;
  requiresSpecialRoom: boolean;
  specialRoomType?: string;
}

interface TeacherSlotTracker {
  [teacherId: string]: {
    weeklyCount: number;
    maxPerWeek: number;
    dailyCount: { [day: string]: number };
  };
}

interface SubjectSlotTracker {
  [subject: string]: {
    weeklyCount: number;
    maxPerWeek: number;
  };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Enhanced timetable generation with constraints
export const generateEnhancedTimetable = async (
  options: TimetableGenerationOptions
): Promise<EnhancedGenerationResult> => {
  const conflicts: GenerationConflict[] = [];
  const warnings: string[] = [];

  try {
    console.log("Starting enhanced timetable generation:", options);

    // Validate required fields
    if (!options.schoolId || !options.gradeId || !options.streamId || !options.termId || !options.academicYearId) {
      return {
        success: false,
        message: "Missing required fields for timetable generation",
        conflicts: [],
        stats: { totalSlots: 0, filledSlots: 0, freeSlots: 0, coreSubjectSlots: 0, optionalSubjectSlots: 0, teacherUtilization: 0, roomUtilization: 0 },
        warnings: [],
      };
    }

    const config = options.config || {
      startTime: "08:20",
      lessonDurationMinutes: 40,
      lessonsPerDay: 8,
      breaks: [],
      subjectLessons: [],
    };

    // Fetch grade info for curriculum
    const { data: gradeData } = await supabase
      .from("grades")
      .select("name, curriculum")
      .eq("id", options.gradeId)
      .single();

    const gradeName = gradeData?.name || "";
    const gradeCurriculum = gradeData?.curriculum || "cbc";

    // Fetch stream info
    const { data: streamData } = await supabase
      .from("streams")
      .select("name")
      .eq("id", options.streamId)
      .single();

    const streamName = streamData?.name || "";
    const streamRoomName = `${gradeName} ${streamName}`.trim();

    // Fetch subjects with enhanced config
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("*")
      .eq("school_id", options.schoolId)
      .eq("is_active", true);

    const subjects: SubjectConfig[] = (subjectsData || [])
      .filter((s) => !gradeCurriculum || s.curriculum === gradeCurriculum)
      .map((s) => ({
        id: s.id,
        name: s.name,
        subjectType: (s.subject_type || "core") as SubjectConfig["subjectType"],
        pathway: s.pathway as Pathway | undefined,
        maxLessonsPerWeek: s.max_lessons_per_week || 10,
        requiresSpecialRoom: s.requires_special_room || false,
        specialRoomType: s.special_room_type,
        curriculum: s.curriculum,
      }));

    // Separate core and optional subjects
    const coreSubjects = subjects.filter((s) => s.subjectType === "core");
    const optionalSubjects = subjects.filter((s) => s.subjectType !== "core");

    // Fetch teachers with constraints
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, name, max_lessons_per_week, subjects_taught, subject")
      .eq("school_id", options.schoolId)
      .eq("status", "active");

    const teachers: TeacherWithConstraints[] = (teachersData || []).map((t) => ({
      id: t.id,
      name: t.name,
      maxLessonsPerWeek: t.max_lessons_per_week || 30,
      currentWeeklyLessons: 0,
      subjectsTaught: t.subjects_taught || [t.subject],
    }));

    // Fetch rooms
    const { data: roomsData } = await supabase
      .from("rooms")
      .select("id, name, room_type, is_shared, capacity, grade_id, stream_id")
      .eq("school_id", options.schoolId);

    const rooms: RoomWithType[] = (roomsData || []).map((r) => ({
      id: r.id,
      name: r.name,
      roomType: r.room_type,
      isShared: r.is_shared || false,
      capacity: r.capacity,
    }));

    // Find the room for this grade-stream (prefer exact grade_id + stream_id match)
    let streamRoom = (roomsData || []).find(
      (r) => r.grade_id === options.gradeId && r.stream_id === options.streamId
    );

    // Fallback: match by name
    if (!streamRoom) {
      streamRoom = (roomsData || []).find(
        (r) =>
          r.name.toLowerCase() === streamRoomName.toLowerCase() ||
          r.name.toLowerCase().includes(streamRoomName.toLowerCase())
      );
    }

    // Fallback: match rooms linked to streams via grade_streams
    if (!streamRoom) {
      const { data: gradeStreamRooms } = await supabase
        .from("rooms")
        .select("*")
        .eq("school_id", options.schoolId)
        .eq("stream_id", options.streamId);

      if (gradeStreamRooms && gradeStreamRooms.length > 0) {
        streamRoom = gradeStreamRooms[0];
        // Link grade_id for future lookups
        if (!streamRoom.grade_id) {
          await supabase
            .from("rooms")
            .update({ grade_id: options.gradeId })
            .eq("id", streamRoom.id);
        }
      }
    }

    let streamRoomMapped: RoomWithType | undefined = streamRoom
      ? {
          id: streamRoom.id,
          name: streamRoom.name,
          roomType: streamRoom.room_type,
          isShared: streamRoom.is_shared || false,
          capacity: streamRoom.capacity,
        }
      : undefined;

    if (!streamRoomMapped && streamRoomName) {
      const { data: newRoom } = await supabase
        .from("rooms")
        .insert({
          school_id: options.schoolId,
          grade_id: options.gradeId,
          stream_id: options.streamId,
          name: streamRoomName,
          room_type: "classroom",
          capacity: 40,
        })
        .select()
        .single();

      if (newRoom) {
        streamRoomMapped = {
          id: newRoom.id,
          name: newRoom.name,
          roomType: newRoom.room_type,
          isShared: newRoom.is_shared || false,
          capacity: newRoom.capacity,
        };
      }
    }

    // Get grade-stream for teacher assignments
    const { data: gradeStream } = await supabase
      .from("grade_streams")
      .select("id")
      .eq("grade_id", options.gradeId)
      .eq("stream_id", options.streamId)
      .maybeSingle();

    // Fetch teacher-subject assignments
    const { data: teacherAssignments } = await supabase
      .from("teacher_subject_assignments")
      .select("*")
      .eq("grade_stream_id", gradeStream?.id || "")
      .eq("academic_year_id", options.academicYearId);

    const subjectTeacherMap: Record<string, string> = {};
    (teacherAssignments || []).forEach((a) => {
      subjectTeacherMap[a.subject] = a.teacher_id;
    });

    // Fetch constraints
    const { data: constraintsData } = await supabase
      .from("timetable_constraints")
      .select("*")
      .eq("school_id", options.schoolId)
      .eq("is_active", true);

    // Apply constraints
    const freePeriodsPerDay = constraintsData?.find(
      (c) => c.constraint_type === "free_periods_per_day"
    )?.max_value || 0;

    const maxConsecutiveLessons = constraintsData?.find(
      (c) => c.constraint_type === "max_consecutive_lessons"
    )?.max_value || 4;

    // Subject time restrictions: subject_max_period constraints
    // Maps subject name -> max period number (subject can only be in periods 1..maxPeriod)
    const subjectMaxPeriodMap: Record<string, number> = {};
    (constraintsData || [])
      .filter((c) => c.constraint_type === "subject_max_period" && c.entity_name)
      .forEach((c) => {
        subjectMaxPeriodMap[c.entity_name!] = c.max_value;
      });

    // Calculate time slots
    const [startHour, startMinute] = config.startTime.split(":").map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    const periodTimes: Array<{ period: number; startTime: string; endTime: string }> = [];
    for (let period = 1; period <= config.lessonsPerDay; period++) {
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}:00`;
      currentMinutes += config.lessonDurationMinutes;
      const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}:00`;

      periodTimes.push({ period, startTime, endTime });

      const breakAfter = config.breaks.find((b) => b.afterPeriod === period);
      if (breakAfter) {
        currentMinutes += breakAfter.durationMinutes;
      }
    }

    // Build subject lesson allocations
    const subjectAllocations: SubjectLessonAllocation[] = [];

    // Add core subjects
    coreSubjects.forEach((subject) => {
      const configuredLessons = config.subjectLessons.find((sl) => sl.subject === subject.name);
      subjectAllocations.push({
        subject: subject.name,
        lessonsPerWeek: configuredLessons?.lessonsPerWeek || Math.min(4, subject.maxLessonsPerWeek),
        isOptional: false,
        requiresSpecialRoom: subject.requiresSpecialRoom,
        specialRoomType: subject.specialRoomType,
      });
    });

    // Add optional subjects
    optionalSubjects.forEach((subject) => {
      const configuredLessons = config.subjectLessons.find((sl) => sl.subject === subject.name);
      if (configuredLessons && configuredLessons.lessonsPerWeek > 0) {
        subjectAllocations.push({
          subject: subject.name,
          lessonsPerWeek: configuredLessons.lessonsPerWeek,
          isOptional: true,
          pathway: subject.pathway,
          requiresSpecialRoom: subject.requiresSpecialRoom,
          specialRoomType: subject.specialRoomType,
        });
      }
    });

    // Initialize trackers
    const teacherTracker: TeacherSlotTracker = {};
    teachers.forEach((t) => {
      teacherTracker[t.id] = {
        weeklyCount: 0,
        maxPerWeek: t.maxLessonsPerWeek,
        dailyCount: {},
      };
      DAYS.forEach((d) => {
        teacherTracker[t.id].dailyCount[d] = 0;
      });
    });

    const subjectTracker: SubjectSlotTracker = {};
    subjects.forEach((s) => {
      subjectTracker[s.name] = {
        weeklyCount: 0,
        maxPerWeek: s.maxLessonsPerWeek,
      };
    });

    // Calculate total available slots
    const totalSlotsPerWeek = config.lessonsPerDay * DAYS.length;
    const freeSlotsNeeded = freePeriodsPerDay * DAYS.length;
    const teachingSlotsAvailable = totalSlotsPerWeek - freeSlotsNeeded;

    // Create subject pool based on allocations
    const subjectPool: SubjectLessonAllocation[] = [];
    subjectAllocations.forEach((alloc) => {
      for (let i = 0; i < alloc.lessonsPerWeek; i++) {
        subjectPool.push(alloc);
      }
    });

    // Shuffle subject pool
    const shuffledPool = [...subjectPool].sort(() => Math.random() - 0.5);

    // Delete existing timetable if regenerating
    const { data: existingTimetables } = await supabase
      .from("timetables")
      .select("id")
      .eq("school_id", options.schoolId)
      .eq("grade_id", options.gradeId)
      .eq("stream_id", options.streamId)
      .eq("term_id", options.termId)
      .eq("academic_year_id", options.academicYearId);

    if (existingTimetables && existingTimetables.length > 0) {
      if (!options.regenerate) {
        return {
          success: false,
          message: "Timetable exists. Set regenerate to true to override.",
          conflicts: [],
          stats: { totalSlots: 0, filledSlots: 0, freeSlots: 0, coreSubjectSlots: 0, optionalSubjectSlots: 0, teacherUtilization: 0, roomUtilization: 0 },
          warnings: [],
        };
      }

      for (const tt of existingTimetables) {
        await supabase.from("timetable_slots").delete().eq("timetable_id", tt.id);
        await supabase.from("timetables").delete().eq("id", tt.id);
      }
    }

    // Create new timetable
    const { data: newTimetable, error: timetableError } = await supabase
      .from("timetables")
      .insert({
        school_id: options.schoolId,
        grade_id: options.gradeId,
        stream_id: options.streamId,
        term_id: options.termId,
        academic_year_id: options.academicYearId,
        version: 1,
        is_active: true,
      })
      .select()
      .single();

    if (timetableError) throw timetableError;

    // Generate slots
    const slots: Array<Omit<TimetableSlot, "id" | "createdAt" | "updatedAt" | "teacher" | "room"> & {
      isFreePeriod: boolean;
      isOptionalSubject: boolean;
      pathway?: string;
    }> = [];

    let poolIndex = 0;
    let coreSlots = 0;
    let optionalSlots = 0;
    let freeSlots = 0;

    for (const day of DAYS) {
      let freePeriodPlacedToday = 0;
      const periodsAvailableForFree = freePeriodsPerDay;

      // Randomly select periods for free lessons
      const freePeriodIndices = new Set<number>();
      while (freePeriodPlacedToday < periodsAvailableForFree && freePeriodIndices.size < config.lessonsPerDay) {
        const randomPeriod = Math.floor(Math.random() * config.lessonsPerDay);
        freePeriodIndices.add(randomPeriod);
        freePeriodPlacedToday++;
      }

      for (let periodIdx = 0; periodIdx < periodTimes.length; periodIdx++) {
        const periodTime = periodTimes[periodIdx];

        // Check if this should be a free period
        if (freePeriodIndices.has(periodIdx)) {
          slots.push({
            timetableId: newTimetable.id,
            day,
            period: periodTime.period,
            startTime: periodTime.startTime,
            endTime: periodTime.endTime,
            subject: "Free Period",
            teacherId: undefined,
            roomId: streamRoomMapped?.id,
            isFreePeriod: true,
            isOptionalSubject: false,
          });
          freeSlots++;
          continue;
        }

        // Get subject from pool, respecting time restrictions
        let allocation: SubjectLessonAllocation | undefined;
        let searchCount = 0;
        const maxSearch = shuffledPool.length;

        while (searchCount < maxSearch) {
          const candidate = shuffledPool[poolIndex % shuffledPool.length];
          poolIndex++;
          searchCount++;

          // Check subject time restriction
          const maxPeriod = subjectMaxPeriodMap[candidate.subject];
          if (maxPeriod !== undefined && periodTime.period > maxPeriod) {
            // This subject cannot be placed at this period, try next
            continue;
          }

          allocation = candidate;
          break;
        }

        if (!allocation) {
          // No subject available for this period due to constraints - make it a free period
          slots.push({
            timetableId: newTimetable.id,
            day,
            period: periodTime.period,
            startTime: periodTime.startTime,
            endTime: periodTime.endTime,
            subject: "Free Period",
            teacherId: undefined,
            roomId: streamRoomMapped?.id,
            isFreePeriod: true,
            isOptionalSubject: false,
          });
          freeSlots++;
          continue;
        }

        // Get teacher for subject
        let teacherId = subjectTeacherMap[allocation.subject];

        // Check teacher constraints
        if (teacherId && teacherTracker[teacherId]) {
          const tracker = teacherTracker[teacherId];
          if (tracker.weeklyCount >= tracker.maxPerWeek) {
            conflicts.push({
              type: "teacher_overload",
              message: `Teacher max lessons exceeded for ${allocation.subject}`,
              details: { day, period: periodTime.period, subject: allocation.subject, teacherId },
            });
            teacherId = undefined; // Remove teacher assignment
          } else {
            tracker.weeklyCount++;
            tracker.dailyCount[day]++;
          }
        }

        // Get room
        let roomId = streamRoomMapped?.id;
        if (allocation.requiresSpecialRoom && allocation.specialRoomType) {
          const specialRoom = rooms.find(
            (r) => r.roomType === allocation.specialRoomType || r.name.toLowerCase().includes(allocation.specialRoomType?.toLowerCase() || "")
          );
          if (specialRoom) {
            roomId = specialRoom.id;
          } else {
            conflicts.push({
              type: "no_room_available",
              message: `No ${allocation.specialRoomType} room available for ${allocation.subject}`,
              details: { day, period: periodTime.period, subject: allocation.subject },
            });
          }
        }

        // Track subject usage
        if (subjectTracker[allocation.subject]) {
          subjectTracker[allocation.subject].weeklyCount++;
        }

        slots.push({
          timetableId: newTimetable.id,
          day,
          period: periodTime.period,
          startTime: periodTime.startTime,
          endTime: periodTime.endTime,
          subject: allocation.subject,
          teacherId: teacherId || undefined,
          roomId: roomId || undefined,
          isFreePeriod: false,
          isOptionalSubject: allocation.isOptional,
          pathway: allocation.pathway,
        });

        if (allocation.isOptional) {
          optionalSlots++;
        } else {
          coreSlots++;
        }
      }
    }

    // Insert slots
    const { error: slotsError } = await supabase.from("timetable_slots").insert(
      slots.map((slot) => ({
        timetable_id: slot.timetableId,
        day: slot.day,
        period: slot.period,
        start_time: slot.startTime,
        end_time: slot.endTime,
        subject: slot.subject,
        teacher_id: slot.teacherId || null,
        room_id: slot.roomId || null,
        is_free_period: slot.isFreePeriod,
        is_optional_subject: slot.isOptionalSubject,
        pathway: slot.pathway || null,
      }))
    );

    if (slotsError) throw slotsError;

    // Calculate stats
    const filledSlots = slots.filter((s) => s.teacherId && !s.isFreePeriod).length;
    const teachersUsed = new Set(slots.filter((s) => s.teacherId).map((s) => s.teacherId)).size;
    const roomsUsed = new Set(slots.filter((s) => s.roomId).map((s) => s.roomId)).size;

    return {
      success: true,
      message: `Timetable generated with ${coreSlots} core, ${optionalSlots} optional, and ${freeSlots} free periods.`,
      timetableId: newTimetable.id,
      conflicts,
      stats: {
        totalSlots: slots.length,
        filledSlots,
        freeSlots,
        coreSubjectSlots: coreSlots,
        optionalSubjectSlots: optionalSlots,
        teacherUtilization: teachers.length > 0 ? Math.round((teachersUsed / teachers.length) * 100) : 0,
        roomUtilization: rooms.length > 0 ? Math.round((roomsUsed / rooms.length) * 100) : 0,
      },
      warnings,
    };
  } catch (error: any) {
    console.error("Enhanced timetable generation error:", error);
    return {
      success: false,
      message: error.message || "Failed to generate timetable",
      conflicts,
      stats: { totalSlots: 0, filledSlots: 0, freeSlots: 0, coreSubjectSlots: 0, optionalSubjectSlots: 0, teacherUtilization: 0, roomUtilization: 0 },
      warnings,
    };
  }
};
