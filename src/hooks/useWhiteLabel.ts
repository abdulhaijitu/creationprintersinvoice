import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface BrandingSettings {
  id?: string;
  organization_id?: string;
  app_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  footer_text: string | null;
  hide_platform_branding: boolean;
}

export interface CustomDomain {
  id: string;
  organization_id: string;
  domain: string;
  is_verified: boolean;
  verification_token: string | null;
  verified_at: string | null;
  is_primary: boolean;
  ssl_status: string;
  created_at: string;
}

export interface EmailBranding {
  id?: string;
  organization_id?: string;
  sender_name: string | null;
  sender_email: string | null;
  reply_to_email: string | null;
  email_footer: string | null;
  whatsapp_sender_label: string | null;
  sms_sender_label: string | null;
}

export interface WhiteLabelSettings {
  id?: string;
  organization_id?: string;
  whitelabel_enabled: boolean;
  custom_domain_enabled: boolean;
  email_branding_enabled: boolean;
  pdf_branding_enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
  notes: string | null;
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

const defaultEmailBranding: EmailBranding = {
  sender_name: null,
  sender_email: null,
  reply_to_email: null,
  email_footer: null,
  whatsapp_sender_label: null,
  sms_sender_label: null,
};

export const useWhiteLabel = () => {
  const { organization, subscription } = useOrganization();
  const queryClient = useQueryClient();

  // Check if white-label is available based on plan
  const isProPlan = subscription?.plan === 'pro' || subscription?.plan === 'enterprise';

  // Fetch white-label settings (admin controlled)
  const { data: whiteLabelSettings } = useQuery({
    queryKey: ['whitelabel-settings', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const { data, error } = await supabase
        .from('organization_whitelabel_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();
      if (error) throw error;
      return data as WhiteLabelSettings | null;
    },
    enabled: !!organization?.id,
  });

  // Fetch branding settings
  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ['organization-branding', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return defaultBranding;
      const { data, error } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();
      if (error) throw error;
      return (data as BrandingSettings) || defaultBranding;
    },
    enabled: !!organization?.id,
  });

  // Fetch custom domains
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['organization-domains', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('organization_domains')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomDomain[];
    },
    enabled: !!organization?.id,
  });

  // Fetch email branding
  const { data: emailBranding, isLoading: emailBrandingLoading } = useQuery({
    queryKey: ['organization-email-branding', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return defaultEmailBranding;
      const { data, error } = await supabase
        .from('organization_email_branding')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();
      if (error) throw error;
      return (data as EmailBranding) || defaultEmailBranding;
    },
    enabled: !!organization?.id,
  });

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (settings: Partial<BrandingSettings>) => {
      if (!organization?.id) throw new Error('No organization');
      
      const { data: existing } = await supabase
        .from('organization_branding')
        .select('id')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_branding')
          .update(settings)
          .eq('organization_id', organization.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_branding')
          .insert({ ...settings, organization_id: organization.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-branding'] });
      toast.success('Branding settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update branding: ' + error.message);
    },
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      if (!organization?.id) throw new Error('No organization');
      
      // Generate verification token
      const verificationToken = `lovable_verify_${crypto.randomUUID().slice(0, 8)}`;
      
      const { error } = await supabase
        .from('organization_domains')
        .insert({
          organization_id: organization.id,
          domain,
          verification_token: verificationToken,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast.success('Domain added. Please add DNS records to verify.');
    },
    onError: (error) => {
      toast.error('Failed to add domain: ' + error.message);
    },
  });

  // Remove domain mutation
  const removeDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('organization_domains')
        .delete()
        .eq('id', domainId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast.success('Domain removed');
    },
    onError: (error) => {
      toast.error('Failed to remove domain: ' + error.message);
    },
  });

  // Update email branding mutation
  const updateEmailBrandingMutation = useMutation({
    mutationFn: async (settings: Partial<EmailBranding>) => {
      if (!organization?.id) throw new Error('No organization');
      
      const { data: existing } = await supabase
        .from('organization_email_branding')
        .select('id')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_email_branding')
          .update(settings)
          .eq('organization_id', organization.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_email_branding')
          .insert({ ...settings, organization_id: organization.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-email-branding'] });
      toast.success('Email branding updated');
    },
    onError: (error) => {
      toast.error('Failed to update email branding: ' + error.message);
    },
  });

  // Check if white-label features are enabled
  const isWhiteLabelEnabled = whiteLabelSettings?.whitelabel_enabled || false;
  const isCustomDomainEnabled = whiteLabelSettings?.custom_domain_enabled || false;
  const isEmailBrandingEnabled = whiteLabelSettings?.email_branding_enabled || false;
  const isPdfBrandingEnabled = whiteLabelSettings?.pdf_branding_enabled || false;

  return {
    // Data
    branding: branding || defaultBranding,
    domains,
    emailBranding: emailBranding || defaultEmailBranding,
    whiteLabelSettings,
    
    // Loading states
    isLoading: brandingLoading || domainsLoading || emailBrandingLoading,
    
    // Plan & feature checks
    isProPlan,
    isWhiteLabelEnabled,
    isCustomDomainEnabled,
    isEmailBrandingEnabled,
    isPdfBrandingEnabled,
    
    // Mutations
    updateBranding: updateBrandingMutation.mutate,
    updateBrandingAsync: updateBrandingMutation.mutateAsync,
    isBrandingUpdating: updateBrandingMutation.isPending,
    
    addDomain: addDomainMutation.mutate,
    removeDomain: removeDomainMutation.mutate,
    isDomainUpdating: addDomainMutation.isPending || removeDomainMutation.isPending,
    
    updateEmailBranding: updateEmailBrandingMutation.mutate,
    isEmailBrandingUpdating: updateEmailBrandingMutation.isPending,
  };
};

// Hook to get organization by domain (for domain detection)
export const useOrganizationByDomain = (domain: string | null) => {
  return useQuery({
    queryKey: ['organization-by-domain', domain],
    queryFn: async () => {
      if (!domain) return null;
      const { data, error } = await supabase
        .rpc('get_organization_by_domain', { domain_name: domain });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!domain,
  });
};
