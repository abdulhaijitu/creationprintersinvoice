-- Add conversion audit fields to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS converted_invoice_id UUID REFERENCES public.invoices(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotations_converted_invoice 
ON public.quotations(converted_invoice_id) 
WHERE converted_invoice_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.quotations.converted_by IS 'User who converted the quotation to an invoice';
COMMENT ON COLUMN public.quotations.converted_at IS 'Timestamp when the quotation was converted to an invoice';
COMMENT ON COLUMN public.quotations.converted_invoice_id IS 'Reference to the invoice created from this quotation';