import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface OrgRolePermission {
  role: string;
  permission_key: string;
  is_enabled: boolean;
  is_protected: boolean;
}

interface OrgSpecificPermission {
  id: string;
  organization_id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

// Module name aliases - handles variations in module names (canonical → database variants)
const MODULE_NAME_ALIASES: Record<string, string[]> = {
  'price_calculation': ['price_calculation', 'price_calculations'],
  'price_calculations': ['price_calculation', 'price_calculations'],
  'challan': ['challan', 'delivery_challans'],
  'delivery_challans': ['challan', 'delivery_challans'],
  'team': ['team', 'team_members'],
  'team_members': ['team', 'team_members'],
};

/**
 * Get all possible permission keys for a module (handles aliases)
 */
const getAliasedPermissionKeys = (permissionKey: string): string[] => {
  const [moduleName, action] = permissionKey.split('.');
  if (!moduleName || !action) return [permissionKey];
  
  const aliases = MODULE_NAME_ALIASES[moduleName];
  if (!aliases) return [permissionKey];
  
  return aliases.map(alias => `${alias}.${action}`);
};

// Module-level caches with proper invalidation
let globalPermissionCache: OrgRolePermission[] | null = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds - shorter for better consistency

// Cache for org-specific permissions per org
const orgPermissionCache = new Map<string, {
  permissions: OrgSpecificPermission[];
  timestamp: number;
}>();

/**
 * Invalidate all permission caches - call this after permission updates
 */
export const invalidatePermissionCaches = () => {
  globalPermissionCache = null;
  globalCacheTimestamp = 0;
  orgPermissionCache.clear();
  console.log('[Permissions] All caches invalidated');
};

/**
 * Invalidate org-specific cache only
 */
export const invalidateOrgPermissionCache = (organizationId: string) => {
  orgPermissionCache.delete(organizationId);
  console.log(`[Permissions] Org cache invalidated for: ${organizationId}`);
};

export const useOrgRolePermissions = () => {
  const { orgRole, organization } = useOrganization();
  const [globalPermissions, setGlobalPermissions] = useState<OrgRolePermission[]>([]);
  const [orgPermissions, setOrgPermissions] = useState<OrgSpecificPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const isMountedRef = useRef(true);

  // Single-flight guard for global permissions
  const globalFetchInFlight = useRef<Promise<OrgRolePermission[]> | null>(null);

  // Fetch global role permissions with single-flight dedup
  const fetchGlobalPermissions = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && globalPermissionCache && Date.now() - globalCacheTimestamp < CACHE_DURATION) {
      setGlobalPermissions(globalPermissionCache);
      return globalPermissionCache;
    }

