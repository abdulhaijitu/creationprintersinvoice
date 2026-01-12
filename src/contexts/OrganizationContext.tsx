import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { OrgRole } from '@/lib/permissions/constants';

// Re-export for backward compatibility
export type { OrgRole };

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_rate: number;
  invoice_prefix: string;
  quotation_prefix: string;
  challan_prefix: string;
  invoice_terms: string | null;
  invoice_footer: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_routing_number: string | null;
  mobile_banking: string | null;
  owner_id: string | null;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
}

interface OrganizationContextType {
  organization: Organization | null;
  membership: OrganizationMember | null;
  loading: boolean;
  isOrgOwner: boolean;
  isOrgManager: boolean;
  isOrgAdmin: boolean;
  orgRole: OrgRole | null;
  refetchOrganization: (forceRefresh?: boolean) => Promise<void>;
  createOrganization: (name: string, slug: string) => Promise<{ error: Error | null; organization: Organization | null }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchInProgress = useRef(false);
  const lastFetchUserId = useRef<string | null>(null);

  const fetchOrganization = useCallback(async (forceRefresh = false) => {
    if (fetchInProgress.current && !forceRefresh) {
      return;
    }
    
    if (!user) {
      setOrganization(null);
      setMembership(null);
      setLoading(false);
      lastFetchUserId.current = null;
      return;
    }

    if (!forceRefresh && lastFetchUserId.current === user.id && membership) {
      setLoading(false);
      return;
    }

    fetchInProgress.current = true;

    try {
      // Get the user's organization membership
      const { data: membershipRows, error: membershipError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (membershipError) {
        console.error('Error fetching membership:', membershipError);
        setLoading(false);
        return;
      }

      if (!membershipRows || membershipRows.length === 0) {
        setLoading(false);
        return;
      }

      const selectedMembership = membershipRows[0] as OrganizationMember;
      setMembership(selectedMembership);

      // Get the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', selectedMembership.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setLoading(false);
        return;
      }

      setOrganization(orgData as Organization);
      setLoading(false);
      lastFetchUserId.current = user.id;
    } catch (error) {
      console.error('Error in fetchOrganization:', error);
      setLoading(false);
    } finally {
      fetchInProgress.current = false;
    }
  }, [user, membership]);

  const createOrganization = async (name: string, slug: string): Promise<{ error: Error | null; organization: Organization | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated'), organization: null };
    }

    try {
      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        return { error: orgError, organization: null };
      }

      // Create the membership (owner role)
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'owner' as OrgRole,
        });

      if (memberError) {
        console.error('Error creating membership:', memberError);
        return { error: memberError, organization: null };
      }

      // Force refetch after creating organization
      await fetchOrganization(true);

      return { error: null, organization: orgData as Organization };
    } catch (error) {
      console.error('Error in createOrganization:', error);
      return { error: error as Error, organization: null };
    }
  };

  // Fetch organization on mount and when auth changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchOrganization(true);
    } else if (!authLoading && !user) {
      setOrganization(null);
      setMembership(null);
      setLoading(false);
    }
  }, [user?.id, authLoading, fetchOrganization]);

  const orgRole = membership?.role || null;
  const isOrgOwner = orgRole === 'owner';
  const isOrgManager = orgRole === 'manager';
  const isOrgAdmin = isOrgOwner || isOrgManager;

  const value = {
    organization,
    membership,
    loading: loading || authLoading,
    isOrgOwner,
    isOrgManager,
    isOrgAdmin,
    orgRole,
    refetchOrganization: fetchOrganization,
    createOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};