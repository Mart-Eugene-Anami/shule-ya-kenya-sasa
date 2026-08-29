-- Add unique constraint to attendance table for upsert operations
-- This allows the application to use ON CONFLICT for upserting attendance records
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_date_student_unique UNIQUE (date, student_id);