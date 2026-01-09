-- Fix overly permissive RLS policy on subscription_events
-- Drop the current permissive policy
DROP POLICY IF EXISTS "System can insert subscription events" ON public.subscription_events;

-- Create a proper policy that requires authentication
CREATE POLICY "Authenticated users can insert subscription events"
ON public.subscription_events
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserting events for user's own organization
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Add SELECT policy for subscription_events if not exists
DROP POLICY IF EXISTS "Users can view their org subscription events" ON public.subscription_events;
CREATE POLICY "Users can view their org subscription events"
ON public.subscription_events
FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);