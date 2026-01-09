-- Add reference_no column to vendor_bills table
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS reference_no text;

-- Add reference_no column to vendor_payments table
ALTER TABLE public.vendor_payments ADD COLUMN IF NOT EXISTS reference_no text;