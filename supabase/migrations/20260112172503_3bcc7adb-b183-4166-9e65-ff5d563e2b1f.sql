-- =============================================
-- PART 1: Task Activity Logs Table
-- =============================================

-- Create task activity log table for audit trail
CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('created', 'updated', 'assigned', 'status_changed', 'priority_changed', 'deleted')),
  previous_value jsonb,
  new_value jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_id ON public.task_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_organization_id ON public.task_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_created_at ON public.task_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_activity_logs
-- Users can view activity logs for tasks in their organization
CREATE POLICY "Users can view task activity logs in their org"
ON public.task_activity_logs FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Only system/edge functions can insert activity logs (no direct user inserts)
CREATE POLICY "System can insert task activity logs"
ON public.task_activity_logs FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

-- Activity logs are immutable - no updates or deletes allowed
-- (No UPDATE or DELETE policies = cannot modify)

-- =============================================
-- Enable realtime for task_activity_logs
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity_logs;