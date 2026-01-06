-- Create organization-specific role permissions table
CREATE TABLE public.org_specific_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, role, permission_key)
);

-- Create organization permission settings table (toggle for global vs custom)
CREATE TABLE public.org_permission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  use_global_permissions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_specific_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_permission_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_specific_permissions
-- Super admins can manage all
CREATE POLICY "Super admins can manage org permissions"
ON public.org_specific_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Organization owners can view their own (read-only)
CREATE POLICY "Org owners can view their org permissions"
ON public.org_specific_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_specific_permissions.organization_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- RLS Policies for org_permission_settings
CREATE POLICY "Super admins can manage permission settings"
ON public.org_permission_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Org owners can view their permission settings"
ON public.org_permission_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_permission_settings.organization_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Create indexes for performance
CREATE INDEX idx_org_specific_permissions_org_id ON public.org_specific_permissions(organization_id);
CREATE INDEX idx_org_specific_permissions_role_key ON public.org_specific_permissions(role, permission_key);
CREATE INDEX idx_org_permission_settings_org_id ON public.org_permission_settings(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_org_specific_permissions_updated_at
BEFORE UPDATE ON public.org_specific_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_permission_settings_updated_at
BEFORE UPDATE ON public.org_permission_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();