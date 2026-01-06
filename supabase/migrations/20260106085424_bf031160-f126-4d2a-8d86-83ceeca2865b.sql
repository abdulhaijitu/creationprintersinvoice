-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('initiated', 'pending', 'success', 'failed', 'cancelled', 'refunded');

-- Create enum for payment gateway
CREATE TYPE public.payment_gateway AS ENUM ('sslcommerz', 'bkash', 'nagad', 'rocket', 'manual');

-- Create subscription_payments table
CREATE TABLE public.subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  billing_invoice_id UUID REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  gateway public.payment_gateway NOT NULL,
  gateway_transaction_id TEXT,
  status public.payment_status NOT NULL DEFAULT 'initiated',
  payment_method TEXT, -- bkash, nagad, rocket, card, etc.
  payer_name TEXT,
  payer_phone TEXT,
  payer_email TEXT,
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  gateway_response JSONB,
  failure_reason TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_by UUID,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_subscription_payments_org ON public.subscription_payments(organization_id);
CREATE INDEX idx_subscription_payments_invoice ON public.subscription_payments(billing_invoice_id);
CREATE INDEX idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX idx_subscription_payments_gateway_tx ON public.subscription_payments(gateway_transaction_id);
CREATE UNIQUE INDEX idx_subscription_payments_receipt ON public.subscription_payments(receipt_number) WHERE receipt_number IS NOT NULL;

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Super admin can view all payments
CREATE POLICY "Super admins can manage all payments"
ON public.subscription_payments
FOR ALL
USING (public.is_platform_admin(auth.uid()));

-- Org members can view their own payments
CREATE POLICY "Org members can view their payments"
ON public.subscription_payments
FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Org admins can initiate payments
CREATE POLICY "Org admins can initiate payments"
ON public.subscription_payments
FOR INSERT
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Function to generate payment receipt number
CREATE OR REPLACE FUNCTION public.generate_payment_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := 'RCP' || to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 8) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.subscription_payments
  WHERE receipt_number LIKE year_str || '%';
  RETURN year_str || LPAD(next_num::TEXT, 6, '0');
END;
$$;

-- Function to handle successful payment
CREATE OR REPLACE FUNCTION public.process_successful_payment(
  p_payment_id UUID,
  p_gateway_tx_id TEXT,
  p_gateway_response JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment subscription_payments;
  v_invoice billing_invoices;
BEGIN
  -- Get payment record
  SELECT * INTO v_payment FROM subscription_payments WHERE id = p_payment_id;
  
  IF v_payment IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check for duplicate processing (idempotency)
  IF v_payment.status = 'success' THEN
    RETURN TRUE;
  END IF;
  
  -- Update payment record
  UPDATE subscription_payments
  SET 
    status = 'success',
    gateway_transaction_id = p_gateway_tx_id,
    gateway_response = p_gateway_response,
    completed_at = now(),
    receipt_number = generate_payment_receipt_number(),
    updated_at = now()
  WHERE id = p_payment_id;
  
  -- If linked to billing invoice, mark it as paid
  IF v_payment.billing_invoice_id IS NOT NULL THEN
    UPDATE billing_invoices
    SET 
      status = 'paid',
      payment_method = v_payment.payment_method,
      payment_reference = p_gateway_tx_id,
      paid_date = CURRENT_DATE,
      updated_at = now()
    WHERE id = v_payment.billing_invoice_id;
    
    -- Activate subscription
    UPDATE subscriptions
    SET 
      status = 'active',
      updated_at = now()
    WHERE organization_id = v_payment.organization_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to handle failed payment
CREATE OR REPLACE FUNCTION public.process_failed_payment(
  p_payment_id UUID,
  p_gateway_response JSONB,
  p_failure_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE subscription_payments
  SET 
    status = 'failed',
    gateway_response = p_gateway_response,
    failure_reason = p_failure_reason,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_payment_id AND status NOT IN ('success', 'refunded');
  
  RETURN FOUND;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();