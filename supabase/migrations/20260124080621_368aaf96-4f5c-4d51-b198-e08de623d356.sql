-- Create costing_templates table for saving reusable costing item sets
CREATE TABLE public.costing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.costing_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view costing templates in their organization"
ON public.costing_templates
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create costing templates in their organization"
ON public.costing_templates
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update costing templates in their organization"
ON public.costing_templates
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete costing templates in their organization"
ON public.costing_templates
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_costing_templates_org ON public.costing_templates(organization_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_costing_templates_updated_at
BEFORE UPDATE ON public.costing_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();