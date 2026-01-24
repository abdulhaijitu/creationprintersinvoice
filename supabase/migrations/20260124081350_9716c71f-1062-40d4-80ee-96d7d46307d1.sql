-- Create invoice_costing_items table for storing internal costing data
CREATE TABLE public.invoice_costing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  item_type TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (quantity * price) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invoice_costing_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-based access
CREATE POLICY "Users can view costing items for their organization"
  ON public.invoice_costing_items FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert costing items for their organization"
  ON public.invoice_costing_items FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update costing items for their organization"
  ON public.invoice_costing_items FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete costing items for their organization"
  ON public.invoice_costing_items FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_invoice_costing_items_invoice ON public.invoice_costing_items(invoice_id);
CREATE INDEX idx_invoice_costing_items_org ON public.invoice_costing_items(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_costing_items_updated_at
  BEFORE UPDATE ON public.invoice_costing_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();