-- Fix RLS policies so non-super-admin org members can read permissions
-- Root cause: existing SELECT policies were created as RESTRICTIVE, causing AND-behavior and blocking non-platform-admin users.

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.org_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_specific_permissions ENABLE ROW LEVEL SECURITY;

-- =========================
-- org_role_permissions
-- =========================
-- Remove conflicting restrictive SELECT policies
DROP POLICY IF EXISTS "Super admins can read org role permissions" ON public.org_role_permissions;
DROP POLICY IF EXISTS "All users can read org role permissions for checks" ON public.org_role_permissions;

-- Recreate as PERMISSIVE (default) so all authenticated users can read
CREATE POLICY "All authenticated can read org role permissions"
ON public.org_role_permissions
FOR SELECT
TO authenticated
USING (true);

-- =========================
-- org_specific_permissions
-- =========================
-- Remove restrictive SELECT policy that only allowed owners
DROP POLICY IF EXISTS "Org owners can view their org permissions" ON public.org_specific_permissions;

-- Owners can view all permission rows for their org (needed for admin panels)
CREATE POLICY "Org owners can view org permissions"
ON public.org_specific_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_specific_permissions.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'::org_role
  )
  OR is_platform_admin(auth.uid())
);

-- Members can view permission rows only for THEIR role in THEIR org
CREATE POLICY "Org members can view own role permissions"
ON public.org_specific_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_specific_permissions.organization_id
      AND om.user_id = auth.uid()
      AND om.role::text = org_specific_permissions.role::text
  )
  OR is_platform_admin(auth.uid())
);
