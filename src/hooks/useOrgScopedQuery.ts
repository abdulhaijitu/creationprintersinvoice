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
 * 4. ALL queries MUST fail CLOSED (block if uncertain)
 * 5. Business table queries THROW errors in Super Admin context (hard block)
 */

import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  validateQueryAccess, 
  canQueryTable, 
  BusinessDataAccessError,
  isBusinessTable 
} from '@/lib/businessTableGuard';

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
  
  /** Validate that fetched data matches current context */
  validateFetchedData: <T extends { organization_id?: string | null }>(data: T[]) => T[];
  
  /** Current app context */
  appContext: 'user' | 'super_admin';
  
  /** Whether impersonating */
  isImpersonating: boolean;
  
  /** 
   * Validate query access - THROWS if attempting to query business tables in admin context 
   * Use this before any business table query
   */
  assertQueryAllowed: (tableName: string) => void;
  
  /**
   * Check if a query is allowed (non-throwing version)
   */
  canQuery: (tableName: string) => boolean;
}

/**
 * Hook to get organization-scoped query context
 * 
 * CRITICAL: This hook enforces multi-tenant data isolation at the query level.
 * 
 * Usage:
 * ```typescript
 * const { organizationId, hasOrgContext, applyOrgFilter, shouldBlockDataQueries, assertQueryAllowed } = useOrgScopedQuery();
 * 
 * // For business tables, ALWAYS assert first (throws if blocked)
 * assertQueryAllowed('invoices');
 * 
 * // ALWAYS check if queries should be blocked first
 * if (shouldBlockDataQueries) {
 *   return { data: [], error: null }; // Return empty, never fetch
 * }
 * 
 * if (!hasOrgContext) return; // Don't fetch without org context
 * 
 * const query = supabase.from('invoices').select('*');
 * const scopedQuery = applyOrgFilter(query);
 * if (!scopedQuery) return; // Query blocked
 * 
 * const { data } = await scopedQuery;
 * 
 * // Validate fetched data as extra safety layer
 * const validatedData = validateFetchedData(data || []);
 * ```
 */
