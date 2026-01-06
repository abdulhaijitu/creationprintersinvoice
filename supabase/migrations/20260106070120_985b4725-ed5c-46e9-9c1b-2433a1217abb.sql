-- Fix RLS policies for expenses table to allow privileged roles to manage expenses

-- Drop the admin-only policy
DROP POLICY IF EXISTS "Admins can manage expenses" ON expenses;

-- Create new policy for UPDATE that includes super_admin, admin, manager, accounts
CREATE POLICY "Privileged users can update expenses" 
ON expenses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role, 'accounts'::app_role])
  )
);

-- Create new policy for DELETE that includes super_admin, admin, manager
CREATE POLICY "Privileged users can delete expenses" 
ON expenses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  )
);

-- Add updated_by column to expenses table for audit tracking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Create trigger to auto-update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_expense_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS update_expenses_audit_trigger ON expenses;
CREATE TRIGGER update_expenses_audit_trigger
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expense_audit_fields();