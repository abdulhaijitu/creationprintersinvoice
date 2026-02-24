
-- Create approval_requests table
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL, -- 'expense', 'quotation', 'leave'
  entity_id UUID NOT NULL,
  entity_name TEXT,
  amount NUMERIC,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_by_name TEXT,
  approved_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes TEXT,
  rejection_reason TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view approval requests in their org"
ON public.approval_requests FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create approval requests in their org"
ON public.approval_requests FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND requested_by = auth.uid());

CREATE POLICY "Org admins can update approval requests"
ON public.approval_requests FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_approval_requests_org_status ON public.approval_requests(organization_id, status);
CREATE INDEX idx_approval_requests_entity ON public.approval_requests(request_type, entity_id);

-- Trigger for updated_at
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
