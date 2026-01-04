-- Create employee_advances table for tracking salary advances
CREATE TABLE public.employee_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  deducted_from_month INTEGER,
  deducted_from_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admins to manage advances
CREATE POLICY "Admins can manage employee advances"
ON public.employee_advances
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin', 'manager', 'accounts')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_advances_updated_at
BEFORE UPDATE ON public.employee_advances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();