
import { supabase } from "@/integrations/supabase/client";
import { Grade, Stream, Teacher, AcademicYear, SchoolTerm } from "@/types";

export const getGrades = async (schoolId: string) => {
  console.log('Fetching grades for school:', schoolId);
  
  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .eq("school_id", schoolId)
    .order("level");
  
  if (error) {
    console.error('Error fetching grades:', error);
    throw error;
  }

  console.log('Successfully fetched grades:', data);
  
  return data.map(grade => ({
    id: grade.id,
    name: grade.name,
    level: grade.level,
    curriculum: grade.curriculum,
    schoolId: grade.school_id,
    academicYearId: grade.academic_year_id,
    createdAt: grade.created_at,
    updatedAt: grade.updated_at
  })) as Grade[];
};

export const createGrade = async (gradeData: {
  name: string;
  level: number;
  curriculum: string;
  schoolId: string;
  divisionId?: string;
}) => {
  console.log('Creating grade with data:', gradeData);
  
  // First, get or create an active academic year
  let academicYear = await getActiveAcademicYear(gradeData.schoolId);
  
  if (!academicYear) {
    console.log('No active academic year found, creating one...');
    const currentYear = new Date().getFullYear();
    academicYear = await createAcademicYear({
      year: `${currentYear}/${currentYear + 1}`,
      isActive: true,
      schoolId: gradeData.schoolId
    });
  }
  
  const { data, error } = await supabase
    .from("grades")
    .insert({
      name: gradeData.name,
      level: gradeData.level,
      curriculum: gradeData.curriculum,
      school_id: gradeData.schoolId,
      academic_year_id: academicYear.id,
      division_id: gradeData.divisionId || null,
      is_active: true
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating grade:', error);
    throw error;
  }
  
  console.log('Successfully created grade:', data);
  
  // After creating the grade, apply all existing school streams to this new grade
  await applyAllStreamsToGrade(data.id, gradeData.schoolId);
  
  return {
    id: data.id,
    name: data.name,
    level: data.level,
    curriculum: data.curriculum,
    schoolId: data.school_id,
    academicYearId: data.academic_year_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Grade;
};

// Apply all existing school streams to a new grade
export const applyAllStreamsToGrade = async (gradeId: string, schoolId: string) => {
  console.log('Applying all streams to new grade:', gradeId, schoolId);
  
  // Get all school-level streams
  const schoolStreams = await getStreams(schoolId);
  
  // Create grade_streams entries for each stream
  const gradeStreamEntries = schoolStreams.map(stream => ({
    grade_id: gradeId,
    stream_id: stream.id
  }));
  
  if (gradeStreamEntries.length > 0) {
    const { error } = await supabase
      .from("grade_streams")
      .insert(gradeStreamEntries);
      
    if (error) {
      console.error('Error applying streams to new grade:', error);
      throw error;
    }
  }
  
  console.log('Successfully applied all streams to new grade');
};

export const updateGrade = async (id: string, updates: {
  name?: string;
  level?: number;
  curriculum?: string;
}) => {
  console.log('Updating grade:', id, updates);
  
  const updateData: any = {};
  if (updates.name) updateData.name = updates.name;
  if (updates.level) updateData.level = updates.level;
  if (updates.curriculum) updateData.curriculum = updates.curriculum;
  
  const { data, error } = await supabase
    .from("grades")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating grade:', error);
    throw error;
  }
  
  console.log('Successfully updated grade:', data);
  
  return {
    id: data.id,
    name: data.name,
    level: data.level,
    curriculum: data.curriculum,
    schoolId: data.school_id,
    academicYearId: data.academic_year_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Grade;
};

export const deleteGrade = async (id: string) => {
  console.log('Deleting grade:', id);
  
  const { error } = await supabase
    .from("grades")
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error('Error deleting grade:', error);
    throw error;
  }
  
  console.log('Successfully deleted grade:', id);
};

export const getStreams = async (schoolId: string, gradeId?: string) => {
  console.log('Fetching streams for school:', schoolId, 'grade:', gradeId);
  
  if (gradeId) {
    // For grade-specific streams, use the grade_streams junction table
    const { data, error } = await supabase
      .from("grade_streams")
      .select(`
        streams:stream_id (
          id,
          name,
          teacher_id,
          academic_year_id,
          school_id,
          created_at,
          updated_at
        )
      `)
      .eq("grade_id", gradeId)
      .order("streams(name)");
    
    if (error) {
      console.error('Error fetching grade streams:', error);
      throw error;
    }

    console.log('Successfully fetched grade streams:', data);
    
    // Extract streams from the junction table results
    const streams = data?.map(item => item.streams).filter(Boolean) || [];
    
    return streams.map(stream => ({
      id: stream.id,
      name: stream.name,
      gradeId: gradeId,
      schoolId: stream.school_id,
      academicYearId: stream.academic_year_id,
      createdAt: stream.created_at,
      updatedAt: stream.updated_at
    })) as Stream[];
  } else {
    // For school-level streams, query directly by school_id
    const { data, error } = await supabase
      .from("streams")
      .select("*")
      .eq("school_id", schoolId)
      .order("name");
    
    if (error) {
      console.error('Error fetching school streams:', error);
      throw error;
    }

    console.log('Successfully fetched school streams:', data);
    
    return data?.map(stream => ({
      id: stream.id,
      name: stream.name,
      gradeId: stream.grade_id,
      schoolId: stream.school_id,
      academicYearId: stream.academic_year_id,
      createdAt: stream.created_at,
      updatedAt: stream.updated_at
    })) as Stream[] || [];
  }
};

// Get all stream-grade combinations for a school (for student assignment)
export const getSchoolStreamGradeCombinations = async (schoolId: string) => {
  console.log('Fetching stream-grade combinations for school:', schoolId);
  
  // Fetch grade-stream combinations from the junction table
  const { data: gradeStreamsData, error: gradeStreamsError } = await supabase
    .from("grade_streams")
    .select(`
      id,
      teacher_id,
      grades!inner (
        id,
        name,
        level,
        curriculum,
        school_id
      ),
      streams!inner (
        id,
        name,
        school_id
      )
    `)
    .eq("grades.school_id", schoolId)
    .eq("grades.is_active", true);
    
  if (gradeStreamsError) {
    console.error('Error fetching grade-stream combinations:', gradeStreamsError);
    throw gradeStreamsError;
  }

  console.log('Grade-stream combinations found:', gradeStreamsData?.length);
  
  // Transform the data to the expected format
  const combinations = gradeStreamsData?.map((gs: any) => ({
    id: gs.id, // Use the grade_streams ID as the combination ID
    gradeId: gs.grades.id,
    streamId: gs.streams.id,
    gradeName: gs.grades.name,
    gradeLevel: gs.grades.level,
    gradeCurriculum: gs.grades.curriculum,
    streamName: gs.streams.name,
    displayName: `${gs.grades.name} ${gs.streams.name}`, // e.g., "Grade 7 Blue"
    teacherId: gs.teacher_id
  })) || [];
  
  // Sort by grade level (client-side)
  combinations.sort((a, b) => a.gradeLevel - b.gradeLevel);
  
  console.log('Final combinations:', combinations.length);
  return combinations;
};

export const createStream = async (streamData: {
  name: string;
  gradeId?: string;
  schoolId?: string;
  teacherId?: string;
}) => {
  console.log('Creating school-level stream with data:', streamData);
  
  let schoolId: string;
  let academicYearId: string;
  
  if (streamData.gradeId) {
    // Grade-specific stream (legacy)
    const { data: grade, error: gradeError } = await supabase
      .from("grades")
      .select("school_id, academic_year_id")
      .eq("id", streamData.gradeId)
      .single();
      
    if (gradeError || !grade) {
      throw new Error("Grade not found");
    }
    
    schoolId = grade.school_id;
    academicYearId = grade.academic_year_id;
  } else if (streamData.schoolId) {
    // School-level stream (new approach)
    schoolId = streamData.schoolId;
    const activeAcademicYear = await getActiveAcademicYear(schoolId);
    if (!activeAcademicYear) {
      throw new Error("No active academic year found for school");
    }
    academicYearId = activeAcademicYear.id;
  } else {
    throw new Error("Either gradeId or schoolId must be provided");
  }
  
  const { data, error } = await supabase
    .from("streams")
    .insert({
      name: streamData.name,
      grade_id: streamData.gradeId || null, // null for school-level streams
      academic_year_id: academicYearId,
      school_id: schoolId
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating stream:', error);
    throw error;
  }
  
  console.log('Successfully created school stream:', data);
  
  // For school-level streams, apply to all grades (with duplicate handling)
  if (!streamData.gradeId) {
    try {
      await applyStreamToAllGrades(data.id, schoolId);
    } catch (error: any) {
      // If we get a duplicate key error, that's fine - it means the stream was already applied
      if (error.code !== '23505') {
        console.error('Error applying stream to grades:', error);
        throw error;
      }
      console.log('Stream already applied to some grades (ignoring duplicates)');
    }
  }
  
  return {
    id: data.id,
    name: data.name,
    gradeId: data.grade_id,
    teacherId: data.teacher_id,
    academicYearId: data.academic_year_id,
    schoolId: data.school_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Stream;
};

// Create school-level stream that applies to all grades
export const createSchoolStream = async (streamData: {
  name: string;
  schoolId: string;
  teacherId?: string;
}) => {
  console.log('Creating school-level stream with data:', streamData);
  
  // Get active academic year for the school
  const activeAcademicYear = await getActiveAcademicYear(streamData.schoolId);
  if (!activeAcademicYear) {
    throw new Error("No active academic year found for school");
  }
  
  const { data, error } = await supabase
    .from("streams")
    .insert({
      name: streamData.name,
      school_id: streamData.schoolId,
      academic_year_id: activeAcademicYear.id,
      grade_id: null // School-level streams don't belong to specific grades
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating school stream:', error);
    throw error;
  }
  
  console.log('Successfully created school stream:', data);
  
  return {
    id: data.id,
    name: data.name,
    gradeId: data.grade_id,
    teacherId: data.teacher_id,
    academicYearId: data.academic_year_id,
    schoolId: data.school_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Stream;
};

// Apply a stream to all grades in the school
export const applyStreamToAllGrades = async (streamId: string, schoolId: string) => {
  console.log('Applying stream to all grades:', streamId, schoolId);
  
  // Get all grades for the school
  const grades = await getGrades(schoolId);
  
  // Create grade_streams entries for each grade, handling duplicates
  for (const grade of grades) {
    try {
      const { error } = await supabase
        .from("grade_streams")
        .insert({
          grade_id: grade.id,
          stream_id: streamId
        });
        
      if (error && error.code !== '23505') {
        // Only throw if it's not a duplicate key error
        console.error('Error applying stream to grade:', grade.id, error);
        throw error;
      }
    } catch (error: any) {
      if (error.code !== '23505') {
        throw error;
      }
      // Ignore duplicate key errors
    }
  }
  
  console.log('Successfully applied stream to all grades');
};

export const updateStream = async (id: string, updates: {
  name?: string;
}) => {
  console.log('Updating stream:', id, updates);
  
  const updateData: any = {};
  if (updates.name) updateData.name = updates.name;
  
  const { data, error } = await supabase
    .from("streams")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating stream:', error);
    throw error;
  }
  
  console.log('Successfully updated stream:', data);
  
  return {
    id: data.id,
    name: data.name,
    gradeId: data.grade_id,
    academicYearId: data.academic_year_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Stream;
};

export const updateSchoolStream = async (id: string, updates: {
  name?: string;
}) => {
  console.log('Updating school stream:', id, updates);
  
  const updateData: any = {};
  if (updates.name) updateData.name = updates.name;
  
  const { data, error } = await supabase
    .from("streams")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating school stream:', error);
    throw error;
  }
  
  console.log('Successfully updated school stream:', data);
  
  return {
    id: data.id,
    name: data.name,
    gradeId: data.grade_id,
    academicYearId: data.academic_year_id,
    schoolId: data.school_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Stream;
};

export const deleteSchoolStream = async (id: string) => {
  console.log('Deleting school stream:', id);
  
  // Delete grade_streams entries first (cascading should handle this, but being explicit)
  await supabase
    .from("grade_streams")
    .delete()
    .eq("stream_id", id);
  
  // Delete the stream
  const { error } = await supabase
    .from("streams")
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error('Error deleting school stream:', error);
    throw error;
  }
  
  console.log('Successfully deleted school stream:', id);
};

export const deleteStream = async (id: string) => {
  console.log('Deleting stream:', id);
  
  // Delete grade_streams entries first to handle cascading properly
  await supabase
    .from("grade_streams")
    .delete()
    .eq("stream_id", id);
  
  const { error } = await supabase
    .from("streams")
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error('Error deleting stream:', error);
    throw error;
  }
  
  console.log('Successfully deleted stream:', id);
};

// Get streams for dropdown selections (simplified format)
export const getStreamsForDropdown = async (schoolId: string) => {
  console.log('Fetching streams for dropdown:', schoolId);
  
  const { data, error } = await supabase
    .from("streams")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");
    
  if (error) {
    console.error('Error fetching streams for dropdown:', error);
    throw error;
  }
  
  return data?.map(stream => ({
    value: stream.id,
    label: stream.name
  })) || [];
};

// Get stream-grade combinations for dropdowns
export const getStreamGradeCombinationsForDropdown = async (schoolId: string) => {
  console.log('Fetching stream-grade combinations for dropdown:', schoolId);
  
  const combinations = await getSchoolStreamGradeCombinations(schoolId);
  
  return combinations.map(combo => ({
    value: combo.id, // This is the composite ID
    label: combo.displayName, // e.g., "Grade 7 Blue"
    gradeId: combo.gradeId,
    streamId: combo.streamId,
    gradeName: combo.gradeName,
    streamName: combo.streamName
  }));
};

export const getTeachers = async (schoolId: string) => {
  console.log('Fetching teachers for school:', schoolId);
  
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("school_id", schoolId)
    .order("name");
  
  if (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }

  console.log('Successfully fetched teachers:', data);
  
  return data.map(teacher => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    subject: teacher.subject,
    subjectsTaught: teacher.subjects_taught || [],
    schoolId: teacher.school_id,
    isStreamTeacher: teacher.is_stream_teacher,
    academicYearId: teacher.academic_year_id,
    createdAt: teacher.created_at,
    updatedAt: teacher.updated_at
  })) as Teacher[];
};

export const getActiveAcademicYear = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .single();

  if (error) {
    console.log('No active academic year found, looking for latest...');
    // If no active academic year found, get the latest one
    const { data: latestYear, error: latestError } = await supabase
      .from("academic_years")
      .select("*")
      .eq("school_id", schoolId)
      .order("year", { ascending: false })
      .limit(1)
      .single();
      
    if (latestError) {
      console.log('No academic years found at all');
      return null;
    }
    return mapAcademicYear(latestYear);
  }
  
  return mapAcademicYear(data);
};

