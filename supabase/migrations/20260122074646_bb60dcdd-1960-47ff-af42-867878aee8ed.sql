-- Add subject field to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS subject text;

-- Add subject field to invoices table (for conversion)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS subject text;

-- Add comment for documentation
COMMENT ON COLUMN public.quotations.subject IS 'Short title/heading for the quotation, max 255 chars recommended';
COMMENT ON COLUMN public.invoices.subject IS 'Short title/heading for the invoice, copied from quotation on conversion';