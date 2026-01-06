-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage expense categories" ON expense_categories;

-- Create new policy that includes super_admin, admin, and manager roles
CREATE POLICY "Privileged users can manage expense categories" 
ON expense_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  )
);