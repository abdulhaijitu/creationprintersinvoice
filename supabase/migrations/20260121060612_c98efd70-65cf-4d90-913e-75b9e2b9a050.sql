-- Create function to sync paid_amount from vendor_payments
CREATE OR REPLACE FUNCTION public.sync_vendor_bill_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the bill's paid_amount and status when payments change
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.bill_id IS NOT NULL THEN
      UPDATE public.vendor_bills 
      SET paid_amount = COALESCE((
        SELECT SUM(amount) FROM public.vendor_payments WHERE bill_id = NEW.bill_id
      ), 0),
      status = CASE 
        WHEN COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE bill_id = NEW.bill_id), 0) >= net_amount THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE bill_id = NEW.bill_id), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END
      WHERE id = NEW.bill_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.bill_id IS NOT NULL THEN
      UPDATE public.vendor_bills 
      SET paid_amount = COALESCE((
        SELECT SUM(amount) FROM public.vendor_payments WHERE bill_id = OLD.bill_id
      ), 0),
      status = CASE 
        WHEN COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE bill_id = OLD.bill_id), 0) >= net_amount THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE bill_id = OLD.bill_id), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END
      WHERE id = OLD.bill_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for vendor_payments changes
DROP TRIGGER IF EXISTS sync_vendor_bill_paid_trigger ON public.vendor_payments;
CREATE TRIGGER sync_vendor_bill_paid_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_vendor_bill_paid_amount();

-- Initialize paid_amount for existing bills based on linked payments
UPDATE public.vendor_bills vb
SET paid_amount = COALESCE((
  SELECT SUM(vp.amount) 
  FROM public.vendor_payments vp 
  WHERE vp.bill_id = vb.id
), 0);

-- Update status for all bills based on paid_amount
UPDATE public.vendor_bills
SET status = CASE 
  WHEN paid_amount >= net_amount THEN 'paid'
  WHEN paid_amount > 0 THEN 'partial'
  ELSE 'unpaid'
END;