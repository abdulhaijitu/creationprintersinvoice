
-- Step 1: Drop the overly permissive org member SELECT policy
DROP POLICY IF EXISTS "Org members can view profiles of fellow org members" ON public.profiles;

-- Step 2: Add new policy: org admins (owner/manager) can view all org member profiles
CREATE POLICY "Org admins can view org member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 
    FROM public.organization_members om_viewer
    JOIN public.organization_members om_target 
      ON om_viewer.organization_id = om_target.organization_id
    WHERE om_viewer.user_id = auth.uid()
      AND om_target.user_id = profiles.id
      AND om_viewer.role IN ('owner', 'manager')
  )
);

-- Step 3: Create a directory view for basic profile lookups (non-sensitive fields only)
CREATE OR REPLACE VIEW public.profile_directory AS
SELECT 
  id,
  full_name,
  phone,
  avatar_url,
  designation,
  department,
  created_at
FROM public.profiles;

-- Step 4: Enable RLS-passthrough for the view (views inherit table RLS by default in Supabase)
-- But we want the directory view to be accessible to all org members
-- So we create a security definer function for directory lookups
CREATE OR REPLACE FUNCTION public.get_org_member_profiles(_org_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  phone text,
  avatar_url text,
  designation text,
  department text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.designation,
    p.department,
    p.created_at
  FROM public.profiles p
  JOIN public.organization_members om ON om.user_id = p.id
  WHERE om.organization_id = _org_id
    AND public.user_belongs_to_org(auth.uid(), _org_id)
$$;
