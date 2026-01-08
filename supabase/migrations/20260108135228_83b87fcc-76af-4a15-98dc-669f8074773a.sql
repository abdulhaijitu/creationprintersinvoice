-- =====================================================
-- OWNERSHIP LIFECYCLE TABLES
-- =====================================================

-- Ownership Transfer Requests table
CREATE TABLE public.ownership_transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_pending_request UNIQUE (organization_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Only allow one pending request per org (handled by unique constraint with filter)
CREATE UNIQUE INDEX idx_one_pending_request_per_org 
ON public.ownership_transfer_requests (organization_id) 
WHERE status = 'pending';

-- Ownership History Log (immutable audit trail)
CREATE TABLE public.ownership_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'initial_assignment',
    'transfer_requested',
    'transfer_approved',
    'transfer_rejected',
    'super_admin_reassignment'
  )),
  previous_owner_id UUID,
  new_owner_id UUID,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'super_admin', 'system')),
  transfer_request_id UUID REFERENCES public.ownership_transfer_requests(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ownership_transfer_org ON public.ownership_transfer_requests(organization_id);
CREATE INDEX idx_ownership_transfer_status ON public.ownership_transfer_requests(status);
CREATE INDEX idx_ownership_history_org ON public.ownership_history(organization_id);
CREATE INDEX idx_ownership_history_date ON public.ownership_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.ownership_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ownership_transfer_requests
-- Org owners can view their own org's requests
CREATE POLICY "Org owners can view transfer requests"
ON public.ownership_transfer_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = ownership_transfer_requests.organization_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Org owners can create transfer requests
CREATE POLICY "Org owners can create transfer requests"
ON public.ownership_transfer_requests
FOR INSERT
WITH CHECK (
  requester_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = ownership_transfer_requests.organization_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Super admins can view and update all requests (via service role key, no RLS bypass needed)
CREATE POLICY "Super admins can view all transfer requests"
ON public.ownership_transfer_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update transfer requests"
ON public.ownership_transfer_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- RLS Policies for ownership_history
-- Org owners can view their org's history
CREATE POLICY "Org owners can view ownership history"
ON public.ownership_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = ownership_history.organization_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Super admins can view all history
CREATE POLICY "Super admins can view all ownership history"
ON public.ownership_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Trigger for updating updated_at on ownership_transfer_requests
CREATE TRIGGER update_ownership_transfer_requests_updated_at
BEFORE UPDATE ON public.ownership_transfer_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();