-- Fix overly permissive RLS policies that allow unrestricted access
-- These policies use USING (true) or CHECK (true) which allows any authenticated user access

-- 1. Fix subscription_events - INSERT should only be allowed by service role (triggers bypass RLS)
DROP POLICY IF EXISTS "System can insert subscription events" ON subscription_events;
DROP POLICY IF EXISTS "Service role can insert subscription events" ON subscription_events;
CREATE POLICY "Service role can insert subscription events" ON subscription_events 
FOR INSERT 
WITH CHECK (
  (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
);

-- 2. Fix revenue_snapshots - ALL operations should only be allowed by platform admins or service role
DROP POLICY IF EXISTS "System can manage revenue snapshots" ON revenue_snapshots;
DROP POLICY IF EXISTS "Platform admins can read revenue snapshots" ON revenue_snapshots;
DROP POLICY IF EXISTS "Service role can manage revenue snapshots" ON revenue_snapshots;

-- Platform admins can read revenue snapshots
CREATE POLICY "Platform admins can read revenue snapshots" ON revenue_snapshots 
FOR SELECT 
USING (is_platform_admin(auth.uid()));

-- Service role can manage revenue snapshots (for background jobs)
CREATE POLICY "Service role can manage revenue snapshots" ON revenue_snapshots 
FOR ALL 
USING (
  (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
);

-- 3. Fix global_notification_settings - ALL operations should only be allowed by platform admins
DROP POLICY IF EXISTS "Service role can manage global settings" ON global_notification_settings;
DROP POLICY IF EXISTS "Platform admins can manage global settings" ON global_notification_settings;

-- Platform admins can manage global notification settings
CREATE POLICY "Platform admins can manage global settings" ON global_notification_settings 
FOR ALL 
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));