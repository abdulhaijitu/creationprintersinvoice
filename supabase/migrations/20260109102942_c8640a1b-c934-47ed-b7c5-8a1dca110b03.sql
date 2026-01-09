-- Fix overly permissive RLS policies on global_notification_settings and revenue_snapshots
-- These should only be accessible by platform admins or service role

-- Fix global_notification_settings
DROP POLICY IF EXISTS "Service role can manage global settings" ON public.global_notification_settings;
CREATE POLICY "Platform admins can manage global settings"
ON public.global_notification_settings
FOR ALL
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Fix revenue_snapshots
DROP POLICY IF EXISTS "System can manage revenue snapshots" ON public.revenue_snapshots;
CREATE POLICY "Platform admins can manage revenue snapshots"
ON public.revenue_snapshots
FOR ALL
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));