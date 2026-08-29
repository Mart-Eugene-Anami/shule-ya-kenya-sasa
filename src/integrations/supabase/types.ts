export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          school_id: string
          updated_at: string
          year: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          school_id: string
          updated_at?: string
          year: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          school_id?: string
          updated_at?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_academic_years_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_academic_years: {
        Row: {
          archive_data: Json
          archived_at: string
          archived_by: string
          created_at: string
          id: string
          original_academic_year_id: string
          school_id: string
          year: string
        }
        Insert: {
          archive_data?: Json
          archived_at?: string
          archived_by: string
          created_at?: string
          id?: string
          original_academic_year_id: string
          school_id: string
          year: string
        }
        Update: {
          archive_data?: Json
          archived_at?: string
          archived_by?: string
          created_at?: string
          id?: string
          original_academic_year_id?: string
          school_id?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_attendance: {
        Row: {
          academic_year_id: string
          admission_no: string
          archived_at: string
          created_at: string
          date: string
          grade_id: string
          grade_name: string
          id: string
          original_attendance_id: string
          recorded_at: string
          recorded_by: string
          school_id: string
          status: string
          stream_id: string
          stream_name: string
          student_id: string
          student_name: string
          term_id: string | null
          term_name: string | null
        }
        Insert: {
          academic_year_id: string
          admission_no: string
          archived_at?: string
          created_at?: string
          date: string
          grade_id: string
          grade_name: string
          id?: string
          original_attendance_id: string
          recorded_at: string
          recorded_by: string
          school_id: string
          status: string
          stream_id: string
          stream_name: string
          student_id: string
          student_name: string
          term_id?: string | null
          term_name?: string | null
        }
        Update: {
          academic_year_id?: string
          admission_no?: string
          archived_at?: string
          created_at?: string
          date?: string
          grade_id?: string
          grade_name?: string
          id?: string
          original_attendance_id?: string
          recorded_at?: string
          recorded_by?: string
          school_id?: string
          status?: string
          stream_id?: string
          stream_name?: string
          student_id?: string
          student_name?: string
          term_id?: string | null
          term_name?: string | null
        }
        Relationships: []
      }
      archived_exams: {
        Row: {
          academic_year_id: string
          archived_at: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          grades: string[]
          id: string
          name: string
          original_exam_id: string
          school_id: string
          start_date: string
          subjects: string[]
          term_id: string | null
          term_name: string | null
        }
        Insert: {
          academic_year_id: string
          archived_at?: string
          created_at: string
          created_by: string
          description?: string | null
          end_date: string
          grades: string[]
          id?: string
          name: string
          original_exam_id: string
          school_id: string
          start_date: string
          subjects: string[]
          term_id?: string | null
          term_name?: string | null
        }
        Update: {
          academic_year_id?: string
          archived_at?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          grades?: string[]
          id?: string
          name?: string
          original_exam_id?: string
          school_id?: string
          start_date?: string
          subjects?: string[]
          term_id?: string | null
          term_name?: string | null
        }
        Relationships: []
      }
      archived_marks: {
        Row: {
          academic_year_id: string
          admission_no: string
          archived_at: string
          created_at: string
          exam_id: string
          exam_name: string
          grade: string | null
          grade_id: string
          grade_name: string
          id: string
          original_mark_id: string
          out_of: number
          recorded_at: string
          recorded_by: string
          school_id: string
          score: number
          stream_id: string
          stream_name: string
          student_id: string
          student_name: string
          subject: string
          term_id: string | null
          term_name: string | null
        }
        Insert: {
          academic_year_id: string
          admission_no: string
          archived_at?: string
          created_at?: string
          exam_id: string
          exam_name: string
          grade?: string | null
          grade_id: string
          grade_name: string
          id?: string
          original_mark_id: string
          out_of?: number
          recorded_at: string
          recorded_by: string
          school_id: string
          score: number
          stream_id: string
          stream_name: string
          student_id: string
          student_name: string
          subject: string
          term_id?: string | null
          term_name?: string | null
        }
        Update: {
          academic_year_id?: string
          admission_no?: string
          archived_at?: string
          created_at?: string
          exam_id?: string
          exam_name?: string
          grade?: string | null
          grade_id?: string
          grade_name?: string
          id?: string
          original_mark_id?: string
          out_of?: number
          recorded_at?: string
          recorded_by?: string
          school_id?: string
          score?: number
          stream_id?: string
          stream_name?: string
          student_id?: string
          student_name?: string
          subject?: string
          term_id?: string | null
          term_name?: string | null
        }
        Relationships: []
      }
      archived_student_assignments: {
        Row: {
          academic_year_id: string
          archived_at: string
          created_at: string
          grade_id: string
          grade_name: string
          id: string
          stream_id: string
          stream_name: string
          student_id: string
        }
        Insert: {
          academic_year_id: string
          archived_at?: string
          created_at?: string
          grade_id: string
          grade_name: string
          id?: string
          stream_id: string
          stream_name: string
          student_id: string
        }
        Update: {
          academic_year_id?: string
          archived_at?: string
          created_at?: string
          grade_id?: string
          grade_name?: string
          id?: string
          stream_id?: string
          stream_name?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_teacher_assignments: {
        Row: {
          academic_year_id: string
          archived_at: string
          created_at: string
          grade_id: string | null
          id: string
          is_stream_teacher: boolean | null
          stream_id: string | null
          subjects_taught: string[] | null
          teacher_id: string
        }
        Insert: {
          academic_year_id: string
          archived_at?: string
          created_at?: string
          grade_id?: string | null
          id?: string
          is_stream_teacher?: boolean | null
          stream_id?: string | null
          subjects_taught?: string[] | null
          teacher_id: string
        }
        Update: {
          academic_year_id?: string
          archived_at?: string
          created_at?: string
          grade_id?: string | null
          id?: string
          is_stream_teacher?: boolean | null
          stream_id?: string | null
          subjects_taught?: string[] | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          max_marks: number | null
          name: string
          school_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_marks?: number | null
          name: string
          school_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_marks?: number | null
          name?: string
          school_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          date: string
          id: string
          locked: boolean | null
          recorded_at: string
          recorded_by: string
          status: string
          stream_id: string
          student_id: string
          term_id: string | null
        }
        Insert: {
          date: string
          id?: string
          locked?: boolean | null
          recorded_at?: string
          recorded_by: string
          status: string
          stream_id: string
          student_id: string
          term_id?: string | null
        }
        Update: {
          date?: string
          id?: string
          locked?: boolean | null
          recorded_at?: string
          recorded_by?: string
          status?: string
          stream_id?: string
          student_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_stream"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_term"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      capitation_records: {
        Row: {
          created_at: string
          id: string
          per_student_amount: number
          school_id: string
          student_count: number
          term_id: string | null
          total_amount: number
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          per_student_amount?: number
          school_id: string
          student_count?: number
          term_id?: string | null
          total_amount?: number
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          per_student_amount?: number
          school_id?: string
          student_count?: number
          term_id?: string | null
          total_amount?: number
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capitation_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capitation_records_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capitation_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "fee_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      cbc_senior_tracks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          pathway: string
          school_id: string
          subject_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          pathway: string
          school_id: string
          subject_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          pathway?: string
          school_id?: string
          subject_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbc_senior_tracks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_timetable_entries: {
        Row: {
          created_at: string
          exam_id: string
          grade_ids: string[]
          id: string
          invigilator_id: string | null
          is_concurrent: boolean
          notes: string | null
          room_id: string | null
          school_id: string
          slot_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          grade_ids?: string[]
          id?: string
          invigilator_id?: string | null
          is_concurrent?: boolean
          notes?: string | null
          room_id?: string | null
          school_id: string
          slot_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          grade_ids?: string[]
          id?: string
          invigilator_id?: string | null
          is_concurrent?: boolean
          notes?: string | null
          room_id?: string | null
          school_id?: string
          slot_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_timetable_entries_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_entries_invigilator_id_fkey"
            columns: ["invigilator_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_entries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_entries_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "exam_timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_timetable_slots: {
        Row: {
          created_at: string
          day_label: string | null
          day_number: number
          end_time: string
          exam_id: string
          id: string
          school_id: string
          slot_number: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_label?: string | null
          day_number: number
          end_time: string
          exam_id: string
          id?: string
          school_id: string
          slot_number: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_label?: string | null
          day_number?: number
          end_time?: string
          exam_id?: string
          id?: string
          school_id?: string
          slot_number?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_timetable_slots_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          grades: string[]
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          start_date: string
          subjects: string[]
          term_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          grades: string[]
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          start_date: string
          subjects: string[]
          term_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          grades?: string[]
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          start_date?: string
          subjects?: string[]
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exams_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exams_term"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_settings: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          is_boarding_school: boolean
          is_enabled: boolean
          school_id: string
          show_on_report_card: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          is_boarding_school?: boolean
          is_enabled?: boolean
          school_id: string
          show_on_report_card?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          is_boarding_school?: boolean
          is_enabled?: boolean
          school_id?: string
          show_on_report_card?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_uploads: {
        Row: {
          error_log: Json | null
          file_name: string
          id: string
          records_failed: number
          records_matched: number
          records_processed: number
          school_id: string
          status: string
          term_id: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          error_log?: Json | null
          file_name: string
          id?: string
          records_failed?: number
          records_matched?: number
          records_processed?: number
          school_id: string
          status?: string
          term_id?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          error_log?: Json | null
          file_name?: string
          id?: string
          records_failed?: number
          records_matched?: number
          records_processed?: number
          school_id?: string
          status?: string
          term_id?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_uploads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_uploads_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_streams: {
        Row: {
          created_at: string | null
          grade_id: string
          id: string
          stream_id: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          grade_id: string
          id?: string
          stream_id: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          grade_id?: string
          id?: string
          stream_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_streams_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_streams_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_streams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          academic_year_id: string | null
          created_at: string
          curriculum: string
          division_id: string | null
          grade_code: string | null
          id: string
          is_active: boolean | null
          level: number
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          curriculum: string
          division_id?: string | null
          grade_code?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          curriculum?: string
          division_id?: string | null
          grade_code?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grades_academic_year"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grades_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "school_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      mark_entry_sessions: {
        Row: {
          assessment_type_id: string
          created_at: string
          entered_count: number | null
          exam_id: string | null
          id: string
          status: string | null
          stream_id: string
          subject: string
          teacher_id: string
          total_students: number | null
          updated_at: string
        }
        Insert: {
          assessment_type_id: string
          created_at?: string
          entered_count?: number | null
          exam_id?: string | null
          id?: string
          status?: string | null
          stream_id: string
          subject: string
          teacher_id: string
          total_students?: number | null
          updated_at?: string
        }
        Update: {
          assessment_type_id?: string
          created_at?: string
          entered_count?: number | null
          exam_id?: string | null
          id?: string
          status?: string | null
          stream_id?: string
          subject?: string
          teacher_id?: string
          total_students?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      marks: {
        Row: {
          assessment_type_id: string | null
          computed_score: number | null
          exam_id: string
          grade: string | null
          id: string
          is_draft: boolean | null
          out_of: number
          raw_mark: number | null
          recorded_at: string
          recorded_by: string
          rubric_id: string | null
          score: number
          student_id: string
          subject: string
        }
        Insert: {
          assessment_type_id?: string | null
          computed_score?: number | null
          exam_id: string
          grade?: string | null
          id?: string
          is_draft?: boolean | null
          out_of?: number
          raw_mark?: number | null
          recorded_at?: string
          recorded_by: string
          rubric_id?: string | null
          score: number
          student_id: string
          subject: string
        }
        Update: {
          assessment_type_id?: string | null
          computed_score?: number | null
          exam_id?: string
          grade?: string | null
          id?: string
          is_draft?: boolean | null
          out_of?: number
          raw_mark?: number | null
          recorded_at?: string
          recorded_by?: string
          rubric_id?: string | null
          score?: number
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_marks_exam"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_marks_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_comments: {
        Row: {
          comment: string
          comment_type: string
          commented_by: string
          created_at: string
          exam_id: string
          id: string
          student_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          comment: string
          comment_type: string
          commented_by: string
          created_at?: string
          exam_id: string
          id?: string
          student_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string
          comment_type?: string
          commented_by?: string
          created_at?: string
          exam_id?: string
          id?: string
          student_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_comments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      room_subject_allocations: {
        Row: {
          academic_year_id: string | null
          created_at: string
          id: string
          is_core: boolean
          room_id: string
          school_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          is_core?: boolean
          room_id: string
          school_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          is_core?: boolean
          room_id?: string
          school_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_subject_allocations_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_subject_allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_subject_allocations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_subject_allocations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      room_teacher_allocations: {
        Row: {
          academic_year_id: string | null
          created_at: string
          id: string
          lessons_per_week: number
          room_id: string
          school_id: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          lessons_per_week?: number
          room_id: string
          school_id: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          lessons_per_week?: number
          room_id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_teacher_allocations_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_teacher_allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_teacher_allocations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_teacher_allocations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_teacher_allocations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string | null
          grade_id: string | null
          id: string
          is_shared: boolean | null
          name: string
          room_mode: string | null
          room_type: string
          school_id: string
          stream_id: string | null
          track_id: string | null
          track_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          grade_id?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          room_mode?: string | null
          room_type: string
          school_id: string
          stream_id?: string | null
          track_id?: string | null
          track_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          grade_id?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          room_mode?: string | null
          room_type?: string
          school_id?: string
          stream_id?: string | null
          track_id?: string | null
          track_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "cbc_senior_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          created_by: string
          grade_ranges: Json
          id: string
          is_active: boolean | null
          is_multi_subject: boolean
          name: string
          school_id: string
          subject: string
          subjects: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          grade_ranges: Json
          id?: string
          is_active?: boolean | null
          is_multi_subject?: boolean
          name: string
          school_id: string
          subject: string
          subjects?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          grade_ranges?: Json
          id?: string
          is_active?: boolean | null
          is_multi_subject?: boolean
          name?: string
          school_id?: string
          subject?: string
          subjects?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      school_divisions: {
        Row: {
          created_at: string
          curriculum: string
          description: string | null
          display_order: number | null
          division_type: string
          grade_level_end: number
          grade_level_start: number
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          curriculum: string
          description?: string | null
          display_order?: number | null
          division_type: string
          grade_level_end: number
          grade_level_start: number
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          curriculum?: string
          description?: string | null
          display_order?: number | null
          division_type?: string
          grade_level_end?: number
          grade_level_start?: number
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_divisions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          access_status: string
          address: string | null
          admin_id: string | null
          created_at: string
          curriculum_types: string[] | null
          district_id: string | null
          email: string
          established_year: number | null
          id: string
          is_active: boolean | null
          location: string
          logo_url: string | null
          motto: string | null
          name: string
          phone: string
          pricing_tier: string | null
          principal_id: string | null
          principal_name: string | null
          school_code: string | null
          school_type: string | null
          updated_at: string
          vision: string | null
        }
        Insert: {
          access_status?: string
          address?: string | null
          admin_id?: string | null
          created_at?: string
          curriculum_types?: string[] | null
          district_id?: string | null
          email: string
          established_year?: number | null
          id?: string
          is_active?: boolean | null
          location: string
          logo_url?: string | null
          motto?: string | null
          name: string
          phone: string
          pricing_tier?: string | null
          principal_id?: string | null
          principal_name?: string | null
          school_code?: string | null
          school_type?: string | null
          updated_at?: string
          vision?: string | null
        }
        Update: {
          access_status?: string
          address?: string | null
          admin_id?: string | null
          created_at?: string
          curriculum_types?: string[] | null
          district_id?: string | null
          email?: string
          established_year?: number | null
          id?: string
          is_active?: boolean | null
          location?: string
          logo_url?: string | null
          motto?: string | null
          name?: string
          phone?: string
          pricing_tier?: string | null
          principal_id?: string | null
          principal_name?: string | null
          school_code?: string | null
          school_type?: string | null
          updated_at?: string
          vision?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          academic_year_id: string | null
          capacity: number | null
          created_at: string
          grade_id: string
          homeroom_teacher_id: string | null
          id: string
          is_active: boolean | null
          name: string
          section_code: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          capacity?: number | null
          created_at?: string
          grade_id: string
          homeroom_teacher_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          section_code?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          capacity?: number | null
          created_at?: string
          grade_id?: string
          homeroom_teacher_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          section_code?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          academic_year_id: string | null
          created_at: string | null
          division_id: string | null
          grade_id: string | null
          id: string
          name: string
          override_level: string
          school_id: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string | null
          division_id?: string | null
          grade_id?: string | null
          id?: string
          name: string
          override_level?: string
          school_id: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string | null
          division_id?: string | null
          grade_id?: string | null
          id?: string
          name?: string
          override_level?: string
          school_id?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_streams_academic_year"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streams_grade"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streams_teacher"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_academic_year_id_fkey1"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "school_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          activity_fee: number
          administration_fee: number
          boarding_fee_balance: number
          created_at: string
          currency_code: string
          development_fund: number
          exam_fee: number
          id: string
          last_payment_date: string | null
          lunch_fee_balance: number
          other_charges: number
          payment_reference: string | null
          school_id: string
          smasse_fee: number
          student_id: string
          term_id: string | null
          total_outstanding: number
          total_paid: number
          transport_fee: number
          tuition_balance: number
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          activity_fee?: number
          administration_fee?: number
          boarding_fee_balance?: number
          created_at?: string
          currency_code?: string
          development_fund?: number
          exam_fee?: number
          id?: string
          last_payment_date?: string | null
          lunch_fee_balance?: number
          other_charges?: number
          payment_reference?: string | null
          school_id: string
          smasse_fee?: number
          student_id: string
          term_id?: string | null
          total_outstanding?: number
          total_paid?: number
          transport_fee?: number
          tuition_balance?: number
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          activity_fee?: number
          administration_fee?: number
          boarding_fee_balance?: number
          created_at?: string
          currency_code?: string
          development_fund?: number
          exam_fee?: number
          id?: string
          last_payment_date?: string | null
          lunch_fee_balance?: number
          other_charges?: number
          payment_reference?: string | null
          school_id?: string
          smasse_fee?: number
          student_id?: string
          term_id?: string | null
          total_outstanding?: number
          total_paid?: number
          transport_fee?: number
          tuition_balance?: number
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "fee_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      student_history: {
        Row: {
          academic_year_id: string
          created_at: string
          grade_id: string
          id: string
          stream_id: string
          student_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          grade_id: string
          id?: string
          stream_id: string
          student_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          grade_id?: string
          id?: string
          stream_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_history_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_history_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_history_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_no: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          gender: string | null
          grade_id: string
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          name: string
          pathway: string | null
          school_id: string
          status: string | null
          stream_id: string
          student_number: string | null
          track_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admission_no: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          gender?: string | null
          grade_id: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          name: string
          pathway?: string | null
          school_id: string
          status?: string | null
          stream_id: string
          student_number?: string | null
          track_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admission_no?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          gender?: string | null
          grade_id?: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          name?: string
          pathway?: string | null
          school_id?: string
          status?: string | null
          stream_id?: string
          student_number?: string | null
          track_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_students_grade"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_students_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_students_stream"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "cbc_senior_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_room_requirements: {
        Row: {
          created_at: string | null
          id: string
          is_mandatory: boolean | null
          room_id: string | null
          room_type: string | null
          school_id: string
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          room_id?: string | null
          room_type?: string | null
          school_id: string
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          room_id?: string | null
          room_type?: string | null
          school_id?: string
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_room_requirements_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_room_requirements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_room_requirements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          curriculum: string
          division_id: string | null
          id: string
          is_active: boolean | null
          max_lessons_per_week: number | null
          name: string
          pathway: string | null
          requires_special_room: boolean | null
          school_id: string
          special_room_type: string | null
          subject_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          curriculum: string
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          max_lessons_per_week?: number | null
          name: string
          pathway?: string | null
          requires_special_room?: boolean | null
          school_id: string
          special_room_type?: string | null
          subject_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          curriculum?: string
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          max_lessons_per_week?: number | null
          name?: string
          pathway?: string | null
          requires_special_room?: boolean | null
          school_id?: string
          special_room_type?: string | null
          subject_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "school_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      system_subjects: {
        Row: {
          created_at: string | null
          created_by: string | null
          curriculum: string
          display_order: number | null
          division_type: string
          id: string
          is_active: boolean | null
          name: string
          pathway: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          curriculum: string
          display_order?: number | null
          division_type: string
          id?: string
          is_active?: boolean | null
          name: string
          pathway?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          curriculum?: string
          display_order?: number | null
          division_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          pathway?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teacher_availability: {
        Row: {
          academic_year_id: string
          created_at: string | null
          day: string
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          teacher_id: string
          term_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          day: string
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          teacher_id: string
          term_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          day?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          teacher_id?: string
          term_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_availability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_availability_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subject_assignments: {
        Row: {
          academic_year_id: string
          created_at: string
          grade_stream_id: string
          id: string
          subject: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          grade_stream_id: string
          id?: string
          subject: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          grade_stream_id?: string
          id?: string
          subject?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subject_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_grade_stream_id_fkey"
            columns: ["grade_stream_id"]
            isOneToOne: false
            referencedRelation: "grade_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          academic_year_id: string | null
          created_at: string
          division_id: string | null
          email: string | null
          employment_type: string | null
          hire_date: string | null
          id: string
          is_stream_teacher: boolean | null
          max_lessons_per_week: number | null
          name: string
          qualification: string | null
          school_id: string
          status: string | null
          subject: string | null
          subjects_taught: string[] | null
          teacher_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          division_id?: string | null
          email?: string | null
          employment_type?: string | null
          hire_date?: string | null
          id?: string
          is_stream_teacher?: boolean | null
          max_lessons_per_week?: number | null
          name: string
          qualification?: string | null
          school_id: string
          status?: string | null
          subject?: string | null
          subjects_taught?: string[] | null
          teacher_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          division_id?: string | null
          email?: string | null
          employment_type?: string | null
          hire_date?: string | null
          id?: string
          is_stream_teacher?: boolean | null
          max_lessons_per_week?: number | null
          name?: string
          qualification?: string | null
          school_id?: string
          status?: string | null
          subject?: string | null
          subjects_taught?: string[] | null
          teacher_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_teachers_academic_year"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teachers_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "school_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_terms_academic_year"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_terms_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_configurations: {
        Row: {
          applicable_grades: string[] | null
          breaks: Json
          created_at: string
          curriculum_type: string | null
          description: string | null
          division_id: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          lesson_duration_minutes: number
          lessons_per_day: number
          name: string
          school_days: string[]
          school_id: string
          start_time: string
          subject_lessons: Json
          updated_at: string
        }
        Insert: {
          applicable_grades?: string[] | null
          breaks?: Json
          created_at?: string
          curriculum_type?: string | null
          description?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          lesson_duration_minutes?: number
          lessons_per_day?: number
          name: string
          school_days?: string[]
          school_id: string
          start_time?: string
          subject_lessons?: Json
          updated_at?: string
        }
        Update: {
          applicable_grades?: string[] | null
          breaks?: Json
          created_at?: string
          curriculum_type?: string | null
          description?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          lesson_duration_minutes?: number
          lessons_per_day?: number
          name?: string
          school_days?: string[]
          school_id?: string
          start_time?: string
          subject_lessons?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_configurations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "school_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_configurations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_constraints: {
        Row: {
          constraint_type: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          id: string
          is_active: boolean
          max_value: number
          school_id: string
          updated_at: string
        }
        Insert: {
          constraint_type: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          is_active?: boolean
          max_value: number
          school_id: string
          updated_at?: string
        }
        Update: {
          constraint_type?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          is_active?: boolean
          max_value?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_constraints_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_data: Json
          rule_type: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_data: Json
          rule_type: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_data?: Json
          rule_type?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_rules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          created_at: string | null
          day: string
          end_time: string
          id: string
          is_free_period: boolean | null
          is_optional_subject: boolean | null
          pathway: string | null
          period: number
          room_id: string | null
          start_time: string
          subject: string
          teacher_id: string | null
          timetable_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day: string
          end_time: string
          id?: string
          is_free_period?: boolean | null
          is_optional_subject?: boolean | null
          pathway?: string | null
          period: number
          room_id?: string | null
          start_time: string
          subject: string
          teacher_id?: string | null
          timetable_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day?: string
          end_time?: string
          id?: string
          is_free_period?: boolean | null
          is_optional_subject?: boolean | null
          pathway?: string | null
          period?: number
          room_id?: string | null
          start_time?: string
          subject?: string
          teacher_id?: string | null
          timetable_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          academic_year_id: string
          created_at: string | null
          grade_id: string
          id: string
          is_active: boolean | null
          school_id: string
          stream_id: string
          term_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          grade_id: string
          id?: string
          is_active?: boolean | null
          school_id: string
          stream_id: string
          term_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          grade_id?: string
          id?: string
          is_active?: boolean | null
          school_id?: string
          stream_id?: string
          term_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetables_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      year_transition_notifications: {
        Row: {
          academic_year_id: string
          created_at: string
          created_for_user_id: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          scheduled_for: string | null
          school_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          created_for_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          scheduled_for?: string | null
          school_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          created_for_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          scheduled_for?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "year_transition_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_academic_year_data: {
        Args: { p_academic_year_id: string; p_archived_by: string }
        Returns: undefined
      }
      check_and_transition_terms: { Args: never; Returns: undefined }
      check_super_admin_exists: { Args: never; Returns: boolean }
      check_user_role: { Args: { required_role: string }; Returns: boolean }
      compute_score_from_rubric: {
        Args: { p_raw_mark: number; p_rubric_id: string }
        Returns: {
          computed_score: number
          grade: string
        }[]
      }
      create_school_with_admin: {
        Args: {
          p_admin_email: string
          p_admin_id: string
          p_admin_name: string
          p_school_email: string
          p_school_location: string
          p_school_name: string
          p_school_phone: string
        }
        Returns: string
      }
      create_teacher_with_auth: {
        Args: {
          p_email: string
          p_is_stream_teacher?: boolean
          p_name: string
          p_password: string
          p_school_id: string
          p_stream_id?: string
          p_subject: string
        }
        Returns: Json
      }
      delete_school_cascade: {
        Args: { p_school_id: string }
        Returns: undefined
      }
      get_auth_user_role: { Args: { user_id?: string }; Returns: string }
      get_school_pricing_tier: {
        Args: { p_school_id: string }
        Returns: {
          monthly_cost: number
          pricing_tier: string
          requires_consultation: boolean
          student_count: number
          termly_cost: number
        }[]
      }
      get_user_profile: { Args: { user_id: string }; Returns: Json }
      is_super_admin: { Args: never; Returns: boolean }
      school_has_access: { Args: { p_school_id: string }; Returns: boolean }
      toggle_school_access: {
        Args: { p_access_status: string; p_school_id: string }
        Returns: undefined
      }
      transition_to_new_academic_year: {
        Args: { p_new_year: string; p_school_id: string; p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "school_admin"
        | "teacher"
        | "student"
        | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "school_admin", "teacher", "student", "parent"],
    },
  },
} as const
