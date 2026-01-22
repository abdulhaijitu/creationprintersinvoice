-- Add 'expired' to quotation_status enum
ALTER TYPE quotation_status ADD VALUE IF NOT EXISTS 'expired';

-- Add rejection_reason column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add rejected_at column for tracking when rejection happened
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Add rejected_by column for tracking who rejected
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

-- Create function to auto-expire quotations
CREATE OR REPLACE FUNCTION public.auto_expire_quotations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE quotations
  SET 
    status = 'expired',
    status_changed_at = now()
  WHERE 
    valid_until IS NOT NULL 
    AND valid_until < CURRENT_DATE
    AND status IN ('draft', 'sent', 'pending')
    AND status != 'expired';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Create trigger function to check expiry on access/update
CREATE OR REPLACE FUNCTION public.check_quotation_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check on SELECT or if status is being read
  IF NEW.valid_until IS NOT NULL 
     AND NEW.valid_until < CURRENT_DATE 
     AND NEW.status IN ('draft', 'sent', 'pending') THEN
    NEW.status := 'expired';
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-expiry on update
DROP TRIGGER IF EXISTS quotation_expiry_check ON quotations;
CREATE TRIGGER quotation_expiry_check
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION check_quotation_expiry();

-- Update update_quotation_status function to support rejected with reason
CREATE OR REPLACE FUNCTION public.update_quotation_status(
  p_quotation_id uuid, 
  p_new_status quotation_status, 
  p_user_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;