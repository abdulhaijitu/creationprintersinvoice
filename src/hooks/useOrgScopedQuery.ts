/**
 * Organization-Scoped Query Hook
 * 
 * Provides utilities for ensuring ALL database queries are properly scoped
 * to the current organization. This is CRITICAL for multi-tenant data isolation.
 * 
 * RULES:
 * 1. ALL business data queries MUST use organization_id filter
 * 2. Super Admins in the admin panel should NEVER see org business data
 * 3. Super Admins can only access org data when impersonating
 */

import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';

export interface OrgQueryContext {
  /** Current organization ID - null if no org context */
  organizationId: string | null;
  
  /** Whether the user has a valid org context for querying */
  hasOrgContext: boolean;
  
  /** Whether data queries should be blocked (Super Admin without impersonation) */
  shouldBlockDataQueries: boolean;
  
  /** Helper to apply org filter to a Supabase query */
  applyOrgFilter: <T extends { eq: (column: string, value: string) => T }>(query: T) => T | null;
  
  /** Get org ID for insert operations */
  getOrgIdForInsert: () => string | null;
}

/**
 * Hook to get organization-scoped query context
 * 
 * Usage:
 * ```typescript
 * const { organizationId, hasOrgContext, applyOrgFilter } = useOrgScopedQuery();
 * 
 * // In your data fetch:
 * if (!hasOrgContext) return; // Don't fetch without org context
 * 
 * const query = supabase.from('invoices').select('*');
 * const scopedQuery = applyOrgFilter(query);
 * if (!scopedQuery) return; // Query blocked
 * 
 * const { data } = await scopedQuery;
 * ```
 */
export function useOrgScopedQuery(): OrgQueryContext {
  const { organization } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  const organizationId = organization?.id || null;
  
  // User has org context if they have an organization loaded
  const hasOrgContext = !!organizationId;
  
  // Super Admins should NOT see org business data in admin panel
  // They can only see it when impersonating (which sets the organization context)
  // If a Super Admin has no org context, block data queries
  const shouldBlockDataQueries = isSuperAdmin && !hasOrgContext;
  
  const applyOrgFilter = useCallback(<T extends { eq: (column: string, value: string) => T }>(
    query: T
  ): T | null => {
    if (!organizationId) {
      console.warn('Attempted to query without organization context');
      return null;
    }
    
    return query.eq('organization_id', organizationId);
  }, [organizationId]);
  
  const getOrgIdForInsert = useCallback(() => {
    return organizationId;
  }, [organizationId]);
  
  return useMemo(() => ({
    organizationId,
    hasOrgContext,
    shouldBlockDataQueries,
    applyOrgFilter,
    getOrgIdForInsert,
  }), [organizationId, hasOrgContext, shouldBlockDataQueries, applyOrgFilter, getOrgIdForInsert]);
}

/**
 * Guard hook that prevents rendering if no org context
 * Returns true if the component should render, false otherwise
 */
export function useOrgContextGuard(): boolean {
  const { hasOrgContext } = useOrgScopedQuery();
  return hasOrgContext;
}