function mapAcademicYear(year: any): AcademicYear {
  return {
    id: year.id,
    year: year.year,
    isActive: year.is_active,
    schoolId: year.school_id,
    createdAt: year.created_at,
    updatedAt: year.updated_at
  };
}

// Get current active term with automatic detection
export const getCurrentActiveTerm = async (schoolId: string, academicYearId?: string) => {
  const today = new Date();
  
  let query = supabase
    .from("terms")
    .select("*")
    .eq("school_id", schoolId)
    .lte("start_date", today.toISOString().split('T')[0])
    .gte("end_date", today.toISOString().split('T')[0]);
    
  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }
  
  const { data, error } = await query.single();
  
  if (error) {
    console.log('No current term found based on dates, checking for active term');
    // Fallback to manually set active term
    const { data: activeTerm, error: activeError } = await supabase
      .from("terms")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .single();
      
    if (activeError) {
      return null;
    }
    return mapTerm(activeTerm);
  }
  
  return mapTerm(data);
};

// Get all terms for school with automatic transition detection
export const getActiveTerms = async (schoolId: string, academicYearId?: string) => {
  let query = supabase
    .from("terms")
    .select("*")
    .eq("school_id", schoolId);
    
  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }
  
  const { data, error } = await query.order("start_date");
  
  if (error) throw error;
  
  const terms = data.map(mapTerm);
  
  // Check if we need to transition terms automatically
  await checkAndTransitionTerms(schoolId, terms);
  
  return terms;
};

