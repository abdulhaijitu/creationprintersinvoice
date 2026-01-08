-- Add is_deleted column to customers table for soft delete support
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Add deleted_at timestamp for audit purposes
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for filtering active customers efficiently
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON public.customers(is_deleted) WHERE is_deleted = FALSE;

-- Update RLS policy to exclude deleted customers by default (for regular queries)
DROP POLICY IF EXISTS "Users can view their organization customers" ON public.customers;
CREATE POLICY "Users can view their organization customers" 
ON public.customers 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Ensure update policy exists for soft delete
DROP POLICY IF EXISTS "Users can update their organization customers" ON public.customers;
CREATE POLICY "Users can update their organization customers" 
ON public.customers 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Keep delete policy for hard delete of customers without relations
DROP POLICY IF EXISTS "Users can delete their organization customers" ON public.customers;
CREATE POLICY "Users can delete their organization customers" 
ON public.customers 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);