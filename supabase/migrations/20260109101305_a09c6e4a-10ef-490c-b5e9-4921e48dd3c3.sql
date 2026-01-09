
-- Create a function to check if a user can view another user's profile
-- (they belong to the same organization)
CREATE OR REPLACE FUNCTION public.can_view_org_member_profile(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = viewer_id
      AND om2.user_id = profile_id
  )
$$;

-- Add policy to allow org members to view profiles of other members in their organization
CREATE POLICY "Org members can view profiles of fellow org members"
ON public.profiles
FOR SELECT
USING (
  public.can_view_org_member_profile(auth.uid(), id)
);
