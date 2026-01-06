-- Create admin_audit_logs table for tracking super admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- Super admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_admin_audit_logs_admin_user ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- Add owner_email field to organizations for easier admin queries
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Create function to get organization usage stats
CREATE OR REPLACE FUNCTION public.get_org_usage_stats(_org_id uuid)
RETURNS TABLE(
  invoice_count bigint,
  expense_total numeric,
  last_activity timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.invoices WHERE organization_id = _org_id),
    (SELECT COALESCE(SUM(amount), 0) FROM public.expenses WHERE organization_id = _org_id),
    (SELECT MAX(updated_at) FROM public.invoices WHERE organization_id = _org_id)
$$;