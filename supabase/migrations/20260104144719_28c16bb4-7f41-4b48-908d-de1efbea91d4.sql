-- Fix function search path for sync_vendor_bill_to_expense
CREATE OR REPLACE FUNCTION public.sync_vendor_bill_to_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.expenses (
      description,
      amount,
      date,
      vendor_id,
      vendor_bill_id,
      payment_method
    ) VALUES (
      COALESCE(NEW.description, 'Vendor Bill - ' || NEW.id::text),
      NEW.amount,
      NEW.bill_date,
      NEW.vendor_id,
      NEW.id,
      'cash'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.expenses
    SET 
      description = COALESCE(NEW.description, 'Vendor Bill - ' || NEW.id::text),
      amount = NEW.amount,
      date = NEW.bill_date,
      vendor_id = NEW.vendor_id,
      updated_at = now()
    WHERE vendor_bill_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.expenses WHERE vendor_bill_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;