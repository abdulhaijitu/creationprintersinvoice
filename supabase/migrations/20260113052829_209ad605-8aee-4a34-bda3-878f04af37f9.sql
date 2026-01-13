-- Add payment_method column to employee_advances table
ALTER TABLE public.employee_advances 
ADD COLUMN payment_method text DEFAULT 'cash';