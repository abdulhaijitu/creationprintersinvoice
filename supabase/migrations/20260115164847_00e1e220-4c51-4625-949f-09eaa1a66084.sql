-- Add 'archived' to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'archived';

-- Add archive tracking columns
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Create index for efficient querying of archived tasks
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN public.tasks.archived_at IS 'Timestamp when task was archived';
COMMENT ON COLUMN public.tasks.archived_by IS 'User ID who archived the task';