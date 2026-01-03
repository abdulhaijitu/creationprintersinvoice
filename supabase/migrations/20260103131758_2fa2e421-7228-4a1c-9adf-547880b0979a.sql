-- Revert to admin-only policies for company_settings
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can insert company settings" ON public.company_settings;

-- Create admin-only update policy using has_role function
CREATE POLICY "Admins can update company settings" 
ON public.company_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create admin-only insert policy
CREATE POLICY "Admins can insert company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));