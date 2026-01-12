import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface CompanySettings {
  id: string;
  company_name: string;
  company_name_bn: string | null;
  address: string | null;
  address_bn: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_routing_number: string | null;
  mobile_banking: string | null;
  invoice_prefix: string | null;
  quotation_prefix: string | null;
  invoice_footer: string | null;
  invoice_terms: string | null;
}

interface CompanySettingsContextType {
  settings: CompanySettings | null;
  loading: boolean;
  error: string | null;
  refetchSettings: () => Promise<void>;
  updateSettingsLocally: (newSettings: Partial<CompanySettings>) => void;
}

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export const CompanySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[CompanySettingsContext] Fetch error:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('[CompanySettingsContext] Settings loaded:', data?.company_name);
      setSettings(data as CompanySettings | null);
    } catch (err) {
      console.error('[CompanySettingsContext] Unexpected error:', err);
      setError('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings locally (for instant UI updates after save)
  const updateSettingsLocally = useCallback((newSettings: Partial<CompanySettings>) => {
    setSettings(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...newSettings };
      console.log('[CompanySettingsContext] Settings updated locally:', updated.company_name);
      return updated;
    });
    // Also invalidate react-query cache to keep things in sync
    queryClient.invalidateQueries({ queryKey: ['company-settings'] });
  }, [queryClient]);

  // Refetch settings from database
  const refetchSettings = useCallback(async () => {
    console.log('[CompanySettingsContext] Refetching settings...');
    await fetchSettings();
    // Invalidate react-query cache for other components
    queryClient.invalidateQueries({ queryKey: ['company-settings'] });
  }, [fetchSettings, queryClient]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Set up Supabase Realtime subscription for live sync
  useEffect(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('[CompanySettingsContext] Setting up realtime subscription...');

    const channel = supabase
      .channel('company-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_settings',
        },
        (payload) => {
          console.log('[CompanySettingsContext] Realtime update received:', payload.eventType);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as CompanySettings;
            setSettings(newData);
            // Invalidate react-query cache
            queryClient.invalidateQueries({ queryKey: ['company-settings'] });
            console.log('[CompanySettingsContext] Settings synced from realtime');
          } else if (payload.eventType === 'DELETE') {
            setSettings(null);
            queryClient.invalidateQueries({ queryKey: ['company-settings'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[CompanySettingsContext] Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[CompanySettingsContext] Cleaning up realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);

  const value: CompanySettingsContextType = {
    settings,
    loading,
    error,
    refetchSettings,
    updateSettingsLocally,
  };

  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
};

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (context === undefined) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
};
