
-- Create function to check if organization subscription is active (not expired)
CREATE OR REPLACE FUNCTION public.is_subscription_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.subscriptions 
    WHERE organization_id = _org_id
      AND status IN ('trial', 'active')
      AND (trial_ends_at IS NULL OR trial_ends_at > now())
  )
$$;

-- Create function to check if current user's org has active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_subscription_active(
    public.get_user_organization_id(auth.uid())
  )
$$;

-- Create function to auto-expire trial subscriptions
CREATE OR REPLACE FUNCTION public.check_and_expire_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if trial has expired
  IF NEW.status = 'trial' AND NEW.trial_ends_at IS NOT NULL AND NEW.trial_ends_at < now() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-expire on any subscription access/update
CREATE TRIGGER check_trial_expiry_on_update
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.check_and_expire_trial();

-- Update RLS policies for customers to require active subscription for write operations
DROP POLICY IF EXISTS "Users can create customers in their org" ON public.customers;
CREATE POLICY "Users can create customers in their org"
ON public.customers FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update customers in their org" ON public.customers;
CREATE POLICY "Users can update customers in their org"
ON public.customers FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can delete customers in their org" ON public.customers;
CREATE POLICY "Users can delete customers in their org"
ON public.customers FOR DELETE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

-- Update RLS policies for invoices
DROP POLICY IF EXISTS "Users can create invoices in their org" ON public.invoices;
CREATE POLICY "Users can create invoices in their org"
ON public.invoices FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update invoices in their org" ON public.invoices;
CREATE POLICY "Users can update invoices in their org"
ON public.invoices FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

-- Update RLS policies for invoice_payments
DROP POLICY IF EXISTS "Users can create invoice payments in their org" ON public.invoice_payments;
CREATE POLICY "Users can create invoice payments in their org"
ON public.invoice_payments FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update invoice payments in their org" ON public.invoice_payments;
CREATE POLICY "Users can update invoice payments in their org"
ON public.invoice_payments FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

-- Update RLS policies for expenses
DROP POLICY IF EXISTS "Users can create expenses in their org" ON public.expenses;
CREATE POLICY "Users can create expenses in their org"
ON public.expenses FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update expenses in their org" ON public.expenses;
CREATE POLICY "Users can update expenses in their org"
ON public.expenses FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can delete expenses in their org" ON public.expenses;
CREATE POLICY "Users can delete expenses in their org"
ON public.expenses FOR DELETE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

-- Update RLS policies for vendors
DROP POLICY IF EXISTS "Users can create vendors in their org" ON public.vendors;
CREATE POLICY "Users can create vendors in their org"
ON public.vendors FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update vendors in their org" ON public.vendors;
CREATE POLICY "Users can update vendors in their org"
ON public.vendors FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

-- Update RLS policies for quotations
DROP POLICY IF EXISTS "Users can create quotations in their org" ON public.quotations;
CREATE POLICY "Users can create quotations in their org"
ON public.quotations FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update quotations in their org" ON public.quotations;
CREATE POLICY "Users can update quotations in their org"
ON public.quotations FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Users can create tasks in their org" ON public.tasks;
CREATE POLICY "Users can create tasks in their org"
ON public.tasks FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);

DROP POLICY IF EXISTS "Users can update tasks in their org" ON public.tasks;
CREATE POLICY "Users can update tasks in their org"
ON public.tasks FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_has_active_subscription()
);
