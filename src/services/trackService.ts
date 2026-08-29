import { supabase } from "@/integrations/supabase/client";
import { CBCSeniorPathway } from "./curriculumService";

export interface CBCSeniorTrack {
  id: string;
  school_id: string;
  pathway: CBCSeniorPathway;
  name: string;
  description: string | null;
  subject_ids: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrackWithSubjects extends CBCSeniorTrack {
  subjects: { id: string; name: string }[];
}

/**
 * Get all tracks for a school
 */
export async function getSchoolTracks(schoolId: string): Promise<CBCSeniorTrack[]> {
  const { data, error } = await supabase
    .from("cbc_senior_tracks")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("pathway")
    .order("display_order");

  if (error) {
    console.error("Error fetching school tracks:", error);
    throw error;
  }

  return data as CBCSeniorTrack[];
}

/**
 * Get tracks by pathway
 */
export async function getTracksByPathway(
  schoolId: string,
  pathway: CBCSeniorPathway
): Promise<CBCSeniorTrack[]> {
  const { data, error } = await supabase
    .from("cbc_senior_tracks")
    .select("*")
    .eq("school_id", schoolId)
    .eq("pathway", pathway)
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    console.error("Error fetching tracks by pathway:", error);
    throw error;
  }

  return data as CBCSeniorTrack[];
}

/**
 * Get tracks with resolved subject names
 */
export async function getTracksWithSubjects(
  schoolId: string
): Promise<TrackWithSubjects[]> {
  // First get all tracks
  const tracks = await getSchoolTracks(schoolId);

  // Get all CBE Senior subjects for this school
  const { data: subjects, error: subjectError } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("curriculum", "cbc-senior")
    .eq("is_active", true);

  if (subjectError) {
    console.error("Error fetching subjects:", subjectError);
    throw subjectError;
  }

  const subjectMap = new Map(subjects?.map((s) => [s.id, s.name]) || []);

  // Resolve subject names for each track
  return tracks.map((track) => ({
    ...track,
    subjects: track.subject_ids.map((id) => ({
      id,
      name: subjectMap.get(id) || "Unknown Subject",
    })),
  }));
}

/**
 * Create a new track
 */
export async function createTrack(
  schoolId: string,
  pathway: CBCSeniorPathway,
  name: string,
  subjectIds: string[],
  description?: string
): Promise<CBCSeniorTrack> {
  // Get max display_order for this pathway
  const { data: existing } = await supabase
    .from("cbc_senior_tracks")
    .select("display_order")
    .eq("school_id", schoolId)
    .eq("pathway", pathway)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

  const { data, error } = await supabase
    .from("cbc_senior_tracks")
    .insert({
      school_id: schoolId,
      pathway,
      name,
      description: description || null,
      subject_ids: subjectIds,
      display_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating track:", error);
    throw error;
  }

  return data as CBCSeniorTrack;
}

/**
 * Update a track
 */
export async function updateTrack(
  trackId: string,
  updates: Partial<Pick<CBCSeniorTrack, "name" | "description" | "subject_ids" | "is_active">>
): Promise<CBCSeniorTrack> {
  const { data, error } = await supabase
    .from("cbc_senior_tracks")
    .update(updates)
    .eq("id", trackId)
    .select()
    .single();

  if (error) {
    console.error("Error updating track:", error);
    throw error;
  }

  return data as CBCSeniorTrack;
}

/**
 * Delete a track (soft delete)
 */
export async function deleteTrack(trackId: string): Promise<void> {
  const { error } = await supabase
    .from("cbc_senior_tracks")
    .update({ is_active: false })
    .eq("id", trackId);

  if (error) {
    console.error("Error deleting track:", error);
    throw error;
  }
}

/**
 * Get a single track by ID
 */
export async function getTrack(trackId: string): Promise<CBCSeniorTrack | null> {
  const { data, error } = await supabase
    .from("cbc_senior_tracks")
    .select("*")
    .eq("id", trackId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error fetching track:", error);
    throw error;
  }

  return data as CBCSeniorTrack;
}

/**
 * Assign a student to a track
 */
export async function assignStudentToTrack(
  studentId: string,
  trackId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ track_id: trackId })
    .eq("id", studentId);

  if (error) {
    console.error("Error assigning student to track:", error);
    throw error;
  }
}

/**
 * Get students by track
 */
export async function getStudentsByTrack(trackId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, name")
    .eq("track_id", trackId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching students by track:", error);
    throw error;
  }

  return data || [];
}
