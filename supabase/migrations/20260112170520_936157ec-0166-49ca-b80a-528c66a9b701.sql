-- Create a helper function to check if user can manage settings
-- Uses correct enum types for each table
CREATE OR REPLACE FUNCTION public.can_manage_company_settings(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check user_roles table (uses app_role enum)
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'manager')
  )
  OR EXISTS (
    -- Check organization_members table (uses org_role enum)
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.role IN ('owner', 'manager')
  )
$$;

-- Create new flexible UPDATE policy
CREATE POLICY "Owners and managers can update company settings" 
ON public.company_settings 
FOR UPDATE 
USING (public.can_manage_company_settings(auth.uid()))
WITH CHECK (public.can_manage_company_settings(auth.uid()));

-- Create new flexible INSERT policy
CREATE POLICY "Owners and managers can insert company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (public.can_manage_company_settings(auth.uid()));