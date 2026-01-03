-- =============================================
-- Invoices & Quotations
-- =============================================

CREATE TYPE public.invoice_status AS ENUM ('unpaid', 'partial', 'paid');
CREATE TYPE public.quotation_status AS ENUM ('pending', 'accepted', 'rejected');

-- Invoices Table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  status invoice_status DEFAULT 'unpaid',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice Items Table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Invoice Payments Table
CREATE TABLE public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Quotations Table
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status quotation_status DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quotation Items Table
CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Price Calculations (Costing)
-- =============================================
CREATE TABLE public.price_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_description TEXT NOT NULL,
  design_cost DECIMAL(12, 2) DEFAULT 0,
  plate_qty DECIMAL(10, 2) DEFAULT 0,
  plate_price DECIMAL(12, 2) DEFAULT 0,
  plate_total DECIMAL(12, 2) DEFAULT 0,
  paper1_qty DECIMAL(10, 2) DEFAULT 0,
  paper1_price DECIMAL(12, 2) DEFAULT 0,
  paper1_total DECIMAL(12, 2) DEFAULT 0,
  paper2_qty DECIMAL(10, 2) DEFAULT 0,
  paper2_price DECIMAL(12, 2) DEFAULT 0,
  paper2_total DECIMAL(12, 2) DEFAULT 0,
  paper3_qty DECIMAL(10, 2) DEFAULT 0,
  paper3_price DECIMAL(12, 2) DEFAULT 0,
  paper3_total DECIMAL(12, 2) DEFAULT 0,
  print_qty DECIMAL(10, 2) DEFAULT 0,
  print_price DECIMAL(12, 2) DEFAULT 0,
  print_total DECIMAL(12, 2) DEFAULT 0,
  lamination_cost DECIMAL(12, 2) DEFAULT 0,
  die_cutting_cost DECIMAL(12, 2) DEFAULT 0,
  binding_cost DECIMAL(12, 2) DEFAULT 0,
  others_cost DECIMAL(12, 2) DEFAULT 0,
  costing_total DECIMAL(12, 2) DEFAULT 0,
  margin_percent DECIMAL(5, 2) DEFAULT 0,
  margin_amount DECIMAL(12, 2) DEFAULT 0,
  final_price DECIMAL(12, 2) DEFAULT 0,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_calculations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_price_calculations_updated_at
  BEFORE UPDATE ON public.price_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies for Invoices, Quotations, etc.
-- =============================================

-- Invoices
CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices"
  ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON public.invoices FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete invoices"
  ON public.invoices FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Invoice Items
CREATE POLICY "Authenticated users can manage invoice items"
  ON public.invoice_items FOR ALL TO authenticated USING (true);

-- Invoice Payments
CREATE POLICY "Authenticated users can manage invoice payments"
  ON public.invoice_payments FOR ALL TO authenticated USING (true);

-- Quotations
CREATE POLICY "Authenticated users can view quotations"
  ON public.quotations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert quotations"
  ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotations"
  ON public.quotations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete quotations"
  ON public.quotations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Quotation Items
CREATE POLICY "Authenticated users can manage quotation items"
  ON public.quotation_items FOR ALL TO authenticated USING (true);

-- Price Calculations
CREATE POLICY "Authenticated users can view price calculations"
  ON public.price_calculations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert price calculations"
  ON public.price_calculations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update price calculations"
  ON public.price_calculations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete price calculations"
  ON public.price_calculations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Auto Invoice Number Generation
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number LIKE year_str || '%';
  RETURN year_str || LPAD(next_num::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := 'Q' || to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.quotations
  WHERE quotation_number LIKE year_str || '%';
  RETURN year_str || LPAD(next_num::TEXT, 4, '0');
END;
$$;