
-- Create table for plan limits
CREATE TABLE public.plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  user_limit INTEGER NOT NULL DEFAULT 5,
  customer_limit INTEGER NOT NULL DEFAULT 100,
  invoice_limit INTEGER NOT NULL DEFAULT 100,
  expense_limit INTEGER NOT NULL DEFAULT 200,
  quotation_limit INTEGER NOT NULL DEFAULT 50,
  employee_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for daily organization usage stats
CREATE TABLE public.organization_usage_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_users INTEGER NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  total_invoices INTEGER NOT NULL DEFAULT 0,
  total_payments INTEGER NOT NULL DEFAULT 0,
  total_expenses INTEGER NOT NULL DEFAULT 0,
  total_quotations INTEGER NOT NULL DEFAULT 0,
  total_employees INTEGER NOT NULL DEFAULT 0,
  login_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, stat_date)
);

-- Create index for faster queries
CREATE INDEX idx_org_usage_stats_org_date ON public.organization_usage_stats(organization_id, stat_date DESC);
CREATE INDEX idx_org_usage_stats_date ON public.organization_usage_stats(stat_date);

-- Insert default plan limits
INSERT INTO public.plan_limits (plan_name, user_limit, customer_limit, invoice_limit, expense_limit, quotation_limit, employee_limit) VALUES
  ('free', 3, 25, 25, 50, 10, 5),
  ('basic', 5, 100, 100, 200, 50, 15),
  ('pro', 15, 500, 500, 1000, 200, 50),
  ('enterprise', 100, 5000, 5000, 10000, 2000, 500);

-- Enable RLS
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS for plan_limits (anyone can view)
CREATE POLICY "Anyone can view plan limits"
  ON public.plan_limits FOR SELECT
  USING (true);

-- RLS for organization_usage_stats
CREATE POLICY "Users can view their org usage stats"
  ON public.organization_usage_stats FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid()) 
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage usage stats"
  ON public.organization_usage_stats FOR ALL
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert usage stats"
  ON public.organization_usage_stats FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update usage stats"
  ON public.organization_usage_stats FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Function to calculate and update organization usage stats
CREATE OR REPLACE FUNCTION public.calculate_org_usage_stats(org_id UUID)
RETURNS public.organization_usage_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.organization_usage_stats;
  user_count INTEGER;
  customer_count INTEGER;
  invoice_count INTEGER;
  payment_count INTEGER;
  expense_count INTEGER;
  quotation_count INTEGER;
  employee_count INTEGER;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO user_count FROM organization_members WHERE organization_id = org_id;
  
  -- Count customers
  SELECT COUNT(*) INTO customer_count FROM customers WHERE organization_id = org_id;
  
  -- Count invoices
  SELECT COUNT(*) INTO invoice_count FROM invoices WHERE organization_id = org_id;
  
  -- Count payments
  SELECT COUNT(*) INTO payment_count FROM invoice_payments WHERE organization_id = org_id;
  
  -- Count expenses
  SELECT COUNT(*) INTO expense_count FROM expenses WHERE organization_id = org_id;
  
  -- Count quotations
  SELECT COUNT(*) INTO quotation_count FROM quotations WHERE organization_id = org_id;
  
  -- Count employees
  SELECT COUNT(*) INTO employee_count FROM employees WHERE organization_id = org_id;
  
  -- Upsert the stats
  INSERT INTO organization_usage_stats (
    organization_id, stat_date, total_users, total_customers, total_invoices,
    total_payments, total_expenses, total_quotations, total_employees, last_activity_at
  )
  VALUES (
    org_id, CURRENT_DATE, user_count, customer_count, invoice_count,
    payment_count, expense_count, quotation_count, employee_count, now()
  )
  ON CONFLICT (organization_id, stat_date)
  DO UPDATE SET
    total_users = user_count,
    total_customers = customer_count,
    total_invoices = invoice_count,
    total_payments = payment_count,
    total_expenses = expense_count,
    total_quotations = quotation_count,
    total_employees = employee_count,
    last_activity_at = now(),
    updated_at = now()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;

-- Function to get usage percentage for an organization
CREATE OR REPLACE FUNCTION public.get_org_usage_percentage(org_id UUID)
RETURNS TABLE (
  feature TEXT,
  current_usage INTEGER,
  plan_limit INTEGER,
  usage_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_name TEXT;
BEGIN
  -- Get the organization's plan
  SELECT s.plan INTO plan_name
  FROM subscriptions s
  WHERE s.organization_id = org_id
  LIMIT 1;
  
  IF plan_name IS NULL THEN
    plan_name := 'free';
  END IF;
  
  RETURN QUERY
  WITH usage AS (
    SELECT * FROM calculate_org_usage_stats(org_id)
  ),
  limits AS (
    SELECT * FROM plan_limits WHERE plan_limits.plan_name = get_org_usage_percentage.plan_name
  )
  SELECT 'users'::TEXT, u.total_users, l.user_limit, 
         ROUND((u.total_users::NUMERIC / NULLIF(l.user_limit, 0)) * 100, 1)
  FROM usage u, limits l
  UNION ALL
  SELECT 'customers'::TEXT, u.total_customers, l.customer_limit,
         ROUND((u.total_customers::NUMERIC / NULLIF(l.customer_limit, 0)) * 100, 1)
  FROM usage u, limits l
  UNION ALL
  SELECT 'invoices'::TEXT, u.total_invoices, l.invoice_limit,
         ROUND((u.total_invoices::NUMERIC / NULLIF(l.invoice_limit, 0)) * 100, 1)
  FROM usage u, limits l
  UNION ALL
  SELECT 'expenses'::TEXT, u.total_expenses, l.expense_limit,
         ROUND((u.total_expenses::NUMERIC / NULLIF(l.expense_limit, 0)) * 100, 1)
  FROM usage u, limits l
  UNION ALL
  SELECT 'quotations'::TEXT, u.total_quotations, l.quotation_limit,
         ROUND((u.total_quotations::NUMERIC / NULLIF(l.quotation_limit, 0)) * 100, 1)
  FROM usage u, limits l
  UNION ALL
  SELECT 'employees'::TEXT, u.total_employees, l.employee_limit,
         ROUND((u.total_employees::NUMERIC / NULLIF(l.employee_limit, 0)) * 100, 1)
  FROM usage u, limits l;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_usage_stats_updated_at
  BEFORE UPDATE ON public.organization_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
