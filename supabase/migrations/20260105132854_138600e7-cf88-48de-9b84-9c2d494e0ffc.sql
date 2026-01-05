-- Add reference column to invoice_payments for transaction IDs
ALTER TABLE public.invoice_payments 
ADD COLUMN IF NOT EXISTS reference TEXT;

-- Create audit_logs table for tracking payment actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: users with privileged roles can view audit logs
CREATE POLICY "Privileged users can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_privileged_role(auth.uid()));

-- Policy: authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);