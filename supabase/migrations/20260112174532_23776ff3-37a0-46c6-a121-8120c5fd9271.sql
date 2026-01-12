-- Add overnight shift support
ALTER TABLE public.employee_attendance
ADD COLUMN IF NOT EXISTS is_overnight_shift boolean DEFAULT false;

-- Add holiday and leave status to attendance_status enum
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'holiday';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'leave';

-- Create organization attendance settings table
CREATE TABLE IF NOT EXISTS public.organization_attendance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  office_start_time time DEFAULT '09:00:00',
  office_end_time time DEFAULT '18:00:00',
  late_threshold_minutes integer DEFAULT 15,
  half_day_threshold_hours numeric DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on organization_attendance_settings
ALTER TABLE public.organization_attendance_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_attendance_settings
CREATE POLICY "Users can view their org attendance settings"
  ON public.organization_attendance_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can manage org attendance settings"
  ON public.organization_attendance_settings
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Create function to auto-calculate attendance status
CREATE OR REPLACE FUNCTION public.calculate_attendance_status(
  p_check_in timestamptz,
  p_office_start_time time,
  p_late_threshold_minutes integer
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  check_in_time time;
  threshold_time time;
BEGIN
  IF p_check_in IS NULL THEN
    RETURN 'absent';
  END IF;
  
  check_in_time := p_check_in::time;
  threshold_time := p_office_start_time + (p_late_threshold_minutes || ' minutes')::interval;
  
  IF check_in_time <= threshold_time THEN
    RETURN 'present';
  ELSE
    RETURN 'late';
  END IF;
END;
$$;

-- Add comments for documentation
COMMENT ON COLUMN public.employee_attendance.is_overnight_shift IS 'If true, check_out can be on the next day';
COMMENT ON TABLE public.organization_attendance_settings IS 'Organization-specific attendance configuration';