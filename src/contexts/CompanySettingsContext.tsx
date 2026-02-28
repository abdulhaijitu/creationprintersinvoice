import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, loading: authLoading } = useAuth();
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
        setError(fetchError.message);
        return;
      }


      setSettings(data as CompanySettings | null);
    } catch (err) {
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
      return updated;
      return updated;
    });
    queryClient.invalidateQueries({ queryKey: ['company-settings'] });
  }, [queryClient]);

  // Refetch settings from database
  const refetchSettings = useCallback(async () => {
    await fetchSettings();
    await fetchSettings();
    queryClient.invalidateQueries({ queryKey: ['company-settings'] });
  }, [fetchSettings, queryClient]);

  // Only fetch when auth is ready and user exists
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    fetchSettings();
  }, [user, authLoading, fetchSettings]);

  // Set up Supabase Realtime subscription for live sync
  useEffect(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    

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
          
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as CompanySettings;
            setSettings(newData);
            // Invalidate react-query cache
            queryClient.invalidateQueries({ queryKey: ['company-settings'] });
            
          } else if (payload.eventType === 'DELETE') {
            setSettings(null);
            queryClient.invalidateQueries({ queryKey: ['company-settings'] });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
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
