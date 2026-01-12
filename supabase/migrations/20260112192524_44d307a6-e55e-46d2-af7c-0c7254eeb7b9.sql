-- Add deduct_month column to control when advance should start being deducted
-- Format: YYYY-MM (e.g., "2025-12")
ALTER TABLE public.employee_advances 
ADD COLUMN IF NOT EXISTS deduct_month text;

-- Set default deduct_month for existing advances to current month
UPDATE public.employee_advances 
SET deduct_month = to_char(created_at, 'YYYY-MM')
WHERE deduct_month IS NULL;

-- Update status values to be consistent: 'active' when remaining > 0, 'settled' when remaining = 0
UPDATE public.employee_advances 
SET status = CASE 
  WHEN remaining_balance = 0 THEN 'settled'
  WHEN remaining_balance > 0 AND remaining_balance < amount THEN 'active'
  ELSE 'active'
END
WHERE status IN ('pending', 'partial') OR status IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.employee_advances.deduct_month IS 'Month from which advance should start being deducted (YYYY-MM format)';
COMMENT ON COLUMN public.employee_advances.status IS 'Advance status: active (balance > 0) or settled (balance = 0)';