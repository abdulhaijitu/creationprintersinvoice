-- White-label branding settings table
CREATE TABLE public.organization_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  accent_color TEXT,
  footer_text TEXT,
  hide_platform_branding BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Custom domains table
CREATE TABLE public.organization_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN DEFAULT false,
  ssl_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email branding settings
CREATE TABLE public.organization_email_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_name TEXT,
  sender_email TEXT,
  reply_to_email TEXT,
  email_footer TEXT,
  whatsapp_sender_label TEXT,
  sms_sender_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- White-label feature settings (admin controlled)
CREATE TABLE public.organization_whitelabel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whitelabel_enabled BOOLEAN DEFAULT false,
  custom_domain_enabled BOOLEAN DEFAULT false,
  email_branding_enabled BOOLEAN DEFAULT false,
  pdf_branding_enabled BOOLEAN DEFAULT false,
  enabled_by TEXT,
  enabled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_email_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_whitelabel_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_branding
CREATE POLICY "Users can view their organization branding" 
ON public.organization_branding 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage branding" 
ON public.organization_branding 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- RLS Policies for organization_domains
CREATE POLICY "Users can view their organization domains" 
ON public.organization_domains 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage domains" 
ON public.organization_domains 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- RLS Policies for organization_email_branding
CREATE POLICY "Users can view their org email branding" 
ON public.organization_email_branding 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage email branding" 
ON public.organization_email_branding 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- RLS Policies for organization_whitelabel_settings (read-only for users)
CREATE POLICY "Users can view their org whitelabel settings" 
ON public.organization_whitelabel_settings 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_org_domains_domain ON public.organization_domains(domain);
CREATE INDEX idx_org_domains_org ON public.organization_domains(organization_id);
CREATE INDEX idx_org_branding_org ON public.organization_branding(organization_id);

-- Function to get organization by domain (for domain detection)
CREATE OR REPLACE FUNCTION public.get_organization_by_domain(domain_name TEXT)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  branding JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    jsonb_build_object(
      'app_name', b.app_name,
      'logo_url', b.logo_url,
      'favicon_url', b.favicon_url,
      'primary_color', b.primary_color,
      'secondary_color', b.secondary_color,
      'accent_color', b.accent_color,
      'footer_text', b.footer_text,
      'hide_platform_branding', b.hide_platform_branding
    ) as branding
  FROM public.organization_domains d
  JOIN public.organizations o ON d.organization_id = o.id
  LEFT JOIN public.organization_branding b ON b.organization_id = o.id
  WHERE d.domain = domain_name AND d.is_verified = true
  LIMIT 1;
END;
$$;

-- Trigger for updating timestamps
CREATE TRIGGER update_organization_branding_updated_at
BEFORE UPDATE ON public.organization_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_domains_updated_at
BEFORE UPDATE ON public.organization_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_email_branding_updated_at
BEFORE UPDATE ON public.organization_email_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_whitelabel_settings_updated_at
BEFORE UPDATE ON public.organization_whitelabel_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();