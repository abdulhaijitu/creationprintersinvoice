
-- Create a simple function to get basic profile info for a single user
-- Only returns non-sensitive fields
-- Accessible if caller belongs to same org as target user
CREATE OR REPLACE FUNCTION public.get_basic_profile(_target_user_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  phone text,
  avatar_url text,
  designation text,
  department text
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
    p.department
  FROM public.profiles p
  WHERE p.id = _target_user_id
    AND (
      -- Self
      auth.uid() = _target_user_id
      -- Platform admin
      OR public.is_platform_admin(auth.uid())
      -- Same org member
      OR public.can_view_org_member_profile(auth.uid(), _target_user_id)
    )
$$;
