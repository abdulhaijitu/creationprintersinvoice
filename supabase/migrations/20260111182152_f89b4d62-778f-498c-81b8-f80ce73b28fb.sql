-- Fix remaining functions with missing search_path

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_count INTEGER;
  order_num TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM public.print_orders
  WHERE order_date = CURRENT_DATE;
  
  order_num := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || LPAD(today_count::TEXT, 3, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;