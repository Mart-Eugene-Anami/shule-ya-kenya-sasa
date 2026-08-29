/**
 * Exam Service
 *
 * CRUD operations for exam management. Handles the snake_case (DB) ↔ camelCase
 * (frontend) field transformation. Exams are scoped to schools and optionally
 * linked to terms and specific grades/subjects.
 */
import { supabase } from "@/integrations/supabase/client";
import { Exam } from "@/types";

export const examService = {
  // Create a new exam
  async createExam(examData: Omit<Exam, 'id' | 'createdAt'>) {
    console.log('Creating exam with data:', examData);
    
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert({
          name: examData.name,
          description: examData.description,
          grades: examData.grades,
          subjects: examData.subjects,
          start_date: examData.startDate,
          end_date: examData.endDate,
          school_id: examData.schoolId,
          created_by: examData.createdBy,
          term_id: examData.termId,
          is_active: examData.isActive ?? true
        })
        .select(`
          id,
          name,
          description,
          grades,
          subjects,
          start_date,
          end_date,
          school_id,
          created_by,
          created_at,
          term_id,
          is_active
        `)
        .single();

      if (error) {
        console.error('Error creating exam:', error);
        throw error;
      }

      console.log('Successfully created exam:', data);
      
      // Transform database response to match frontend types
      const transformedExam: Exam = {
        id: data.id,
        name: data.name,
        description: data.description,
        grades: data.grades,
        subjects: data.subjects,
        startDate: data.start_date,
        endDate: data.end_date,
        schoolId: data.school_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        termId: data.term_id,
        isActive: data.is_active
      };
      
      return transformedExam;
    } catch (error) {
      console.error('Failed to create exam:', error);
      throw error;
    }
  },

  // Get exams for a school
  async getExamsBySchool(schoolId: string) {
    console.log('Fetching exams for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          description,
          grades,
          subjects,
          start_date,
          end_date,
          school_id,
          created_by,
          created_at,
          term_id,
          is_active
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exams:', error);
        throw error;
      }

      console.log('Successfully fetched exams:', data);
      
      // Transform database response to match frontend types
      const transformedExams: Exam[] = data.map(exam => ({
        id: exam.id,
        name: exam.name,
        description: exam.description,
        grades: exam.grades,
        subjects: exam.subjects,
        startDate: exam.start_date,
        endDate: exam.end_date,
        schoolId: exam.school_id,
        createdBy: exam.created_by,
        createdAt: exam.created_at,
        termId: exam.term_id,
        isActive: exam.is_active
      }));
      
      return transformedExams;
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      throw error;
    }
  },

  // Update an exam
  async updateExam(id: string, updates: Partial<Exam>) {
    console.log('Updating exam:', id, updates);
    
    try {
      const updateData: any = {};
      
      // Map frontend fields to database fields
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.grades !== undefined) updateData.grades = updates.grades;
      if (updates.subjects !== undefined) updateData.subjects = updates.subjects;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.termId !== undefined) updateData.term_id = updates.termId;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('exams')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          name,
          description,
          grades,
          subjects,
          start_date,
          end_date,
          school_id,
          created_by,
          created_at,
          term_id,
          is_active
        `)
        .single();

      if (error) {
        console.error('Error updating exam:', error);
        throw error;
      }

      console.log('Successfully updated exam:', data);
      
      // Transform database response to match frontend types
      const transformedExam: Exam = {
        id: data.id,
        name: data.name,
        description: data.description,
        grades: data.grades,
        subjects: data.subjects,
        startDate: data.start_date,
        endDate: data.end_date,
        schoolId: data.school_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        termId: data.term_id,
        isActive: data.is_active
      };
      
      return transformedExam;
    } catch (error) {
      console.error('Failed to update exam:', error);
      throw error;
    }
  },

  // Delete an exam
  async deleteExam(id: string) {
    console.log('Deleting exam:', id);
    
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting exam:', error);
        throw error;
      }

      console.log('Successfully deleted exam:', id);
    } catch (error) {
      console.error('Failed to delete exam:', error);
      throw error;
    }
  }
};
