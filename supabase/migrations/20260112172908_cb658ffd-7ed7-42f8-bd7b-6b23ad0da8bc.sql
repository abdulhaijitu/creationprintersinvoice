-- =============================================
-- PART 1 & 2: Task Comments with Mentions
-- =============================================

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_organization_id ON public.task_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Comments visible to users who can see the task (same org)
CREATE POLICY "Users can view task comments in their org"
ON public.task_comments FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Users can insert comments if they're in the org
CREATE POLICY "Users can add task comments in their org"
ON public.task_comments FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

-- Users can only update their own comments
CREATE POLICY "Users can update own comments"
ON public.task_comments FOR UPDATE
USING (created_by = auth.uid());

-- Users can only delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.task_comments FOR DELETE
USING (created_by = auth.uid());

-- =============================================
-- Task Comment Mentions Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.task_comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentioned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_comment_id ON public.task_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_mentioned_user_id ON public.task_comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_task_id ON public.task_comment_mentions(task_id);

-- Enable RLS
ALTER TABLE public.task_comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS for mentions
CREATE POLICY "Users can view mentions in their org"
ON public.task_comment_mentions FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users can create mentions in their org"
ON public.task_comment_mentions FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

-- =============================================
-- Task Overdue Tracking
-- =============================================

-- Add last_overdue_notification column to track when we last notified about overdue
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS last_overdue_notification_at timestamptz;

-- =============================================
-- Enable realtime for comments
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;