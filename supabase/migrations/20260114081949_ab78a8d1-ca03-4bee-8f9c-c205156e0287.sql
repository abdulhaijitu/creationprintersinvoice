-- ============================================
-- TASK PRIVACY & DEPARTMENT VISIBILITY UPGRADE
-- ============================================

-- 1. Create task_visibility enum
DO $$ BEGIN
  CREATE TYPE task_visibility AS ENUM ('public', 'private', 'department');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add privacy and department columns to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS visibility task_visibility DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL;

-- 3. Update task_activity_logs to include more activity types
-- First, update the type definition if needed
ALTER TABLE public.task_activity_logs 
  ALTER COLUMN action_type TYPE TEXT;

-- 4. Create index for efficient department-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON public.tasks(visibility);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- 5. Create a function to check task visibility
CREATE OR REPLACE FUNCTION public.can_view_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD;
  v_user_dept TEXT;
  v_user_org_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
BEGIN
  -- Get task details
  SELECT visibility, department, organization_id, created_by, assigned_to
  INTO v_task
  FROM tasks
  WHERE id = _task_id;
  
  IF v_task IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'super_admin'
  ) INTO v_is_super_admin;
  
  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user belongs to the same organization
  SELECT organization_id INTO v_user_org_id
  FROM organization_members
  WHERE user_id = _user_id;
  
  IF v_user_org_id IS NULL OR v_user_org_id != v_task.organization_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is org admin (owner/manager)
  SELECT is_org_admin(_user_id, v_task.organization_id) INTO v_is_org_admin;
  
  IF v_is_org_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Creator can always see their own tasks
  IF v_task.created_by = _user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Assignee can always see assigned tasks
  IF v_task.assigned_to IS NOT NULL THEN
    -- Check if assigned_to is employee.id, resolve to user_id via email
    SELECT e.email INTO v_user_dept
    FROM employees e
    WHERE e.id = v_task.assigned_to;
    
    -- Direct match on user_id (backward compatibility)
    IF v_task.assigned_to = _user_id THEN
      RETURN TRUE;
    END IF;
    
    -- Check via employee email matching
    IF EXISTS (
      SELECT 1 FROM employees e
      JOIN profiles p ON LOWER(e.email) = LOWER(p.email)
      WHERE e.id = v_task.assigned_to AND p.id = _user_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- VISIBILITY RULES (Priority: private > department > public)
  
  -- Private tasks: only creator and assignee can see (already handled above)
  IF v_task.visibility = 'private' THEN
    RETURN FALSE;
  END IF;
  
  -- Department tasks: only users in that department can see
  IF v_task.visibility = 'department' AND v_task.department IS NOT NULL THEN
    -- Get user's department from employees table
    SELECT e.department INTO v_user_dept
    FROM employees e
    JOIN profiles p ON LOWER(e.email) = LOWER(p.email)
    WHERE p.id = _user_id AND e.organization_id = v_task.organization_id
    LIMIT 1;
    
    RETURN v_user_dept IS NOT NULL AND v_user_dept = v_task.department;
  END IF;
  
  -- Public tasks: everyone in org can see
  IF v_task.visibility = 'public' OR v_task.visibility IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 6. Drop existing RLS policies on tasks
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON public.tasks;
DROP POLICY IF EXISTS "Users can view org tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in their organization" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their organization" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their organization" ON public.tasks;
DROP POLICY IF EXISTS "task_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "task_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "task_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "task_delete_policy" ON public.tasks;

-- 7. Create new RLS policies with visibility enforcement

-- SELECT: Use the can_view_task function for visibility
CREATE POLICY "task_visibility_select"
ON public.tasks FOR SELECT
USING (
  -- Super admin can see all
  public.is_platform_admin(auth.uid())
  OR
  -- Use visibility function for org users
  public.can_view_task(auth.uid(), id)
);

-- INSERT: Users can create tasks in their organization
CREATE POLICY "task_insert_org_member"
ON public.tasks FOR INSERT
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR
  public.user_belongs_to_org(auth.uid(), organization_id)
);

-- UPDATE: Creator, assignee, or org admin can update
CREATE POLICY "task_update_authorized"
ON public.tasks FOR UPDATE
USING (
  public.is_platform_admin(auth.uid())
  OR
  created_by = auth.uid()
  OR
  assigned_to = auth.uid()
  OR
  public.is_org_admin(auth.uid(), organization_id)
);

-- DELETE: Only creator or org admin can delete
CREATE POLICY "task_delete_authorized"
ON public.tasks FOR DELETE
USING (
  public.is_platform_admin(auth.uid())
  OR
  created_by = auth.uid()
  OR
  public.is_org_admin(auth.uid(), organization_id)
);

-- 8. Make task_activity_logs immutable (no UPDATE, no DELETE for regular users)
DROP POLICY IF EXISTS "Users can view activity logs" ON public.task_activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON public.task_activity_logs;
DROP POLICY IF EXISTS "activity_logs_select" ON public.task_activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.task_activity_logs;

-- SELECT: Users can view logs for tasks they can see
CREATE POLICY "activity_logs_view"
ON public.task_activity_logs FOR SELECT
USING (
  public.is_platform_admin(auth.uid())
  OR
  public.user_belongs_to_org(auth.uid(), organization_id)
);

-- INSERT: Users can create logs (append-only)
CREATE POLICY "activity_logs_append"
ON public.task_activity_logs FOR INSERT
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR
  public.user_belongs_to_org(auth.uid(), organization_id)
);

-- NO UPDATE or DELETE policies = immutable logs

-- 9. Add comment and attachment activity tracking columns to task_activity_logs if needed
ALTER TABLE public.task_activity_logs
  ADD COLUMN IF NOT EXISTS attachment_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS comment_id UUID DEFAULT NULL;

-- 10. Create index for efficient activity log queries
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_id ON public.task_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_created_at ON public.task_activity_logs(created_at DESC);