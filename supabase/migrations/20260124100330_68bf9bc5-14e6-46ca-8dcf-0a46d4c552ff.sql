-- Add invoice_item_id column to invoice_costing_items for item-wise costing
ALTER TABLE public.invoice_costing_items 
ADD COLUMN invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE CASCADE;

-- Add item_no column to track the visual item number  
ALTER TABLE public.invoice_costing_items 
ADD COLUMN item_no integer;

-- Create index for faster lookups by invoice_item_id
CREATE INDEX idx_invoice_costing_items_invoice_item_id 
ON public.invoice_costing_items(invoice_item_id);

-- Add comment explaining the purpose
COMMENT ON COLUMN public.invoice_costing_items.invoice_item_id IS 'Links costing row to specific invoice line item for item-wise costing';
COMMENT ON COLUMN public.invoice_costing_items.item_no IS 'Visual item number (1, 2, 3...) derived from invoice item order';