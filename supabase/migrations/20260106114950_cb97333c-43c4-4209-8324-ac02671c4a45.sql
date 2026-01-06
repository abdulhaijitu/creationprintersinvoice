-- Add must_reset_password flag to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_reset_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS invite_token text,
ADD COLUMN IF NOT EXISTS invite_token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS invite_used_at timestamp with time zone;

-- Create index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_invite_token ON public.user_roles(invite_token) WHERE invite_token IS NOT NULL;

-- Update RLS policy to allow users to update their own password reset status
DROP POLICY IF EXISTS "Users can update their own password reset status" ON public.user_roles;

CREATE POLICY "Users can update their own password reset status" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to log password reset events
CREATE OR REPLACE FUNCTION public.log_password_reset_event(
  p_user_id uuid,
  p_organization_id uuid,
  p_action_type text,
  p_source text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.enhanced_audit_logs (
    actor_id,
    actor_type,
    action_type,
    action_label,
    entity_type,
    entity_id,
    organization_id,
    source,
    metadata
  ) VALUES (
    p_user_id,
    'user',
    p_action_type::audit_action_type,
    CASE 
      WHEN p_action_type = 'create' THEN 'First login detected'
      WHEN p_action_type = 'update' THEN 'Password reset completed'
      ELSE p_action_type
    END,
    'user_password',
    p_user_id::text,
    p_organization_id,
    'app'::audit_source,
    jsonb_build_object('source', p_source)
  );
END;
$$;