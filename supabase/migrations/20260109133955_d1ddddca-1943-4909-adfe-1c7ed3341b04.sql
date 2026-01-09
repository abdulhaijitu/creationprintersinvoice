-- Create quotation_sequences table for organization-wise quotation numbering
CREATE TABLE IF NOT EXISTS public.quotation_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'Q',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year)
);

-- Enable RLS
ALTER TABLE public.quotation_sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org quotation sequences"
ON public.quotation_sequences
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their org quotation sequences"
ON public.quotation_sequences
FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their org quotation sequences"
ON public.quotation_sequences
FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

-- Create atomic function to generate organization-specific quotation number
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
  VALUES (p_org_id, v_year, 1, 'Q')
  ON CONFLICT (organization_id, year) 
  DO UPDATE SET 
    current_sequence = quotation_sequences.current_sequence + 1,
    updated_at = now()
  RETURNING current_sequence, prefix INTO v_sequence, v_prefix;
  
  -- Return formatted quotation number and raw number
  quotation_number := v_prefix || v_year::TEXT || '-' || LPAD(v_sequence::TEXT, 4, '0');
  quotation_no_raw := v_sequence;
  RETURN NEXT;
END;
$$;

-- Drop the old global function if it exists (it's not org-aware)
DROP FUNCTION IF EXISTS public.generate_quotation_number();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotation_sequences_org_year 
ON public.quotation_sequences(organization_id, year);

-- Make sure quotations unique constraint is per organization
-- First check if we need to update the constraint
DO $$
BEGIN
  -- Drop old global constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotations_quotation_number_key'
  ) THEN
    ALTER TABLE public.quotations DROP CONSTRAINT quotations_quotation_number_key;
  END IF;
  
  -- Create new organization-scoped unique constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotations_org_quotation_number_unique'
  ) THEN
    ALTER TABLE public.quotations 
    ADD CONSTRAINT quotations_org_quotation_number_unique 
    UNIQUE (organization_id, quotation_number);
  END IF;
END $$;