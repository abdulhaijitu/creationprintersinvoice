-- Add employee_id column to salary_records for non-auth employees
ALTER TABLE public.salary_records 
ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Create employee_salary_records table for non-auth employees
CREATE TABLE public.employee_salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary NUMERIC NOT NULL,
  overtime_hours NUMERIC DEFAULT 0,
  overtime_amount NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  advance NUMERIC DEFAULT 0,
  net_payable NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS
ALTER TABLE public.employee_salary_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage employee salary records"
ON public.employee_salary_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'accounts')
  )
);