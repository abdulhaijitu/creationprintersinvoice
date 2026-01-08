import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { OrgRole } from '@/lib/roles';

// Storage key for impersonation - must match ImpersonationContext
const IMPERSONATION_STORAGE_KEY = 'printosaas_impersonation';

// Storage key for active org selection (multi-org users)
const ACTIVE_ORG_STORAGE_KEY = 'printosaas_active_organization_id';

// Re-export OrgRole for backward compatibility
export type { OrgRole } from '@/lib/roles';
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
  isSubscriptionActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number | null;
  refetchOrganization: () => Promise<void>;
  createOrganization: (name: string, slug: string) => Promise<{ error: Error | null; organization: Organization | null }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Check for impersonation state from session storage
  const getImpersonationState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.isImpersonating && parsed.target?.organizationId) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read impersonation state:', e);
    }
    return null;
  }, []);

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
      // Check if Super Admin is impersonating
      const impersonationState = getImpersonationState();
      
      if (isSuperAdmin && impersonationState?.isImpersonating) {
        // Fetch the impersonated organization directly
        const targetOrgId = impersonationState.target.organizationId;
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', targetOrgId)
          .single();

        if (orgError) {
          console.error('Error fetching impersonated organization:', orgError);
          setLoading(false);
          return;
        }

        setOrganization(orgData as Organization);
        setNeedsOnboarding(false);

        // Create a synthetic owner membership for the impersonation
        setMembership({
          id: 'impersonation-synthetic',
          organization_id: targetOrgId,
          user_id: impersonationState.target.ownerId,
          role: 'owner' as OrgRole,
        });

        // Get the subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('organization_id', targetOrgId)
          .maybeSingle();

        if (subData) {
          setSubscription(subData as Subscription);
        } else {
          setSubscription(null);
        }

        setLoading(false);
        return;
      }

      // Normal flow: Get the user's organization membership(s)
      const { data: membershipRows, error: membershipError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(25);

      if (membershipError) {
        console.error('Error fetching membership:', membershipError);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      if (!membershipRows || membershipRows.length === 0) {
        // User has no organization, needs onboarding
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      // Choose active org:
      // 1) localStorage preference
      // 2) first org with an active/trial subscription
      // 3) fallback to first membership
      let selectedMembership = membershipRows[0] as OrganizationMember;

      const preferredOrgId = (() => {
        try {
          return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
        } catch {
          return null;
        }
      })();

      if (preferredOrgId) {
        const match = membershipRows.find((m) => m.organization_id === preferredOrgId);
        if (match) selectedMembership = match as OrganizationMember;
      }

      if (membershipRows.length > 1 && !preferredOrgId) {
        const orgIds = membershipRows.map((m) => m.organization_id);
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('organization_id, status')
          .in('organization_id', orgIds);

        const activeOrgId = subs?.find((s) => s.status === 'active' || s.status === 'trial')?.organization_id;
        if (activeOrgId) {
          const match = membershipRows.find((m) => m.organization_id === activeOrgId);
          if (match) selectedMembership = match as OrganizationMember;
        }
      }

      setMembership(selectedMembership);
      setNeedsOnboarding(false);

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

      // Get the subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', selectedMembership.organization_id)
        .maybeSingle();

      setSubscription(subData ? (subData as Subscription) : null);

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

      // Create a free trial subscription (7 days)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: orgData.id,
          plan: 'free' as SubscriptionPlan,
          status: 'trial' as SubscriptionStatus,
          user_limit: 5,
          trial_ends_at: trialEndsAt.toISOString(),
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

  // Listen for impersonation state changes via custom event
  useEffect(() => {
    const handleImpersonationChange = () => {
      fetchOrganization();
    };
    
    window.addEventListener('impersonation-changed', handleImpersonationChange);
    return () => window.removeEventListener('impersonation-changed', handleImpersonationChange);
  }, [user, isSuperAdmin]);

  // Fetch organization on mount and when auth changes
  useEffect(() => {
    if (!authLoading) {
      fetchOrganization();
    }
  }, [user, authLoading, isSuperAdmin]);

  const orgRole = membership?.role || null;
  const isOrgOwner = orgRole === 'owner';
  const isOrgManager = orgRole === 'manager';
  const isOrgAdmin = isOrgOwner || isOrgManager;

  // Calculate trial status
  const isTrialExpired = subscription?.status === 'expired' || 
    (subscription?.status === 'trial' && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date());
  
  const isSubscriptionActive = subscription?.status === 'active' || 
    (subscription?.status === 'trial' && !isTrialExpired);

  const daysRemaining = subscription?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

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
    isSubscriptionActive,
    isTrialExpired,
    daysRemaining,
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
