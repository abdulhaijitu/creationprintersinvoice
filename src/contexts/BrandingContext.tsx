import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOrganization } from './OrganizationContext';
import { useWhiteLabel, BrandingSettings } from '@/hooks/useWhiteLabel';
import { APP_CONFIG } from '@/lib/appConfig';

interface BrandingContextType {
  branding: BrandingSettings;
  isLoaded: boolean;
  applyBranding: () => void;
  resetBranding: () => void;
}

const defaultBranding: BrandingSettings = {
  app_name: null,
  logo_url: null,
  favicon_url: null,
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  accent_color: null,
  footer_text: null,
  hide_platform_branding: false,
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove #
  hex = hex.replace('#', '');
  
  // Parse RGB
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
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { organization } = useOrganization();
  const { branding: fetchedBranding, isWhiteLabelEnabled, isLoading } = useWhiteLabel();
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (isWhiteLabelEnabled && fetchedBranding) {
        setBranding(fetchedBranding);
      } else {
        setBranding(defaultBranding);
      }
      setIsLoaded(true);
    }
  }, [isLoading, isWhiteLabelEnabled, fetchedBranding]);

  const applyBranding = () => {
    if (!branding || !isWhiteLabelEnabled) return;

    const root = document.documentElement;

    // Apply primary color
    if (branding.primary_color) {
      const primaryHSL = hexToHSL(branding.primary_color);
      root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
      root.style.setProperty('--sidebar-primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
      root.style.setProperty('--chart-1', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    }

    // Apply secondary color
    if (branding.secondary_color) {
      const secondaryHSL = hexToHSL(branding.secondary_color);
      root.style.setProperty('--secondary', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
      root.style.setProperty('--chart-2', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
    }

    // Apply accent color
    if (branding.accent_color) {
      const accentHSL = hexToHSL(branding.accent_color);
      root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    }

    // Update favicon
    if (branding.favicon_url) {
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        existingFavicon.setAttribute('href', branding.favicon_url);
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = branding.favicon_url;
        document.head.appendChild(link);
      }
    }

    // Update document title
    if (branding.app_name) {
      document.title = branding.app_name;
    }
  };

  const resetBranding = () => {
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--sidebar-primary');
    root.style.removeProperty('--chart-1');
    root.style.removeProperty('--chart-2');
    
    // Reset favicon
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.setAttribute('href', '/favicon.jpg');
    }
    
    // Reset title
    document.title = APP_CONFIG.fullTitle;
  };

  // Apply branding when it changes
  useEffect(() => {
    if (isLoaded && isWhiteLabelEnabled) {
      applyBranding();
    } else {
      resetBranding();
    }
  }, [branding, isLoaded, isWhiteLabelEnabled]);

  return (
    <BrandingContext.Provider value={{ branding, isLoaded, applyBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