// Check if term transition is needed and notify
const checkAndTransitionTerms = async (schoolId: string, terms: SchoolTerm[]) => {
  const today = new Date();
  const currentTerm = terms.find(term => 
    new Date(term.startDate) <= today && new Date(term.endDate) >= today
  );
  
  const activeTerm = terms.find(term => term.isActive);
  
  // If current term based on dates differs from active term, transition needed
  if (currentTerm && activeTerm && currentTerm.id !== activeTerm.id) {
    console.log(`Term transition needed: ${activeTerm.name} -> ${currentTerm.name}`);
    
    // Update term statuses
    await supabase
      .from("terms")
      .update({ is_active: false })
      .eq("school_id", schoolId);
      
    await supabase
      .from("terms")
      .update({ is_active: true })
      .eq("id", currentTerm.id);
      
    // Here you could add notification logic to alert admins
    console.log(`Automatically transitioned to ${currentTerm.name}`);
  }
};

function mapTerm(term: any): SchoolTerm {
  return {
    id: term.id,
    name: term.name,
    startDate: term.start_date,
    endDate: term.end_date,
    academicYearId: term.academic_year_id,
    isActive: term.is_active,
    schoolId: term.school_id
  };
}

// Create new academic year
export const createAcademicYear = async (academicYear: Omit<AcademicYear, 'id' | 'createdAt' | 'updatedAt'>) => {
  const { data, error } = await supabase
    .from("academic_years")
    .insert({
      year: academicYear.year,
      is_active: academicYear.isActive,
      school_id: academicYear.schoolId
    })
    .select()
    .single();
    
  if (error) throw error;
  return mapAcademicYear(data);
};

