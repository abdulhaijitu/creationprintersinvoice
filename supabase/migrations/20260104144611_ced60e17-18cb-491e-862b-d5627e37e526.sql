-- Add vendor_bill_id column to expenses table to track synced records
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS vendor_bill_id uuid REFERENCES public.vendor_bills(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_bill_id ON public.expenses(vendor_bill_id);

-- Create function to sync vendor bill to expense
CREATE OR REPLACE FUNCTION sync_vendor_bill_to_expense()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for vendor_bills
DROP TRIGGER IF EXISTS sync_vendor_bill_trigger ON public.vendor_bills;
CREATE TRIGGER sync_vendor_bill_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_bills
FOR EACH ROW EXECUTE FUNCTION sync_vendor_bill_to_expense();

-- Sync existing vendor bills to expenses (if any)
INSERT INTO public.expenses (description, amount, date, vendor_id, vendor_bill_id, payment_method)
SELECT 
  COALESCE(vb.description, 'Vendor Bill - ' || vb.id::text),
  vb.amount,
  vb.bill_date,
  vb.vendor_id,
  vb.id,
  'cash'
FROM public.vendor_bills vb
WHERE NOT EXISTS (
  SELECT 1 FROM public.expenses e WHERE e.vendor_bill_id = vb.id
);