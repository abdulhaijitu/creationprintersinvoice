-- Create attendance correction request status enum
CREATE TYPE public.correction_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create attendance correction requests table
CREATE TABLE public.attendance_correction_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.employee_attendance(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  original_check_in TIME,
  original_check_out TIME,
  original_status TEXT,
  requested_check_in TIME,
  requested_check_out TIME,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL,
  status public.correction_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee device registrations table
CREATE TABLE public.employee_device_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  browser_info TEXT,
  os_info TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, employee_id, device_fingerprint)
);

-- Add device restriction setting to organization_attendance_settings
ALTER TABLE public.organization_attendance_settings
ADD COLUMN IF NOT EXISTS device_restriction_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_approve_first_device BOOLEAN NOT NULL DEFAULT true;

-- Create attendance audit log table for detailed tracking
CREATE TABLE public.attendance_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  target_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  target_employee_name TEXT,
  attendance_id UUID REFERENCES public.employee_attendance(id) ON DELETE SET NULL,
  correction_request_id UUID REFERENCES public.attendance_correction_requests(id) ON DELETE SET NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_correction_requests
CREATE POLICY "Users can view correction requests in their organization"
ON public.attendance_correction_requests
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create correction requests in their organization"
ON public.attendance_correction_requests
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
  AND requested_by = auth.uid()
);

CREATE POLICY "Managers and owners can update correction requests"
ON public.attendance_correction_requests
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

-- RLS policies for employee_device_registrations
CREATE POLICY "Users can view device registrations in their organization"
ON public.employee_device_registrations
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can register their devices"
ON public.employee_device_registrations
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Managers and owners can manage device registrations"
ON public.employee_device_registrations
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Managers and owners can delete device registrations"
ON public.employee_device_registrations
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

-- RLS policies for attendance_audit_logs
CREATE POLICY "Users can view audit logs in their organization"
ON public.attendance_audit_logs
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert audit logs"
ON public.attendance_audit_logs
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_correction_requests_org ON public.attendance_correction_requests(organization_id);
CREATE INDEX idx_correction_requests_employee ON public.attendance_correction_requests(employee_id);
CREATE INDEX idx_correction_requests_status ON public.attendance_correction_requests(status);
CREATE INDEX idx_correction_requests_date ON public.attendance_correction_requests(attendance_date);

CREATE INDEX idx_device_registrations_org ON public.employee_device_registrations(organization_id);
CREATE INDEX idx_device_registrations_employee ON public.employee_device_registrations(employee_id);
CREATE INDEX idx_device_registrations_fingerprint ON public.employee_device_registrations(device_fingerprint);

CREATE INDEX idx_attendance_audit_org ON public.attendance_audit_logs(organization_id);
CREATE INDEX idx_attendance_audit_actor ON public.attendance_audit_logs(actor_id);
CREATE INDEX idx_attendance_audit_created ON public.attendance_audit_logs(created_at DESC);

-- Create trigger for updated_at on correction requests
CREATE TRIGGER update_correction_requests_updated_at
BEFORE UPDATE ON public.attendance_correction_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();