/**
 * useResolveRole Hook
 * 
 * Provides authoritative role resolution from the Edge Function.
 * This is the SINGLE SOURCE OF TRUTH for role resolution.
 * 
 * IMPORTANT: 
 * - Never cache roles client-side
 * - Always refetch on login, page refresh, and org switch
 * - Frontend role checks are for UX only
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrgRole } from '@/lib/roles';

export interface ResolvedRole {
  success: boolean;
  userId: string;
  systemRole: 'super_admin' | null;
  isSuperAdmin: boolean;
  orgRole: OrgRole | null;
  organizationId: string | null;
  isImpersonating: boolean;
  effectiveRole: OrgRole | null;
  membership: {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
  } | null;
  error?: string;
}

interface ResolveRoleParams {
  organizationId?: string;
  isImpersonating?: boolean;
  impersonationTarget?: {
    organizationId: string;
    ownerId: string;
  };
}

export function useResolveRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Resolve the current user's role from the Edge Function.
   * This is the authoritative source for role information.
   */
  const resolveRole = useCallback(async (params: ResolveRoleParams): Promise<ResolvedRole | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Not authenticated');
        return null;
      }

      const response = await supabase.functions.invoke('resolve-role', {
        body: params,
      });

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return response.data as ResolvedRole;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve role';
      setError(message);
      console.error('Error resolving role:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Quick check if the current user is an owner of the organization.
   * Uses the edge function for authoritative verification.
   */
  const verifyOwnerRole = useCallback(async (organizationId: string): Promise<boolean> => {
    const resolved = await resolveRole({ organizationId });
    return resolved?.effectiveRole === 'owner';
  }, [resolveRole]);

  return {
    resolveRole,
    verifyOwnerRole,
    loading,
    error,
  };
}
