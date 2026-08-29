
-- Exam timetable slots: defines time windows per exam day
CREATE TABLE public.exam_timetable_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_label TEXT, -- e.g. "Day 1", "Monday 10th March"
  slot_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, day_number, slot_number)
);

-- Exam timetable entries: subject assignments within slots (supports multiple per slot)
CREATE TABLE public.exam_timetable_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES public.exam_timetable_slots(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade_ids UUID[] NOT NULL DEFAULT '{}',
  room_id UUID REFERENCES public.rooms(id),
  invigilator_id UUID REFERENCES public.teachers(id),
  is_concurrent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_timetable_entries ENABLE ROW LEVEL SECURITY;

-- RLS for exam_timetable_slots
CREATE POLICY "School admins can manage exam timetable slots"
  ON public.exam_timetable_slots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = exam_timetable_slots.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  ));

CREATE POLICY "School members can view exam timetable slots"
  ON public.exam_timetable_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = exam_timetable_slots.school_id
  ));

-- RLS for exam_timetable_entries
CREATE POLICY "School admins can manage exam timetable entries"
  ON public.exam_timetable_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = exam_timetable_entries.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  ));

CREATE POLICY "School members can view exam timetable entries"
  ON public.exam_timetable_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = exam_timetable_entries.school_id
  ));

-- Indexes
CREATE INDEX idx_exam_timetable_slots_exam ON public.exam_timetable_slots(exam_id);
CREATE INDEX idx_exam_timetable_entries_slot ON public.exam_timetable_entries(slot_id);
CREATE INDEX idx_exam_timetable_entries_exam ON public.exam_timetable_entries(exam_id);
