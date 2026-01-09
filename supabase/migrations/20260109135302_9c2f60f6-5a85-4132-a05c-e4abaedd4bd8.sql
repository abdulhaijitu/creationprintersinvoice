-- Add status tracking fields to quotations
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_changed_by UUID;

-- Update existing quotations: 'pending' status becomes 'draft'
UPDATE public.quotations 
SET status = 'draft' 
WHERE status = 'pending';

-- Create a function to validate and perform quotation status transitions
CREATE OR REPLACE FUNCTION public.update_quotation_status(
  p_quotation_id UUID,
  p_new_status quotation_status,
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status quotation_status;
  v_converted_invoice_id UUID;
BEGIN
  -- Get current quotation status
  SELECT status, converted_to_invoice_id INTO v_current_status, v_converted_invoice_id
  FROM quotations
  WHERE id = p_quotation_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Quotation not found'::TEXT;
    RETURN;
  END IF;
  
  -- Validate status transitions
  IF v_current_status = 'converted' THEN
    RETURN QUERY SELECT FALSE, 'Cannot change status of a converted quotation'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'draft' AND v_current_status != 'draft' THEN
    RETURN QUERY SELECT FALSE, 'Cannot revert to draft status'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'sent' AND v_current_status NOT IN ('draft') THEN
    RETURN QUERY SELECT FALSE, 'Can only send quotations that are in draft status'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'accepted' AND v_current_status NOT IN ('sent') THEN
    RETURN QUERY SELECT FALSE, 'Can only accept quotations that have been sent'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'converted' AND v_current_status NOT IN ('accepted') THEN
    RETURN QUERY SELECT FALSE, 'Can only convert quotations that have been accepted'::TEXT;
    RETURN;
  END IF;
  
  -- Perform the update
  UPDATE quotations
  SET 
    status = p_new_status,
    status_changed_at = now(),
    status_changed_by = p_user_id
  WHERE id = p_quotation_id;
  
  RETURN QUERY SELECT TRUE, 'Status updated successfully'::TEXT;
END;
$$;

-- Create indexes for status queries
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_status_org ON public.quotations(organization_id, status);