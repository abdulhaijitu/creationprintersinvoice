-- Add discount and net_amount columns to vendor_bills
ALTER TABLE public.vendor_bills 
ADD COLUMN discount numeric DEFAULT 0 NOT NULL,
ADD COLUMN net_amount numeric;

-- Initialize net_amount for existing records (amount - discount)
UPDATE public.vendor_bills 
SET net_amount = amount - discount;

-- Make net_amount NOT NULL after initialization
ALTER TABLE public.vendor_bills 
ALTER COLUMN net_amount SET NOT NULL;

-- Add check constraint: discount cannot be negative
ALTER TABLE public.vendor_bills 
ADD CONSTRAINT vendor_bills_discount_non_negative CHECK (discount >= 0);

-- Add check constraint: net_amount must equal amount - discount
ALTER TABLE public.vendor_bills 
ADD CONSTRAINT vendor_bills_net_amount_check CHECK (net_amount = amount - discount);

-- Add check constraint: discount cannot exceed amount
ALTER TABLE public.vendor_bills 
ADD CONSTRAINT vendor_bills_discount_max CHECK (discount <= amount);

-- Comment for clarity
COMMENT ON COLUMN public.vendor_bills.discount IS 'Fixed discount amount applied to bill';
COMMENT ON COLUMN public.vendor_bills.net_amount IS 'Net payable = amount - discount';