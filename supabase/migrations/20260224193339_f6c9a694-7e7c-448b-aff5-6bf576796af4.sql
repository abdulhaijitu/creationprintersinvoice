
-- Create entity_attachments table
CREATE TABLE public.entity_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'invoice', 'quotation', 'task'
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entity_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view attachments in their org"
ON public.entity_attachments FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert attachments in their org"
ON public.entity_attachments FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete their own attachments"
ON public.entity_attachments FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

-- Index for efficient queries
CREATE INDEX idx_entity_attachments_entity ON public.entity_attachments(entity_type, entity_id);
CREATE INDEX idx_entity_attachments_org ON public.entity_attachments(organization_id);

-- Create storage bucket for entity attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('entity-attachments', 'entity-attachments', false);

-- Storage policies
CREATE POLICY "Org members can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'entity-attachments');

CREATE POLICY "Org members can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'entity-attachments');

CREATE POLICY "Org members can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'entity-attachments');
