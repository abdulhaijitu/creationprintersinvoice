-- Create weekly holidays configuration table
CREATE TABLE public.weekly_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.weekly_holidays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view weekly holidays for their organization"
ON public.weekly_holidays
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Owners and managers can manage weekly holidays"
ON public.weekly_holidays
FOR ALL
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

-- Create index for performance
CREATE INDEX idx_weekly_holidays_org ON public.weekly_holidays(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_weekly_holidays_updated_at
BEFORE UPDATE ON public.weekly_holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();