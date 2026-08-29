
-- Fee management settings per school
CREATE TABLE public.fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  show_on_report_card boolean NOT NULL DEFAULT false,
  is_boarding_school boolean NOT NULL DEFAULT false,
  currency_code text NOT NULL DEFAULT 'KES',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage fee settings" ON public.fee_settings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = fee_settings.school_id
      AND profiles.role IN ('super_admin', 'school_admin')
  ));

CREATE POLICY "School members can view fee settings" ON public.fee_settings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = fee_settings.school_id
  ));

-- Fee upload history
CREATE TABLE public.fee_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.terms(id),
  file_name text NOT NULL,
  records_processed integer NOT NULL DEFAULT 0,
  records_matched integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'processing',
  error_log jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.fee_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage fee uploads" ON public.fee_uploads
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = fee_uploads.school_id
      AND profiles.role IN ('super_admin', 'school_admin')
  ));

-- Capitation data (government disbursement per school)
CREATE TABLE public.capitation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.terms(id),
  total_amount numeric NOT NULL DEFAULT 0,
  per_student_amount numeric NOT NULL DEFAULT 0,
  student_count integer NOT NULL DEFAULT 0,
  upload_id uuid REFERENCES public.fee_uploads(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capitation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage capitation" ON public.capitation_records
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = capitation_records.school_id
      AND profiles.role IN ('super_admin', 'school_admin')
  ));

CREATE POLICY "School members can view capitation" ON public.capitation_records
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = capitation_records.school_id
  ));

-- Student fee records
CREATE TABLE public.student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.terms(id),
  upload_id uuid REFERENCES public.fee_uploads(id),
  tuition_balance numeric NOT NULL DEFAULT 0,
  boarding_fee_balance numeric NOT NULL DEFAULT 0,
  lunch_fee_balance numeric NOT NULL DEFAULT 0,
  transport_fee numeric NOT NULL DEFAULT 0,
  activity_fee numeric NOT NULL DEFAULT 0,
  smasse_fee numeric NOT NULL DEFAULT 0,
  administration_fee numeric NOT NULL DEFAULT 0,
  exam_fee numeric NOT NULL DEFAULT 0,
  development_fund numeric NOT NULL DEFAULT 0,
  other_charges numeric NOT NULL DEFAULT 0,
  total_outstanding numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  last_payment_date date,
  payment_reference text,
  currency_code text NOT NULL DEFAULT 'KES',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage student fees" ON public.student_fees
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = student_fees.school_id
      AND profiles.role IN ('super_admin', 'school_admin')
  ));

CREATE POLICY "School members can view student fees" ON public.student_fees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = student_fees.school_id
  ));

-- Trigger for updated_at
CREATE TRIGGER update_fee_settings_updated_at BEFORE UPDATE ON public.fee_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at BEFORE UPDATE ON public.student_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_capitation_updated_at BEFORE UPDATE ON public.capitation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
