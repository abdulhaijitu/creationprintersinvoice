import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { APP_CONFIG } from '@/lib/appConfig';
import appLogo from '@/assets/app-logo.jpg';

interface AuthPageBranding {
  appName: string;
  appTagline: string;
  logoUrl: string;
  isLoading: boolean;
}

/**
 * Hook to get branding for auth pages (login, register, etc.)
 * Attempts to detect org by domain and load their branding.
 * Falls back to default PrintoSaas branding if no org found.
 */
export function useAuthPageBranding(): AuthPageBranding {
  // Try to detect organization by current domain
  const currentDomain = window.location.hostname;
  
  const { data: orgBranding, isLoading } = useQuery({
    queryKey: ['auth-page-branding', currentDomain],
    queryFn: async () => {
      // Skip for localhost/dev domains
      if (currentDomain === 'localhost' || currentDomain.includes('lovable.app')) {
        return null;
      }
      
      // Try to find org by domain
      const { data: domainData } = await supabase
        .from('organization_domains')
        .select('organization_id, is_verified')
        .eq('domain', currentDomain)
        .eq('is_verified', true)
        .maybeSingle();
      
      if (!domainData?.organization_id) {
        return null;
      }
      
      // Check if white-label is enabled for this org
      const { data: whiteLabelSettings } = await supabase
        .from('organization_whitelabel_settings')
        .select('whitelabel_enabled')
        .eq('organization_id', domainData.organization_id)
        .maybeSingle();
      
      if (!whiteLabelSettings?.whitelabel_enabled) {
        return null;
      }
      
      // Fetch branding
      const { data: branding } = await supabase
        .from('organization_branding')
        .select('app_name, logo_url')
        .eq('organization_id', domainData.organization_id)
        .maybeSingle();
      
      return branding;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  return useMemo(() => ({
    appName: orgBranding?.app_name || APP_CONFIG.name,
    appTagline: APP_CONFIG.tagline,
    logoUrl: orgBranding?.logo_url || appLogo,
    isLoading,
  }), [orgBranding, isLoading]);
}
