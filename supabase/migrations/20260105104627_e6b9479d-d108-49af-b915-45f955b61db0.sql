
-- Create delivery_challans table
CREATE TABLE public.delivery_challans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challan_number TEXT NOT NULL UNIQUE,
  challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  delivery_address TEXT,
  vehicle_info TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dispatched', 'delivered', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_challan_items table
CREATE TABLE public.delivery_challan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challan_id UUID NOT NULL REFERENCES public.delivery_challans(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.invoice_items(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_challan_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_challans
CREATE POLICY "Users can view all delivery challans" 
ON public.delivery_challans FOR SELECT USING (true);

CREATE POLICY "Privileged users can create delivery challans" 
ON public.delivery_challans FOR INSERT 
WITH CHECK (public.has_privileged_role(auth.uid()));

CREATE POLICY "Privileged users can update delivery challans" 
ON public.delivery_challans FOR UPDATE 
USING (public.has_privileged_role(auth.uid()) AND status != 'delivered');

CREATE POLICY "Privileged users can delete draft challans" 
ON public.delivery_challans FOR DELETE 
USING (public.has_privileged_role(auth.uid()) AND status = 'draft');

-- RLS policies for delivery_challan_items
CREATE POLICY "Users can view all challan items" 
ON public.delivery_challan_items FOR SELECT USING (true);

CREATE POLICY "Privileged users can manage challan items" 
ON public.delivery_challan_items FOR ALL 
USING (public.has_privileged_role(auth.uid()));

-- Function to generate challan number
CREATE OR REPLACE FUNCTION public.generate_challan_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := 'DC' || to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(challan_number FROM 7) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.delivery_challans
  WHERE challan_number LIKE year_str || '%';
  RETURN year_str || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_delivery_challans_updated_at
BEFORE UPDATE ON public.delivery_challans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for delivery_challans
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_challans;