    // Deduplicate concurrent calls
    if (globalFetchInFlight.current) {
      return globalFetchInFlight.current;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('org_role_permissions')
          .select('role, permission_key, is_enabled, is_protected');

        if (error) throw error;

        globalPermissionCache = data || [];
        globalCacheTimestamp = Date.now();
        if (isMountedRef.current) {
          setGlobalPermissions(globalPermissionCache);
        }
        return globalPermissionCache;
      } catch (error) {
        console.error('[Permissions] Error fetching global role permissions:', error);
        return [];
      } finally {
        globalFetchInFlight.current = null;
      }
    })();

    globalFetchInFlight.current = fetchPromise;
    return fetchPromise;
  }, []);

  // Single-flight guard for org permissions
  const orgFetchInFlight = useRef<Promise<OrgSpecificPermission[]> | null>(null);

  // Fetch org-specific permission overrides with single-flight dedup
  const fetchOrgPermissions = useCallback(async (forceRefresh = false) => {
    if (!organization?.id) return [];

    const cached = orgPermissionCache.get(organization.id);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOrgPermissions(cached.permissions);
      return cached.permissions;
    }

    // Deduplicate concurrent calls
    if (orgFetchInFlight.current) {
      return orgFetchInFlight.current;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('org_specific_permissions')
          .select('id, organization_id, role, permission_key, is_enabled')
          .eq('organization_id', organization.id);

        if (error) throw error;

        const perms = data || [];
        orgPermissionCache.set(organization.id, {
          permissions: perms,
          timestamp: Date.now(),
        });
        if (isMountedRef.current) {
          setOrgPermissions(perms);
        }
        return perms;
      } catch (error) {
        console.error('[Permissions] Error fetching org-specific permissions:', error);
        return [];
      } finally {
        orgFetchInFlight.current = null;
      }
    })();

    orgFetchInFlight.current = fetchPromise;
    return fetchPromise;
  }, [organization?.id]);

  // Initial fetch - with mounted check
  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchGlobalPermissions(), fetchOrgPermissions()]);
      if (isMountedRef.current) {
        setLoading(false);
        setLastFetch(Date.now());
      }
    };
    fetchAll();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchGlobalPermissions, fetchOrgPermissions]);

  /**
   * Check if user has a specific permission
   * Checks org-specific override first, then falls back to global role permissions
   * 
   * CRITICAL: This now correctly returns the is_enabled value (true/false)
   * rather than just checking for existence
   * 
   * ALSO: Supports module name aliasing (e.g., price_calculations → price_calculation)
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (!orgRole) return false;
    
    // Owner always has all permissions
    if (orgRole === 'owner') return true;

    // Get all possible keys (handles aliases like price_calculations/price_calculation)
    const keysToCheck = getAliasedPermissionKeys(permissionKey);

    // Check org-specific override first for ANY alias - MUST respect the is_enabled value
    for (const key of keysToCheck) {
      const orgOverride = orgPermissions.find(
        p => p.role === orgRole && p.permission_key === key
      );
      if (orgOverride !== undefined) {
        // We found an org-specific override, use its value
        return orgOverride.is_enabled;
      }
    }

    // Fall back to global role permission for ANY alias
    for (const key of keysToCheck) {
      const globalPerm = globalPermissions.find(
        p => p.role === orgRole && p.permission_key === key
      );
      if (globalPerm !== undefined) {
        return globalPerm.is_enabled;
      }
    }

    return false;
  }, [globalPermissions, orgPermissions, orgRole]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key));
  }, [hasPermission]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.every(key => hasPermission(key));
  }, [hasPermission]);

  /**
   * Get all permissions for a specific role (merged global + org overrides)
   */
  const getPermissionsForRole = useCallback((role: string): Map<string, boolean> => {
    const permMap = new Map<string, boolean>();
    
    // Start with global permissions
    for (const p of globalPermissions) {
      if (p.role === role) {
        permMap.set(p.permission_key, p.is_enabled);
      }
    }
    
    // Override with org-specific permissions
    for (const p of orgPermissions) {
      if (p.role === role) {
        permMap.set(p.permission_key, p.is_enabled);
      }
    }
    
    return permMap;
  }, [globalPermissions, orgPermissions]);

  /**
   * Force refresh permissions from database - CLEARS CACHE
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[Permissions] Force refreshing all permissions...');
    // Clear caches first
    if (organization?.id) {
      invalidateOrgPermissionCache(organization.id);
    }
    globalPermissionCache = null;
    globalCacheTimestamp = 0;
    
    setLoading(true);
    await Promise.all([
      fetchGlobalPermissions(true),
      fetchOrgPermissions(true),
    ]);
    if (isMountedRef.current) {
      setLoading(false);
      setLastFetch(Date.now());
    }
    console.log('[Permissions] Force refresh complete');
  }, [fetchGlobalPermissions, fetchOrgPermissions, organization?.id]);

  /**
   * Get all visible sidebar modules based on permissions
   */
  const visibleModules = useMemo(() => {
    const modules: string[] = [];
    const allPerms = getPermissionsForRole(orgRole || '');
    
    for (const [key, enabled] of allPerms) {
      if (enabled && key.endsWith('.view')) {
        const module = key.replace('.view', '');
        if (!modules.includes(module)) {
          modules.push(module);
        }
      }
    }
    
    return modules;
  }, [getPermissionsForRole, orgRole]);

  return {
    globalPermissions,
    orgPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsForRole,
    refreshPermissions,
    visibleModules,
    orgRole,
    lastFetch,
  };
};

/**
 * Utility function for non-hook contexts
 * Checks permission directly against the database (bypasses cache)
 */
export const checkOrgRolePermission = async (
  role: string,
  permissionKey: string,
  organizationId?: string
): Promise<boolean> => {
  try {
    // Check org-specific override first if org ID provided
    if (organizationId) {
      const { data: orgData, error: orgError } = await supabase
        .from('org_specific_permissions')
        .select('is_enabled')
        .eq('organization_id', organizationId)
        .eq('role', role)
        .eq('permission_key', permissionKey)
        .single();
      
      if (!orgError && orgData) {
        return orgData.is_enabled;
      }
    }

    // Fall back to global role permission
    const { data, error } = await supabase
      .from('org_role_permissions')
      .select('is_enabled')
      .eq('role', role)
      .eq('permission_key', permissionKey)
      .single();

    if (error) return false;
    return data?.is_enabled ?? false;
  } catch {
    return false;
  }
};
