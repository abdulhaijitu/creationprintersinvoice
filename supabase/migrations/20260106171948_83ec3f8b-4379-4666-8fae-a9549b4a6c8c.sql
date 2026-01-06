-- Create plan permission presets table
CREATE TABLE public.plan_permission_presets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_name TEXT NOT NULL,
    role TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(plan_name, role, permission_key)
);

-- Enable RLS
ALTER TABLE public.plan_permission_presets ENABLE ROW LEVEL SECURITY;

-- Super admin can manage plan presets
CREATE POLICY "Super admins can manage plan permission presets"
    ON public.plan_permission_presets
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- All authenticated users can read plan presets (for permission resolution)
CREATE POLICY "Authenticated users can read plan permission presets"
    ON public.plan_permission_presets
    FOR SELECT
    TO authenticated
    USING (true);

-- Create indexes for efficient lookups
CREATE INDEX idx_plan_permission_presets_plan ON public.plan_permission_presets(plan_name);
CREATE INDEX idx_plan_permission_presets_lookup ON public.plan_permission_presets(plan_name, role, permission_key);

-- Create trigger for updated_at
CREATE TRIGGER update_plan_permission_presets_updated_at
    BEFORE UPDATE ON public.plan_permission_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to org_permission_settings for plan override toggle
ALTER TABLE public.org_permission_settings 
    ADD COLUMN IF NOT EXISTS override_plan_permissions BOOLEAN DEFAULT false;

-- Initialize plan presets with data from global permissions for each plan
-- This copies all current global permissions as the default for each plan
INSERT INTO public.plan_permission_presets (plan_name, role, permission_key, is_enabled)
SELECT 
    plan.plan_name,
    orp.role,
    orp.permission_key,
    CASE 
        -- Enterprise gets all permissions
        WHEN plan.plan_name = 'enterprise' THEN orp.is_enabled
        -- Pro gets most permissions
        WHEN plan.plan_name = 'pro' THEN orp.is_enabled
        -- Basic gets reduced permissions (disable some advanced features)
        WHEN plan.plan_name = 'basic' THEN 
            CASE 
                WHEN orp.permission_key IN ('reports_view', 'reports_create', 'reports_edit', 'reports_delete') THEN false
                ELSE orp.is_enabled
            END
        -- Free gets minimal permissions
        WHEN plan.plan_name = 'free' THEN 
            CASE 
                WHEN orp.permission_key IN (
                    'reports_view', 'reports_create', 'reports_edit', 'reports_delete',
                    'expenses_create', 'expenses_edit', 'expenses_delete',
                    'salary_view', 'salary_create', 'salary_edit', 'salary_delete',
                    'team_members_view', 'team_members_create', 'team_members_edit', 'team_members_delete'
                ) THEN false
                ELSE orp.is_enabled
            END
        ELSE orp.is_enabled
    END as is_enabled
FROM public.org_role_permissions orp
CROSS JOIN (
    SELECT unnest(ARRAY['free', 'basic', 'pro', 'enterprise']) as plan_name
) plan
ON CONFLICT (plan_name, role, permission_key) DO NOTHING;