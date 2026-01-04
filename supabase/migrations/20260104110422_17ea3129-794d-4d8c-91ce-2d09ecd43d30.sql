-- Fix search_path for update_employees_updated_at function
CREATE OR REPLACE FUNCTION public.update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;