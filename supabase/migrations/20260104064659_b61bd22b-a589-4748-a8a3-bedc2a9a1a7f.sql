-- Add new columns to price_calculations table for enhanced price calculation engine
ALTER TABLE public.price_calculations
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS plate2_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS plate2_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS plate2_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS plate3_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS plate3_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS plate3_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS print2_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS print2_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS print2_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS print3_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS print3_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS print3_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS foil_printing_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS foil_printing_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS foil_printing_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lamination_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lamination_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS die_cutting_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS die_cutting_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS binding_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS binding_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS others_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS others_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_pcs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS design_qty numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS design_price numeric DEFAULT 0;

-- Create a helper function to check if user has any of the privileged roles
CREATE OR REPLACE FUNCTION public.has_privileged_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'manager', 'accounts')
  )
$$;

-- Update the has_role function to support new roles
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'manager')
  )
$$;