// Create new term
export const createTerm = async (term: Omit<SchoolTerm, 'id'>) => {
  const { data, error } = await supabase
    .from("terms")
    .insert({
      name: term.name,
      start_date: term.startDate,
      end_date: term.endDate,
      academic_year_id: term.academicYearId,
      is_active: term.isActive,
      school_id: term.schoolId
    })
    .select()
    .single();
    
  if (error) throw error;
  return mapTerm(data);
};

// Get all academic years for a school
export const getAcademicYears = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("year", { ascending: false });

  if (error) throw error;
  return data.map(mapAcademicYear);
};

// Get all terms for a school
export const getTerms = async (schoolId: string, academicYearId?: string) => {
  let query = supabase
    .from("terms")
    .select("*")
    .eq("school_id", schoolId);
    
  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }
  
  const { data, error } = await query.order("start_date");
  
  if (error) throw error;
  return data.map(mapTerm);
};

// Update academic year
export const updateAcademicYear = async (id: string, updates: Partial<AcademicYear>) => {
  const { data, error } = await supabase
    .from("academic_years")
    .update({
      ...(updates.year && { year: updates.year }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return mapAcademicYear(data);
};

// Update term
export const updateTerm = async (id: string, updates: Partial<SchoolTerm>) => {
  const { data, error } = await supabase
    .from("terms")
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.startDate && { start_date: updates.startDate }),
      ...(updates.endDate && { end_date: updates.endDate }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return mapTerm(data);
};

// Set term as active (and deactivate others in same school)
export const setActiveTerm = async (termId: string, schoolId: string) => {
  // Deactivate all terms for this school
  const { error: deactivateError } = await supabase
    .from("terms")
    .update({ is_active: false })
    .eq("school_id", schoolId);
    
  if (deactivateError) throw deactivateError;
  
  // Activate the selected term
  const { data, error } = await supabase
    .from("terms")
    .update({ is_active: true })
    .eq("id", termId)
    .select()
    .single();
    
  if (error) throw error;
  return mapTerm(data);
};

// Set academic year as active (and deactivate others in same school)
export const setActiveAcademicYear = async (yearId: string, schoolId: string) => {
  // Deactivate all academic years for this school
  const { error: deactivateError } = await supabase
    .from("academic_years")
    .update({ is_active: false })
    .eq("school_id", schoolId);
    
  if (deactivateError) throw deactivateError;
  
  // Activate the selected academic year
  const { data, error } = await supabase
    .from("academic_years")
    .update({ is_active: true })
    .eq("id", yearId)
    .select()
    .single();
    
  if (error) throw error;
  return mapAcademicYear(data);
};

// Delete academic year
export const deleteAcademicYear = async (id: string) => {
  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
};

// Get year transition notifications
export const getYearTransitionNotifications = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("year_transition_notifications")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data;
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from("year_transition_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
    
  if (error) throw error;
};

// Get archived academic years
export const getArchivedAcademicYears = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("archived_academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("archived_at", { ascending: false });
    
  if (error) throw error;
  return data;
};

// Get archived student assignments for a specific academic year
export const getArchivedStudentAssignments = async (academicYearId: string) => {
  const { data, error } = await supabase
    .from("archived_student_assignments")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("grade_name", { ascending: true });
    
  if (error) throw error;
  return data;
};

// Get archived teacher assignments for a specific academic year
export const getArchivedTeacherAssignments = async (academicYearId: string) => {
  const { data, error } = await supabase
    .from("archived_teacher_assignments")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("archived_at", { ascending: false });
    
  if (error) throw error;
  return data;
};

// Transition to new academic year (calls database function)
export const transitionToNewAcademicYear = async (schoolId: string, newYear: string, userId: string) => {
  const { data, error } = await supabase.rpc('transition_to_new_academic_year', {
    p_school_id: schoolId,
    p_new_year: newYear,
    p_user_id: userId
  });
  
  if (error) throw error;
  return data;
};

// Check and transition terms (calls database function)
export const checkAndTransitionTermsFunction = async () => {
  const { error } = await supabase.rpc('check_and_transition_terms');
  if (error) throw error;
};
