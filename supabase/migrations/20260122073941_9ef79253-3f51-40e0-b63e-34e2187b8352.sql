-- Add terms column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS terms TEXT;

-- Add terms column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS terms TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.quotations.terms IS 'Terms & conditions for this quotation (HTML/rich text)';
COMMENT ON COLUMN public.invoices.terms IS 'Terms & conditions for this invoice (HTML/rich text)';