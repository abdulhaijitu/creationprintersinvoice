
-- Create enums for lead source and status
CREATE TYPE public.lead_source AS ENUM ('website', 'referral', 'social', 'cold_call', 'other');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  source lead_source NOT NULL DEFAULT 'other',
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies: org-scoped for authenticated users
CREATE POLICY "Users can view leads in their org"
ON public.leads FOR SELECT TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert leads in their org"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update leads in their org"
ON public.leads FOR UPDATE TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete leads in their org"
ON public.leads FOR DELETE TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

-- Auto-update updated_at trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
