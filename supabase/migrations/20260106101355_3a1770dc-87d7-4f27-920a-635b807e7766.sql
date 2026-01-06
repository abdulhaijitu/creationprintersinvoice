-- Create enhanced audit log type enum
CREATE TYPE public.audit_action_type AS ENUM (
  'login',
  'logout', 
  'login_failed',
  'create',
  'update',
  'delete',
  'access',
  'suspend',
  'activate',
  'configure',
  'export',
  'import'
);

CREATE TYPE public.audit_source AS ENUM (
  'ui',
  'api',
  'system',
  'edge_function',
  'webhook'
);

-- Create enhanced admin audit logs table
CREATE TABLE public.enhanced_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Actor information
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  actor_type TEXT NOT NULL DEFAULT 'user', -- user, system, api
  
  -- Action details
  action_type public.audit_action_type NOT NULL,
  action_label TEXT NOT NULL, -- Human-readable action description
  
  -- Target entity
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  
  -- Organization context
  organization_id UUID,
  organization_name TEXT,
  
  -- Source tracking
  source public.audit_source NOT NULL DEFAULT 'ui',
  ip_address TEXT,
  user_agent TEXT,
  
  -- Metadata and change tracking
  metadata JSONB,
  before_state JSONB,
  after_state JSONB,
  
  -- Indexing fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enhanced_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin can view all logs
CREATE POLICY "Super admins can view all audit logs"
ON public.enhanced_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins can view limited logs (no system-level logs)
CREATE POLICY "Admins can view operational audit logs"
ON public.enhanced_audit_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  AND actor_type != 'system'
);

-- No update or delete - audit logs are immutable
-- Insert is handled by service role via edge function

-- Create indexes for performance
CREATE INDEX idx_enhanced_audit_logs_timestamp ON public.enhanced_audit_logs(timestamp DESC);
CREATE INDEX idx_enhanced_audit_logs_action_type ON public.enhanced_audit_logs(action_type);
CREATE INDEX idx_enhanced_audit_logs_entity_type ON public.enhanced_audit_logs(entity_type);
CREATE INDEX idx_enhanced_audit_logs_actor_id ON public.enhanced_audit_logs(actor_id);
CREATE INDEX idx_enhanced_audit_logs_organization_id ON public.enhanced_audit_logs(organization_id);
CREATE INDEX idx_enhanced_audit_logs_source ON public.enhanced_audit_logs(source);

-- Full text search index
CREATE INDEX idx_enhanced_audit_logs_search ON public.enhanced_audit_logs 
USING GIN (to_tsvector('english', COALESCE(action_label, '') || ' ' || COALESCE(entity_name, '') || ' ' || COALESCE(actor_email, '')));

-- Create function to insert audit logs (will be called from edge function with service role)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_actor_id UUID DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'user',
  p_action_type TEXT DEFAULT 'access',
  p_action_label TEXT DEFAULT '',
  p_entity_type TEXT DEFAULT '',
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_organization_name TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'ui',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO enhanced_audit_logs (
    actor_id, actor_email, actor_role, actor_type,
    action_type, action_label,
    entity_type, entity_id, entity_name,
    organization_id, organization_name,
    source, ip_address, user_agent,
    metadata, before_state, after_state
  )
  VALUES (
    p_actor_id, p_actor_email, p_actor_role, p_actor_type,
    p_action_type::audit_action_type, p_action_label,
    p_entity_type, p_entity_id, p_entity_name,
    p_organization_id, p_organization_name,
    p_source::audit_source, p_ip_address, p_user_agent,
    p_metadata, p_before_state, p_after_state
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;