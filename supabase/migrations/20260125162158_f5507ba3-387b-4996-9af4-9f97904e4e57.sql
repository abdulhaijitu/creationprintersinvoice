-- Update the quotation status transition function to handle 'pending' status
-- Treat 'pending' as equivalent to 'draft' for the send transition

CREATE OR REPLACE FUNCTION public.update_quotation_status(
  p_quotation_id uuid, 
  p_new_status quotation_status, 
  p_user_id uuid, 
  p_rejection_reason text DEFAULT NULL::text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status quotation_status;
  v_converted_invoice_id UUID;
  v_valid_until DATE;
BEGIN
  -- Get current quotation status
  SELECT status, converted_to_invoice_id, valid_until 
  INTO v_current_status, v_converted_invoice_id, v_valid_until
  FROM quotations
  WHERE id = p_quotation_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Quotation not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check for auto-expiry first
  IF v_valid_until IS NOT NULL AND v_valid_until < CURRENT_DATE 
     AND v_current_status IN ('draft', 'sent', 'pending') THEN
    UPDATE quotations
    SET status = 'expired', status_changed_at = now()
    WHERE id = p_quotation_id;
    RETURN QUERY SELECT FALSE, 'Quotation has expired and cannot be modified'::TEXT;
    RETURN;
  END IF;
  
  -- Validate status transitions
  IF v_current_status = 'converted' THEN
    RETURN QUERY SELECT FALSE, 'Cannot change status of a converted quotation'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status = 'expired' THEN
    RETURN QUERY SELECT FALSE, 'Cannot change status of an expired quotation'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'draft' AND v_current_status NOT IN ('draft', 'pending') THEN
    RETURN QUERY SELECT FALSE, 'Cannot revert to draft status'::TEXT;
    RETURN;
  END IF;
  
  -- Allow sending from both 'draft' AND 'pending' status
  IF p_new_status = 'sent' AND v_current_status NOT IN ('draft', 'pending') THEN
    RETURN QUERY SELECT FALSE, 'Can only send quotations that are in draft or pending status'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'accepted' AND v_current_status NOT IN ('sent') THEN
    RETURN QUERY SELECT FALSE, 'Can only accept quotations that have been sent'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'rejected' AND v_current_status NOT IN ('sent', 'pending') THEN
    RETURN QUERY SELECT FALSE, 'Can only reject quotations that have been sent'::TEXT;
    RETURN;
  END IF;
  
  IF p_new_status = 'converted' AND v_current_status NOT IN ('accepted') THEN
    RETURN QUERY SELECT FALSE, 'Can only convert quotations that have been accepted'::TEXT;
    RETURN;
  END IF;
  
  -- Perform the update
  IF p_new_status = 'rejected' THEN
    UPDATE quotations
    SET 
      status = p_new_status,
      status_changed_at = now(),
      status_changed_by = p_user_id,
      rejection_reason = p_rejection_reason,
      rejected_at = now(),
      rejected_by = p_user_id
    WHERE id = p_quotation_id;
  ELSE
    UPDATE quotations
    SET 
      status = p_new_status,
      status_changed_at = now(),
      status_changed_by = p_user_id
    WHERE id = p_quotation_id;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Status updated successfully'::TEXT;
END;
$function$;