-- Add converted_to_invoice_id column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS converted_to_invoice_id UUID REFERENCES public.invoices(id);

-- Add source_quotation_id column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS source_quotation_id UUID REFERENCES public.quotations(id);

-- Add 'converted' status to quotations if not exists
-- Update the status check constraint to include 'converted'
DO $$
BEGIN
  -- Drop existing constraint if exists
  ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotations_converted_to_invoice 
ON public.quotations(converted_to_invoice_id) WHERE converted_to_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_source_quotation 
ON public.invoices(source_quotation_id) WHERE source_quotation_id IS NOT NULL;

-- Update the generate_org_quotation_number function to use prefix from quotation_sequences
CREATE OR REPLACE FUNCTION public.generate_org_quotation_number(p_org_id UUID)
RETURNS TABLE(quotation_number TEXT, quotation_no_raw INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sequence INTEGER;
  v_prefix TEXT;
  v_year INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Insert or update sequence atomically with row lock
  INSERT INTO public.quotation_sequences (organization_id, year, current_sequence, prefix)
  VALUES (p_org_id, v_year, 1, 'QO')
  ON CONFLICT (organization_id, year) 
  DO UPDATE SET 
    current_sequence = quotation_sequences.current_sequence + 1,
    updated_at = now()
  RETURNING current_sequence, prefix INTO v_sequence, v_prefix;
  
  -- Return formatted quotation number and raw number
  quotation_number := v_prefix || LPAD(v_sequence::TEXT, 4, '0');
  quotation_no_raw := v_sequence;
  RETURN NEXT;
END;
$$;

-- Function to update quotation sequence settings
CREATE OR REPLACE FUNCTION public.update_quotation_sequence_settings(
  p_org_id UUID, 
  p_prefix TEXT DEFAULT 'QO', 
  p_starting_number INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  INSERT INTO public.quotation_sequences (organization_id, year, prefix, current_sequence)
  VALUES (p_org_id, v_year, p_prefix, 0)
  ON CONFLICT (organization_id, year) 
  DO UPDATE SET 
    prefix = p_prefix,
    updated_at = now();
  
  -- If starting_number is provided and no quotations exist yet, we can set the sequence
  -- Only update if current_sequence is 0 (no quotations created yet)
  UPDATE public.quotation_sequences 
  SET current_sequence = GREATEST(p_starting_number - 1, 0)
  WHERE organization_id = p_org_id 
    AND year = v_year 
    AND current_sequence = 0;
  
  RETURN TRUE;
END;
$$;

-- Function to get next quotation number preview
CREATE OR REPLACE FUNCTION public.get_next_quotation_number_preview(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sequence INTEGER;
  v_prefix TEXT;
  v_year INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  SELECT 
    COALESCE(current_sequence, 0) + 1,
    COALESCE(NULLIF(prefix, ''), 'QO')
  INTO v_sequence, v_prefix
  FROM public.quotation_sequences
  WHERE organization_id = p_org_id AND year = v_year;
  
  -- If no sequence exists, use defaults
  IF NOT FOUND THEN
    v_sequence := 1;
    v_prefix := 'QO';
  END IF;
  
  RETURN v_prefix || LPAD(v_sequence::TEXT, 4, '0');
END;
$$;