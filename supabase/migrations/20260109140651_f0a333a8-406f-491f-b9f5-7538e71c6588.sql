-- Create function to calculate and update invoice status based on paid_amount
CREATE OR REPLACE FUNCTION public.recalculate_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC;
  v_paid_amount NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Determine invoice_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Get invoice total and recalculate paid_amount from all payments
  SELECT 
    i.total,
    COALESCE(SUM(p.amount), 0)
  INTO v_total, v_paid_amount
  FROM invoices i
  LEFT JOIN invoice_payments p ON p.invoice_id = i.id
  WHERE i.id = v_invoice_id
  GROUP BY i.id, i.total;
  
  -- Round to 2 decimal places to avoid floating point issues
  v_total := ROUND(v_total::NUMERIC, 2);
  v_paid_amount := ROUND(v_paid_amount::NUMERIC, 2);
  
  -- Calculate status based on amounts
  IF v_paid_amount >= v_total THEN
    v_new_status := 'paid';
  ELSIF v_paid_amount > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;
  
  -- Update invoice with new paid_amount and status
  UPDATE invoices
  SET 
    paid_amount = v_paid_amount,
    status = v_new_status::invoice_status,
    updated_at = now()
  WHERE id = v_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after payment changes
DROP TRIGGER IF EXISTS trigger_recalculate_invoice_status ON invoice_payments;
CREATE TRIGGER trigger_recalculate_invoice_status
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_invoice_status();

-- Create function to fix existing invoice statuses (run once)
CREATE OR REPLACE FUNCTION public.fix_all_invoice_statuses()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_paid_amount NUMERIC;
  v_new_status TEXT;
BEGIN
  FOR rec IN SELECT id, total FROM invoices LOOP
    -- Calculate total paid amount
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
    FROM invoice_payments WHERE invoice_id = rec.id;
    
    -- Round to 2 decimal places
    v_paid_amount := ROUND(v_paid_amount::NUMERIC, 2);
    
    -- Determine status
    IF v_paid_amount >= ROUND(rec.total::NUMERIC, 2) THEN
      v_new_status := 'paid';
    ELSIF v_paid_amount > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'unpaid';
    END IF;
    
    -- Update invoice
    UPDATE invoices
    SET 
      paid_amount = v_paid_amount,
      status = v_new_status::invoice_status
    WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run the fix function to correct existing invoices
SELECT public.fix_all_invoice_statuses();