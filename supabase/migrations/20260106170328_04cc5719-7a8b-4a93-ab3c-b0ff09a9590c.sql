-- Create plan upgrade requests table
CREATE TABLE public.plan_upgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything (checking user_roles table)
CREATE POLICY "Super admins can manage all upgrade requests"
ON public.plan_upgrade_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Organization owners can view their own requests
CREATE POLICY "Org owners can view own requests"
ON public.plan_upgrade_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = plan_upgrade_requests.organization_id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Organization owners can create requests
CREATE POLICY "Org owners can create requests"
ON public.plan_upgrade_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = plan_upgrade_requests.organization_id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_upgrade_requests_org ON public.plan_upgrade_requests(organization_id);
CREATE INDEX idx_upgrade_requests_status ON public.plan_upgrade_requests(status);

-- Trigger for updated_at
CREATE TRIGGER update_plan_upgrade_requests_updated_at
BEFORE UPDATE ON public.plan_upgrade_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();