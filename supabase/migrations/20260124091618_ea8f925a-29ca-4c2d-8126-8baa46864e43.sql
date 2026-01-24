-- =====================================================
-- COSTING ITEM TEMPLATES
-- Predefined costing templates for common items (Plate, Print, etc.)
-- Each template contains multiple sub-rows that auto-populate when selected
-- =====================================================

-- Create the main templates table
CREATE TABLE public.costing_item_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,  -- e.g., "Plate", "Print", "Lamination"
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one template per item_name per organization
  CONSTRAINT unique_item_template_per_org UNIQUE (organization_id, item_name)
);

-- Create the template rows table (sub-items within each template)
CREATE TABLE public.costing_item_template_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.costing_item_templates(id) ON DELETE CASCADE,
  sub_item_name TEXT NOT NULL,  -- e.g., "Ink Cost", "Paper Cost"
  description TEXT,
  default_qty NUMERIC(12, 2) NOT NULL DEFAULT 1,
  default_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.costing_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costing_item_template_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for costing_item_templates
-- View: owner, manager, accounts can view templates
CREATE POLICY "Users can view org templates"
  ON public.costing_item_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager', 'accounts')
    )
  );

-- Insert: only owner and manager can create templates
CREATE POLICY "Owners and managers can create templates"
  ON public.costing_item_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

-- Update: only owner and manager can update templates
CREATE POLICY "Owners and managers can update templates"
  ON public.costing_item_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

-- Delete: only owner can delete templates
CREATE POLICY "Owners can delete templates"
  ON public.costing_item_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );

-- RLS Policies for costing_item_template_rows
-- View: can view rows if can view parent template
CREATE POLICY "Users can view template rows"
  ON public.costing_item_template_rows
  FOR SELECT
  USING (
    template_id IN (
      SELECT t.id FROM public.costing_item_templates t
      JOIN public.organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager', 'accounts')
    )
  );

-- Insert: can insert rows if can manage templates
CREATE POLICY "Managers can create template rows"
  ON public.costing_item_template_rows
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT t.id FROM public.costing_item_templates t
      JOIN public.organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

-- Update: can update rows if can manage templates
CREATE POLICY "Managers can update template rows"
  ON public.costing_item_template_rows
  FOR UPDATE
  USING (
    template_id IN (
      SELECT t.id FROM public.costing_item_templates t
      JOIN public.organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

-- Delete: can delete rows if can manage templates
CREATE POLICY "Managers can delete template rows"
  ON public.costing_item_template_rows
  FOR DELETE
  USING (
    template_id IN (
      SELECT t.id FROM public.costing_item_templates t
      JOIN public.organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_costing_item_templates_org ON public.costing_item_templates(organization_id);
CREATE INDEX idx_costing_item_templates_item_name ON public.costing_item_templates(organization_id, item_name);
CREATE INDEX idx_costing_item_template_rows_template ON public.costing_item_template_rows(template_id);
CREATE INDEX idx_costing_item_template_rows_sort ON public.costing_item_template_rows(template_id, sort_order);

-- Create trigger for updated_at
CREATE TRIGGER update_costing_item_templates_updated_at
  BEFORE UPDATE ON public.costing_item_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_costing_item_template_rows_updated_at
  BEFORE UPDATE ON public.costing_item_template_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();