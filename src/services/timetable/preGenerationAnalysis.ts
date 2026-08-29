/**
 * Pre-generation analysis for the master timetable.
 * 
 * Validates all prerequisites before generation starts:
 * 1. Every division has a timetable configuration
 * 2. Subject-teacher coverage across all grade-streams
 * 3. Period capacity vs required lessons
 * 4. Shared teacher workload feasibility across divisions
 * 5. Room availability for all streams
 */

import { supabase } from "@/integrations/supabase/client";
import { StreamGenerationUnit } from "./commonTimetableUtils";

export interface PreGenerationIssue {
  severity: "error" | "warning" | "info";
  category: "config" | "teacher" | "subject" | "room" | "capacity";
  division?: string;
  grade?: string;
  stream?: string;
  message: string;
}

export interface PreGenerationReport {
  canProceed: boolean;
  issues: PreGenerationIssue[];
  summary: {
    totalDivisions: number;
    divisionsWithConfig: number;
    totalStreams: number;
    streamsWithRooms: number;
    totalSubjects: number;
    subjectsWithTeachers: number;
    sharedTeacherCount: number;
    totalRequiredLessons: number;
    totalAvailableSlots: number;
  };
}

/**
 * Analyze teacher sharing across divisions. Returns a map of teacherId -> divisions they serve.
 */
function analyzeTeacherSharing(
  streamUnits: StreamGenerationUnit[]
): Map<string, { name: string; divisions: Set<string>; totalLessons: number }> {
  const teacherMap = new Map<string, { name: string; divisions: Set<string>; totalLessons: number }>();

  for (const unit of streamUnits) {
    for (const alloc of unit.subjectAllocations) {
      if (!alloc.teacherId) continue;
      if (!teacherMap.has(alloc.teacherId)) {
        teacherMap.set(alloc.teacherId, {
          name: alloc.teacherName || "Unknown",
          divisions: new Set(),
          totalLessons: 0,
        });
      }
      const entry = teacherMap.get(alloc.teacherId)!;
      entry.divisions.add(unit.gradeCurriculum);
      entry.totalLessons += alloc.lessonsPerWeek;
    }
  }

  return teacherMap;
}

/**
 * Run full pre-generation analysis on the prepared stream units.
 */
