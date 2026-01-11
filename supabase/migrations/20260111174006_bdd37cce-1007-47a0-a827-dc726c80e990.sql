-- Create organization invites table for pending staff invitations
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  note TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email, status)
);

-- Enable RLS
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can view invites"
  ON public.organization_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can create invites"
  ON public.organization_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can update invites"
  ON public.organization_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can delete invites"
  ON public.organization_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_organization_invites_org_id ON public.organization_invites(organization_id);
CREATE INDEX idx_organization_invites_email ON public.organization_invites(email);
CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_organization_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_organization_invites_timestamp
  BEFORE UPDATE ON public.organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_invites_updated_at();