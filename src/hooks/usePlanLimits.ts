import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface PlanLimit {
  plan_name: string;
  user_limit: number;
  customer_limit: number;
  invoice_limit: number;
  expense_limit: number;
  quotation_limit: number;
  employee_limit: number;
}

export interface OrgLimitStatus {
  type: 'users' | 'clients' | 'invoices';
  current: number;
  limit: number | null;
  allowed: boolean;
  percentage: number;
}

export interface OrgPlanLimits {
  plan: string;
  users: { current: number; limit: number | null };
  clients: { current: number; limit: number | null };
  invoices: { current: number; limit: number | null };
}

export const usePlanLimits = () => {
  const { organization, subscription } = useOrganization();
  const [limits, setLimits] = useState<OrgPlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the plan limits
      const plan = subscription?.plan || 'free';
      
      const { data: planLimits, error: limitsError } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_name', plan)
        .single();

      if (limitsError) throw limitsError;

      // Get current counts
      const [usersRes, clientsRes, invoicesRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
      ]);

      setLimits({
        plan,
        users: {
          current: usersRes.count || 0,
          limit: planLimits?.user_limit || null,
        },
        clients: {
          current: clientsRes.count || 0,
          limit: planLimits?.customer_limit || null,
        },
        invoices: {
          current: invoicesRes.count || 0,
          limit: planLimits?.invoice_limit || null,
        },
      });
    } catch (err) {
      console.error('Error fetching plan limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch limits');
    } finally {
      setLoading(false);
    }
  }, [organization?.id, subscription?.plan]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const checkLimit = useCallback((type: 'users' | 'clients' | 'invoices'): OrgLimitStatus => {
    if (!limits) {
      return { type, current: 0, limit: null, allowed: true, percentage: 0 };
    }

    const { current, limit } = limits[type];
    
    // null limit means unlimited
    if (limit === null || limit >= 5000) {
      return { type, current, limit: null, allowed: true, percentage: 0 };
    }

    const percentage = Math.round((current / limit) * 100);
    const allowed = current < limit;

    return { type, current, limit, allowed, percentage };
  }, [limits]);

  const canCreate = useCallback((type: 'users' | 'clients' | 'invoices'): boolean => {
    const status = checkLimit(type);
    return status.allowed;
  }, [checkLimit]);

  const getLimitMessage = useCallback((type: 'users' | 'clients' | 'invoices'): string | null => {
    const status = checkLimit(type);
    if (status.allowed || status.limit === null) return null;

    const typeLabels = {
      users: 'team members',
      clients: 'customers',
      invoices: 'invoices',
    };

    return `You have reached your plan limit of ${status.limit} ${typeLabels[type]}. Please upgrade your plan to add more.`;
  }, [checkLimit]);

  return {
    limits,
    loading,
    error,
    checkLimit,
    canCreate,
    getLimitMessage,
    refetch: fetchLimits,
  };
};

// Hook for admin to manage all plan limits
export const useAdminPlanLimits = () => {
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPlanLimits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*')
        .order('plan_name');

      if (error) throw error;
      setPlanLimits(data || []);
    } catch (err) {
      console.error('Error fetching plan limits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanLimits();
  }, [fetchPlanLimits]);

  const updateLimit = useCallback(async (
    planName: string,
    field: keyof Omit<PlanLimit, 'plan_name'>,
    value: number | null
  ) => {
    setSaving(planName);
    try {
      const { error } = await supabase
        .from('plan_limits')
        .update({ [field]: value })
        .eq('plan_name', planName);

      if (error) throw error;

      setPlanLimits(prev => 
        prev.map(p => 
          p.plan_name === planName ? { ...p, [field]: value } : p
        )
      );

      return true;
    } catch (err) {
      console.error('Error updating plan limit:', err);
      return false;
    } finally {
      setSaving(null);
    }
  }, []);

  return {
    planLimits,
    loading,
    saving,
    updateLimit,
    refetch: fetchPlanLimits,
  };
};
