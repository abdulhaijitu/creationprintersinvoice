-- Create billing_invoices table for platform-level billing
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  business_name TEXT NOT NULL,
  owner_email TEXT,
  plan_name TEXT NOT NULL DEFAULT 'basic',
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total_payable NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate invoices for same org and billing period
  UNIQUE(organization_id, billing_period_start, billing_period_end)
);

-- Enable RLS
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage billing invoices"
  ON public.billing_invoices
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- Organization owners can view their own invoices
CREATE POLICY "Org owners can view their billing invoices"
  ON public.billing_invoices
  FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid()) 
    AND public.get_user_org_role(auth.uid(), organization_id) = 'owner'
  );

-- Create indexes for performance
CREATE INDEX idx_billing_invoices_org ON public.billing_invoices(organization_id);
CREATE INDEX idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX idx_billing_invoices_due_date ON public.billing_invoices(due_date);

-- Create function to generate billing invoice number
CREATE OR REPLACE FUNCTION public.generate_billing_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := 'BILL' || to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.billing_invoices
  WHERE invoice_number LIKE year_str || '%';
  RETURN year_str || LPAD(next_num::TEXT, 5, '0');
END;
$$;

-- Create function to auto-mark overdue invoices
CREATE OR REPLACE FUNCTION public.check_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.billing_invoices
  SET status = 'overdue', updated_at = now()
  WHERE status = 'unpaid' AND due_date < CURRENT_DATE;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_billing_invoices_updated_at
  BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();