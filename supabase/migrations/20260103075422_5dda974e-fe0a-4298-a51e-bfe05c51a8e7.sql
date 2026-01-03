-- Create company_settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'My Company',
  company_name_bn TEXT,
  address TEXT,
  address_bn TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  bank_routing_number TEXT,
  mobile_banking TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  quotation_prefix TEXT DEFAULT 'QUO',
  invoice_footer TEXT,
  invoice_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - allow authenticated users to read and admin to update
CREATE POLICY "Anyone authenticated can view company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert company settings"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company settings"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.company_settings (company_name) VALUES ('My Company');

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view company assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete company assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));