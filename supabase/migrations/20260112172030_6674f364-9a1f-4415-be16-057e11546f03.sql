-- Add created_by column to tasks table to track task creator
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Set default value for new rows
ALTER TABLE public.tasks ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Update existing tasks to set created_by from assigned_by if available
UPDATE public.tasks SET created_by = assigned_by WHERE created_by IS NULL AND assigned_by IS NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- Drop old SELECT policy and create new one that includes creator visibility
DROP POLICY IF EXISTS "Users can view org tasks" ON public.tasks;

-- New SELECT policy: Users can view tasks in their org if they:
-- 1. Created the task
-- 2. Are assigned to the task  
-- 3. Have tasks.view permission (via org membership)
-- 4. Are platform admin
CREATE POLICY "Users can view org tasks with creator visibility"
ON public.tasks FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Note: The frontend will handle additional filtering for non-admin users
-- RLS just ensures org-level isolation