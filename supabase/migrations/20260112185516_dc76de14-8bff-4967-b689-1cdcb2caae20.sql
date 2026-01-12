-- Add remaining_balance to employee_advances (ledger-based tracking)
ALTER TABLE public.employee_advances 
ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT NULL;

-- Add advance deduction tracking to salary records (snapshot)
ALTER TABLE public.employee_salary_records 
ADD COLUMN IF NOT EXISTS advance_deducted_ids uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS advance_deduction_details jsonb DEFAULT NULL;

-- Update existing advances: set remaining_balance = amount for pending, 0 for deducted
UPDATE public.employee_advances 
SET remaining_balance = CASE 
  WHEN status = 'deducted' THEN 0 
  ELSE amount 
END
WHERE remaining_balance IS NULL;

-- Make remaining_balance NOT NULL with default equal to amount for new entries
ALTER TABLE public.employee_advances 
ALTER COLUMN remaining_balance SET NOT NULL,
ALTER COLUMN remaining_balance SET DEFAULT 0;

-- Add status 'settled' option (advance fully paid off)
-- Update status values: pending (new), partial (partially deducted), settled (fully deducted)
COMMENT ON COLUMN public.employee_advances.status IS 'Status: pending (not deducted), partial (partially deducted), settled (fully deducted from salary)';
COMMENT ON COLUMN public.employee_advances.remaining_balance IS 'Remaining balance to be deducted from future salaries';