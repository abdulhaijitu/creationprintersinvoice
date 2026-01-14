-- Fix the is_subscription_active function to properly handle active subscriptions
-- The issue is that it was checking trial_ends_at even for active subscriptions
CREATE OR REPLACE FUNCTION public.is_subscription_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.subscriptions 
    WHERE organization_id = _org_id
      AND (
        -- Active subscription (not trial) - always valid
        status = 'active'
        OR
        -- Trial subscription - check trial_ends_at
        (status = 'trial' AND (trial_ends_at IS NULL OR trial_ends_at > now()))
      )
  )
$$;