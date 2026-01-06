import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type OrgRole = 'owner' | 'manager' | 'accounts' | 'staff';
export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';

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

interface Subscription {
  id: string;
  organization_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  user_limit: number;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
}

interface OrganizationContextType {
  organization: Organization | null;
  subscription: Subscription | null;
  membership: OrganizationMember | null;
  loading: boolean;
  needsOnboarding: boolean;
  isOrgOwner: boolean;
  isOrgManager: boolean;
  isOrgAdmin: boolean;
  orgRole: OrgRole | null;
  refetchOrganization: () => Promise<void>;
  createOrganization: (name: string, slug: string) => Promise<{ error: Error | null; organization: Organization | null }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchOrganization = async () => {
    if (!user) {
      setOrganization(null);
      setSubscription(null);
      setMembership(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    try {
      // First, get the user's organization membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error fetching membership:', membershipError);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      if (!membershipData) {
        // User has no organization, needs onboarding
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      setMembership(membershipData as OrganizationMember);
      setNeedsOnboarding(false);

      // Get the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', membershipData.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setLoading(false);
        return;
      }

      setOrganization(orgData as Organization);

      // Get the subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', membershipData.organization_id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData as Subscription);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchOrganization:', error);
      setLoading(false);
    }
  };

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

      // Create a free trial subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: orgData.id,
          plan: 'free' as SubscriptionPlan,
          status: 'trial' as SubscriptionStatus,
          user_limit: 5,
        });

      if (subError) {
        console.error('Error creating subscription:', subError);
        // Don't fail the whole operation for subscription error
      }

      // Refetch organization data
      await fetchOrganization();

      return { error: null, organization: orgData as Organization };
    } catch (error) {
      console.error('Error in createOrganization:', error);
      return { error: error as Error, organization: null };
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrganization();
    }
  }, [user, authLoading]);

  const orgRole = membership?.role || null;
  const isOrgOwner = orgRole === 'owner';
  const isOrgManager = orgRole === 'manager';
  const isOrgAdmin = isOrgOwner || isOrgManager;

  const value = {
    organization,
    subscription,
    membership,
    loading: loading || authLoading,
    needsOnboarding,
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