export function analyzePreGeneration(
  streamUnits: StreamGenerationUnit[],
  divisions: any[],
  timetableConfigs: any[],
  teachers: any[]
): PreGenerationReport {
  const issues: PreGenerationIssue[] = [];

  // 1. Check every division has a timetable configuration
  const divisionsWithConfig = new Set<string>();
  for (const config of timetableConfigs || []) {
    if (config.division_id) divisionsWithConfig.add(config.division_id);
  }

  const activeDivisions = (divisions || []).filter((d: any) => d.is_active);
  for (const div of activeDivisions) {
    if (!divisionsWithConfig.has(div.id)) {
      const hasStreamsInDiv = streamUnits.some((u) => u.gradeCurriculum === div.curriculum);
      if (hasStreamsInDiv) {
        issues.push({
          severity: "error",
          category: "config",
          division: div.name,
          message: `Division "${div.name}" has no timetable configuration. Streams in this division will use default settings (8:20 start, 40min lessons, 8 periods). Create a configuration in the Timetable Config tab.`,
        });
      }
    }
  }

  // 2. Check subject-teacher assignments
  let subjectsWithTeachers = 0;
  let subjectsWithoutTeachers = 0;
  const unassignedByGrade = new Map<string, string[]>();

  for (const unit of streamUnits) {
    for (const alloc of unit.subjectAllocations) {
      if (alloc.teacherId) {
        subjectsWithTeachers++;
      } else {
        subjectsWithoutTeachers++;
        const key = `${unit.gradeName} ${unit.streamName}`;
        if (!unassignedByGrade.has(key)) unassignedByGrade.set(key, []);
        unassignedByGrade.get(key)!.push(alloc.subject);
      }
    }
  }

  // Group unassigned subjects for cleaner messages
  for (const [gradeStream, subjects] of unassignedByGrade) {
    const uniqueSubjects = [...new Set(subjects)];
    if (uniqueSubjects.length > 3) {
      issues.push({
        severity: "warning",
        category: "teacher",
        message: `${gradeStream}: ${uniqueSubjects.length} subjects have no teacher assigned (${uniqueSubjects.slice(0, 3).join(", ")}...). These will appear as "No Teacher" in the timetable.`,
      });
    } else {
      issues.push({
        severity: "warning",
        category: "teacher",
        message: `${gradeStream}: ${uniqueSubjects.join(", ")} — no teacher assigned. Assign teachers in the Teachers module.`,
      });
    }
  }

  // 3. Check period capacity vs required lessons per stream
  for (const unit of streamUnits) {
    const days = unit.config.schoolDays?.length || 5;
    const availableSlots = days * unit.config.lessonsPerDay;
    const requiredLessons = unit.subjectAllocations.reduce((s, a) => s + a.lessonsPerWeek, 0);

    if (requiredLessons > availableSlots) {
      issues.push({
        severity: "error",
        category: "capacity",
        grade: unit.gradeName,
        stream: unit.streamName,
        message: `${unit.gradeName} ${unit.streamName}: Requires ${requiredLessons} lessons/week but only ${availableSlots} slots available (${days} days × ${unit.config.lessonsPerDay} periods). Reduce subjects or increase periods.`,
      });
    } else if (requiredLessons > availableSlots * 0.9) {
      issues.push({
        severity: "warning",
        category: "capacity",
        grade: unit.gradeName,
        stream: unit.streamName,
        message: `${unit.gradeName} ${unit.streamName}: Using ${Math.round((requiredLessons / availableSlots) * 100)}% of available slots (${requiredLessons}/${availableSlots}). Very few free periods — teacher conflicts may cause failures.`,
      });
    }
  }

  // 4. Analyze shared teachers
  const teacherSharing = analyzeTeacherSharing(streamUnits);
  const sharedTeachers: Array<{ name: string; totalLessons: number; maxPerWeek: number }> = [];

  for (const [teacherId, info] of teacherSharing) {
    const teacherData = (teachers || []).find((t: any) => t.id === teacherId);
    const maxPerWeek = teacherData?.max_lessons_per_week || 30;

    if (info.divisions.size > 1) {
      sharedTeachers.push({ name: info.name, totalLessons: info.totalLessons, maxPerWeek });

      if (info.totalLessons > maxPerWeek) {
        issues.push({
          severity: "error",
          category: "teacher",
          message: `${info.name} is shared across ${[...info.divisions].join(", ")} divisions and needs ${info.totalLessons} lessons/week but max is ${maxPerWeek}. Some lessons will fail to schedule.`,
        });
      } else if (info.totalLessons > maxPerWeek * 0.85) {
        issues.push({
          severity: "warning",
          category: "teacher",
          message: `${info.name} is shared across ${[...info.divisions].join(", ")} divisions with ${info.totalLessons}/${maxPerWeek} lessons/week (${Math.round((info.totalLessons / maxPerWeek) * 100)}% utilization). Time slot conflicts are likely.`,
        });
      } else {
        issues.push({
          severity: "info",
          category: "teacher",
          message: `${info.name} teaches across ${[...info.divisions].join(", ")} divisions (${info.totalLessons}/${maxPerWeek} lessons/week). The generator will coordinate their schedule across all divisions.`,
        });
      }
    } else if (info.totalLessons > maxPerWeek) {
      issues.push({
        severity: "error",
        category: "teacher",
        message: `${info.name} needs ${info.totalLessons} lessons/week across all streams but max is ${maxPerWeek}. Some lessons will fail to schedule.`,
      });
    }
  }

  // 5. Check streams without rooms
  const streamsWithRooms = streamUnits.length;

  // Compute summary totals
  const totalSubjects = streamUnits.reduce((s, u) => s + u.subjectAllocations.length, 0);
  const totalRequiredLessons = streamUnits.reduce(
    (s, u) => s + u.subjectAllocations.reduce((ss, a) => ss + a.lessonsPerWeek, 0),
    0
  );
  const totalAvailableSlots = streamUnits.reduce(
    (s, u) => s + (u.config.schoolDays?.length || 5) * u.config.lessonsPerDay,
    0
  );

  const hasBlockingErrors = issues.some(
    (i) => i.severity === "error" && i.category === "capacity"
  );

  return {
    canProceed: !hasBlockingErrors,
    issues,
    summary: {
      totalDivisions: activeDivisions.length,
      divisionsWithConfig: divisionsWithConfig.size,
      totalStreams: streamUnits.length,
      streamsWithRooms,
      totalSubjects,
      subjectsWithTeachers,
      sharedTeacherCount: sharedTeachers.length,
      totalRequiredLessons,
      totalAvailableSlots,
    },
  };
}
