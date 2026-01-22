-- Add default_notes and default_terms columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS default_notes TEXT,
ADD COLUMN IF NOT EXISTS default_terms TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.default_notes IS 'Default notes (HTML/rich text) to auto-fill in quotations/invoices';
COMMENT ON COLUMN public.customers.default_terms IS 'Default terms & conditions (HTML/rich text) to auto-fill in quotations/invoices';