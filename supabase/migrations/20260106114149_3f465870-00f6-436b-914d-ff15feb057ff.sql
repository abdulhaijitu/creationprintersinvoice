-- Drop the existing SELECT policy and recreate it with better logic
DROP POLICY IF EXISTS "Users can view their org subscription" ON public.subscriptions;

-- Create a more comprehensive SELECT policy
CREATE POLICY "Users can view subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (
  user_belongs_to_org(auth.uid(), organization_id) 
  OR is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);