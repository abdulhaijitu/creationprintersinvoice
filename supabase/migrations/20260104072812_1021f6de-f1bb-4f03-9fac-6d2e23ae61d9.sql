-- Add unit column to invoice_items and quotation_items tables
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS unit TEXT;

ALTER TABLE public.quotation_items
ADD COLUMN IF NOT EXISTS unit TEXT;