export function useOrgScopedQuery(): OrgQueryContext {
  const { organization } = useOrganization();
  const { isSuperAdmin } = useAuth();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();
  
  const organizationId = organization?.id || null;
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Determine current app context
  const appContext: 'user' | 'super_admin' = useMemo(() => {
    if (isSuperAdmin && isAdminRoute && !isImpersonating) {
      return 'super_admin';
    }
    return 'user';
  }, [isSuperAdmin, isAdminRoute, isImpersonating]);
  
  // User has org context if they have an organization loaded
  const hasOrgContext = !!organizationId;
  
  /**
   * CRITICAL: Super Admins should NOT see org business data in admin panel
   * They can only see it when impersonating (which sets the organization context)
   * 
   * Block data queries if:
   * 1. Super Admin in admin panel without impersonation
   * 2. No organization context available
   */
  const shouldBlockDataQueries = useMemo(() => {
    // Super Admin in admin mode (not impersonating) = BLOCK ALL BUSINESS DATA
    if (isSuperAdmin && isAdminRoute && !isImpersonating) {
      return true;
    }
    
    // Super Admin trying to access user routes without impersonation = BLOCK
    if (isSuperAdmin && !isImpersonating && !hasOrgContext) {
      return true;
    }
    
    return false;
  }, [isSuperAdmin, isAdminRoute, isImpersonating, hasOrgContext]);
  
  const applyOrgFilter = useCallback(<T extends { eq: (column: string, value: string) => T }>(
    query: T
  ): T | null => {
    // FAIL CLOSED: Block if we should block data queries
    if (shouldBlockDataQueries) {
      console.warn('[OrgScopedQuery] BLOCKED: Query attempted in Super Admin mode without impersonation');
      return null;
    }
    
    if (!organizationId) {
      console.warn('[OrgScopedQuery] BLOCKED: Attempted to query without organization context');
      return null;
    }
    
    return query.eq('organization_id', organizationId);
  }, [organizationId, shouldBlockDataQueries]);
  
  const getOrgIdForInsert = useCallback(() => {
    // FAIL CLOSED: Block inserts in Super Admin mode without impersonation
    if (shouldBlockDataQueries) {
      console.warn('[OrgScopedQuery] BLOCKED: Insert attempted in Super Admin mode');
      return null;
    }
    return organizationId;
  }, [organizationId, shouldBlockDataQueries]);
  
  /**
   * Runtime validation of fetched data
   * Filters out any data that doesn't match the current organization context
   * CRITICAL: This is a safety net, not a primary control
   */
  const validateFetchedData = useCallback(<T extends { organization_id?: string | null }>(
    data: T[]
  ): T[] => {
    // In Super Admin mode (not impersonating), return empty array
    if (shouldBlockDataQueries) {
      console.warn('[OrgScopedQuery] DISCARDED: Fetched data discarded in Super Admin mode');
      return [];
    }
    
    if (!organizationId) {
      console.warn('[OrgScopedQuery] DISCARDED: No org context for validation');
      return [];
    }
    
    // Filter to only data matching current org
    const validated = data.filter(item => {
      const itemOrgId = item.organization_id;
      if (itemOrgId !== organizationId) {
        console.warn('[OrgScopedQuery] DISCARDED: Data org mismatch', itemOrgId, 'vs', organizationId);
        return false;
      }
      return true;
    });
    
    if (validated.length !== data.length) {
      console.warn('[OrgScopedQuery] Filtered out', data.length - validated.length, 'items with org mismatch');
    }
    
    return validated;
  }, [organizationId, shouldBlockDataQueries]);
  
  /**
   * Assert that a query to a specific table is allowed
   * THROWS BusinessDataAccessError if attempting to query business tables in Super Admin context
   */
  const assertQueryAllowed = useCallback((tableName: string): void => {
    validateQueryAccess(tableName, appContext, isImpersonating);
  }, [appContext, isImpersonating]);
  
  /**
   * Check if a query is allowed (non-throwing version)
   */
  const canQuery = useCallback((tableName: string): boolean => {
    return canQueryTable(tableName, appContext, isImpersonating);
  }, [appContext, isImpersonating]);
  
  return useMemo(() => ({
    organizationId,
    hasOrgContext,
    shouldBlockDataQueries,
    applyOrgFilter,
    getOrgIdForInsert,
    validateFetchedData,
    appContext,
    isImpersonating,
    assertQueryAllowed,
    canQuery,
  }), [organizationId, hasOrgContext, shouldBlockDataQueries, applyOrgFilter, getOrgIdForInsert, validateFetchedData, appContext, isImpersonating, assertQueryAllowed, canQuery]);
}

/**
 * Guard hook that prevents rendering if no org context
 * Returns true if the component should render, false otherwise
 */
export function useOrgContextGuard(): boolean {
  const { hasOrgContext, shouldBlockDataQueries } = useOrgScopedQuery();
  
  // Block if we should block data queries OR if we don't have org context
  if (shouldBlockDataQueries) {
    return false;
  }
  
  return hasOrgContext;
}

/**
 * Hook that returns a query-safe function
 * Wraps any async query function to enforce org scoping
 */
export function useOrgScopedFetch() {
  const { shouldBlockDataQueries, organizationId, validateFetchedData } = useOrgScopedQuery();
  
  return {
    /**
     * Execute a fetch only if org context is valid
     * Returns empty array if blocked or no context
     */
    safeFetch: async <T extends { organization_id?: string | null }>(
      fetchFn: () => Promise<T[]>
    ): Promise<T[]> => {
      if (shouldBlockDataQueries) {
        console.warn('[OrgScopedFetch] Fetch blocked: Super Admin mode');
        return [];
      }
      
      if (!organizationId) {
        console.warn('[OrgScopedFetch] Fetch blocked: No org context');
        return [];
      }
      
      const data = await fetchFn();
      return validateFetchedData(data);
    },
    
    /**
     * Check if fetching is allowed before making a query
     */
    canFetch: !shouldBlockDataQueries && !!organizationId,
    
    /**
     * Get organization ID for query filtering
     */
    orgId: organizationId,
  };
}
