-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_email text,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
CREATE POLICY "Users can view task attachments in their org"
ON public.task_attachments FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users can add task attachments in their org"
ON public.task_attachments FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can delete own attachments or with manage permission"
ON public.task_attachments FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR is_platform_admin(auth.uid())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_organization_id ON public.task_attachments(organization_id);

-- Add SLA fields to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sla_deadline timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sla_warning_sent boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sla_breach_sent boolean DEFAULT false;

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-attachments bucket
CREATE POLICY "Users can view task attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.task_attachments ta
      WHERE ta.storage_path = name
      AND (
        ta.organization_id = get_user_organization_id(auth.uid())
        OR is_platform_admin(auth.uid())
      )
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.task_attachments ta
      WHERE ta.storage_path = name
      AND ta.uploaded_by = auth.uid()
    )
    OR is_platform_admin(auth.uid())
  )
);