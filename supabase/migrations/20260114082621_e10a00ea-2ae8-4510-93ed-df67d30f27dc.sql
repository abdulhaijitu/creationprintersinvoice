-- Fix the can_view_task function to not reference p.email (profiles table has no email column)
-- Instead, use auth.users for email lookup or rely on employee matching differently

CREATE OR REPLACE FUNCTION public.can_view_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_user_dept TEXT;
  v_user_org_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_user_email TEXT;
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
  
  -- Direct match on user_id for assignee
  IF v_task.assigned_to = _user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if assignee is an employee ID and user matches via email
  IF v_task.assigned_to IS NOT NULL THEN
    -- Get user's email from auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = _user_id;
    
    -- Check if user's email matches the assigned employee's email
    IF EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = v_task.assigned_to 
        AND LOWER(e.email) = LOWER(v_user_email)
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
    -- Get user's email from auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = _user_id;
    
    -- Get user's department from employees table via email match
    SELECT e.department INTO v_user_dept
    FROM employees e
    WHERE LOWER(e.email) = LOWER(v_user_email) 
      AND e.organization_id = v_task.organization_id
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