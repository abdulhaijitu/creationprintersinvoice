-- Drop existing update policy
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;

-- Create new policy allowing any authenticated user to update
CREATE POLICY "Authenticated users can update company settings" 
ON public.company_settings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Also update insert policy to allow any authenticated user
DROP POLICY IF EXISTS "Admins can insert company settings" ON public.company_settings;

CREATE POLICY "Authenticated users can insert company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);