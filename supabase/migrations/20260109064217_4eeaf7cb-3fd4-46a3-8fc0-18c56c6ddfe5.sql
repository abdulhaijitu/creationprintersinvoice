-- Update invoice_sequences table to support the new system
ALTER TABLE public.invoice_sequences 
ADD COLUMN IF NOT EXISTS starting_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_migration_at TIMESTAMPTZ;

-- Add invoice_no_raw column to invoices for storing numeric part
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_no_raw INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_org_invoice_raw ON public.invoices(organization_id, invoice_no_raw);

-- Create or replace the invoice number generation function with prefix support
CREATE OR REPLACE FUNCTION public.generate_org_invoice_number_v2(p_org_id uuid)
RETURNS TABLE(invoice_number TEXT, invoice_no_raw INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sequence INTEGER;
  v_prefix TEXT;
  v_starting INTEGER;
BEGIN
  -- Insert or update sequence atomically
  INSERT INTO public.invoice_sequences (organization_id, current_sequence, prefix, starting_number)
  VALUES (p_org_id, 0, 'INV-', 1)
  ON CONFLICT (organization_id) 
  DO UPDATE SET 
    current_sequence = invoice_sequences.current_sequence + 1,
    updated_at = now()
  RETURNING 
    CASE 
      WHEN invoice_sequences.current_sequence = 0 THEN invoice_sequences.starting_number
      ELSE invoice_sequences.current_sequence + 1 
    END,
    COALESCE(NULLIF(invoice_sequences.prefix, ''), 'INV-'),
    invoice_sequences.starting_number
  INTO v_sequence, v_prefix, v_starting;
  
  -- If this is the first invoice, use starting number
  IF v_sequence = 0 THEN
    v_sequence := v_starting;
    -- Update the sequence to reflect the starting number
    UPDATE public.invoice_sequences 
    SET current_sequence = v_starting
    WHERE organization_id = p_org_id;
  END IF;
  
  -- Return formatted invoice number and raw number
  invoice_number := v_prefix || LPAD(v_sequence::TEXT, 4, '0');
  invoice_no_raw := v_sequence;
  RETURN NEXT;
END;
$$;

-- Function to get next invoice number preview (without incrementing)
CREATE OR REPLACE FUNCTION public.get_next_invoice_number_preview(p_org_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sequence INTEGER;
  v_prefix TEXT;
  v_starting INTEGER;
BEGIN
  SELECT 
    COALESCE(current_sequence, 0) + 1,
    COALESCE(NULLIF(prefix, ''), 'INV-'),
    COALESCE(starting_number, 1)
  INTO v_sequence, v_prefix, v_starting
  FROM public.invoice_sequences
  WHERE organization_id = p_org_id;
  
  -- If no sequence exists, use defaults
  IF NOT FOUND THEN
    v_sequence := 1;
    v_prefix := 'INV-';
    v_starting := 1;
  END IF;
  
  -- If sequence is 0, use starting number
  IF v_sequence = 1 AND v_starting > 1 THEN
    v_sequence := v_starting;
  END IF;
  
  RETURN v_prefix || LPAD(v_sequence::TEXT, 4, '0');
END;
$$;

-- Function to update invoice sequence settings
CREATE OR REPLACE FUNCTION public.update_invoice_sequence_settings(
  p_org_id uuid,
  p_prefix TEXT DEFAULT 'INV-',
  p_starting_number INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.invoice_sequences (organization_id, prefix, starting_number, current_sequence)
  VALUES (p_org_id, p_prefix, p_starting_number, 0)
  ON CONFLICT (organization_id) 
  DO UPDATE SET 
    prefix = p_prefix,
    starting_number = p_starting_number,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;