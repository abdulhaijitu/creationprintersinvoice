-- Add support for multi-assign and sub-tasks

-- 1. Create task_assignees table for multi-assign support
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(task_id, employee_id)
);

-- 2. Add parent_task_id column for sub-task support (invoice item based tasks)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS item_no integer;

-- 3. Enable RLS on task_assignees
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for task_assignees
CREATE POLICY "Users can view task assignees in their org" 
ON public.task_assignees 
FOR SELECT 
USING (organization_id = get_user_organization_id(auth.uid()) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can manage task assignees in their org" 
ON public.task_assignees 
FOR ALL 
USING (organization_id = get_user_organization_id(auth.uid()) OR is_platform_admin(auth.uid()));

-- 5. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_employee_id ON public.task_assignees(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_item_id ON public.tasks(invoice_item_id);