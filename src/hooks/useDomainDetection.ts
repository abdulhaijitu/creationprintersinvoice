import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DomainBranding {
  organization_id: string;
  organization_name: string;
  branding: {
    app_name: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    footer_text: string | null;
    hide_platform_branding: boolean;
  };
}

// Hook to detect tenant by current domain
export const useDomainDetection = () => {
  const [tenantData, setTenantData] = useState<DomainBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  useEffect(() => {
    const detectDomain = async () => {
      const currentDomain = window.location.hostname;
      
      // Skip detection for localhost and default domains
      if (
        currentDomain === 'localhost' ||
        currentDomain.endsWith('.lovable.app') ||
        currentDomain.endsWith('.lovableproject.com')
      ) {
        setIsLoading(false);
        return;
      }

      setIsCustomDomain(true);

      try {
        const { data, error } = await supabase
          .rpc('get_organization_by_domain', { domain_name: currentDomain });

        if (!error && data && data.length > 0) {
          const brandingData = data[0].branding as Record<string, unknown>;
          setTenantData({
            organization_id: data[0].organization_id,
            organization_name: data[0].organization_name,
            branding: {
              app_name: (brandingData?.app_name as string) || null,
              logo_url: (brandingData?.logo_url as string) || null,
              favicon_url: (brandingData?.favicon_url as string) || null,
              primary_color: (brandingData?.primary_color as string) || null,
              secondary_color: (brandingData?.secondary_color as string) || null,
              accent_color: (brandingData?.accent_color as string) || null,
              footer_text: (brandingData?.footer_text as string) || null,
              hide_platform_branding: (brandingData?.hide_platform_branding as boolean) || false,
            },
          });
        }
      } catch (err) {
        console.error('Domain detection error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    detectDomain();
  }, []);

  return {
    tenantData,
    isLoading,
    isCustomDomain,
    currentDomain: window.location.hostname,
  };
};

// Apply branding from domain detection
export const applyDomainBranding = (branding: DomainBranding['branding']) => {
  if (!branding) return;

  const root = document.documentElement;

  // Helper to convert hex to HSL
  const hexToHSL = (hex: string): string => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Apply primary color
  if (branding.primary_color) {
    const hsl = hexToHSL(branding.primary_color);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
  }

  // Apply secondary color
  if (branding.secondary_color) {
    const hsl = hexToHSL(branding.secondary_color);
    root.style.setProperty('--secondary', hsl);
  }

  // Apply accent color
  if (branding.accent_color) {
    const hsl = hexToHSL(branding.accent_color);
    root.style.setProperty('--accent', hsl);
  }

  // Update favicon
  if (branding.favicon_url) {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = branding.favicon_url;
  }

  // Update title
  if (branding.app_name) {
    document.title = branding.app_name;
  }
};
