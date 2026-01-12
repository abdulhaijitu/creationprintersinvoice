/**
 * EFFECTIVE PERMISSIONS HOOK - SINGLE SOURCE OF TRUTH
 * 
 * This hook provides the authoritative permission state for the current user.
 * It fetches permissions from the database and normalizes them into a simple
 * { permission_key: boolean } map.
 * 
 * CRITICAL RULES:
 * 1. Super Admin always has ALL permissions (bypass)
 * 2. Owner role always has ALL permissions (bypass)
 * 3. Other roles get permissions from org_specific_permissions table
 * 4. Sidebar and routes MUST use this hook for permission checks
 * 
 * PERMISSION KEY FORMAT in database: "moduleName.action"
 * Examples: "invoices.view", "customers.create", "expenses.edit"
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

// Permission actions
type PermissionAction = 'view' | 'manage' | 'create' | 'edit' | 'delete';
const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'manage', 'create', 'edit', 'delete'];

// Module name mappings - handles variations in database vs config
// Key = config module name, Value = database module name(s)
const MODULE_NAME_ALIASES: Record<string, string[]> = {
  // Main modules
  'dashboard': ['dashboard'],
  'invoices': ['invoices'],
  'quotations': ['quotations'],
  'price_calculation': ['price_calculation', 'price_calculations'],
  'challan': ['challan', 'delivery_challans'],

  // Business modules
  'customers': ['customers'],
  'vendors': ['vendors'],
  'expenses': ['expenses'],

  // HR modules
  'employees': ['employees'],
  'attendance': ['attendance'],
  'salary': ['salary'],
  'leave': ['leave'],
  'performance': ['performance'],
  'tasks': ['tasks'],

  // System modules
  'reports': ['reports'],
  'team': ['team', 'team_members'],
  'settings': ['settings'],
};

// Reverse lookup - database name to canonical name
const DB_TO_CANONICAL: Record<string, string> = {};
Object.entries(MODULE_NAME_ALIASES).forEach(([canonical, aliases]) => {
  aliases.forEach(alias => {
    DB_TO_CANONICAL[alias] = canonical;
  });
});

interface EffectivePermission {
  key: string;
  enabled: boolean;
}

interface PermissionState {
  // Normalized map: { "invoices.view": true, "invoices.create": false, ... }
  permissionMap: Map<string, boolean>;
  // Loading state
  loading: boolean;
  // Error state
  error: string | null;
  // Last fetch timestamp
  lastFetch: number;
}

// Global cache
let permissionCache: {
  orgId: string;
  role: string;
  map: Map<string, boolean>;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30000; // 30 seconds

/**
 * Invalidate the permission cache
 */
export const invalidateEffectivePermissions = () => {
  permissionCache = null;
  console.log('[EffectivePermissions] Cache invalidated');
};

/**
 * Normalize a module name to its canonical form
 */
export const normalizeModuleName = (moduleName: string): string => {
  return DB_TO_CANONICAL[moduleName] || moduleName;
};

/**
 * Get all possible database keys for a canonical module name
 */
export const getModuleAliases = (canonicalName: string): string[] => {
  return MODULE_NAME_ALIASES[canonicalName] || [canonicalName];
};

/**
 * Extract module name from sidebar permission key
 * Input: "main.invoices" or "business.customers" or "hr.employees"
 * Output: "invoices" or "customers" or "employees"
 */
export const extractModuleFromSidebarKey = (sidebarKey: string): string => {
  const parts = sidebarKey.split('.');
  return parts[parts.length - 1]; // Get last part
};

export function useEffectivePermissions() {
  const { user, isSuperAdmin } = useAuth();
  const { organization, orgRole, isOrgOwner, loading: orgLoading } = useOrganization();

  const [permissionMap, setPermissionMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState(0);
  const isMountedRef = useRef(true);

  /**
   * Fetch and normalize effective permissions:
   * - role permissions (org_role_permissions)
   * - overridden by org-specific permissions (org_specific_permissions)
   */
  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    // Skip if no org or still loading org context
    if (!organization?.id || orgLoading) {
      return new Map<string, boolean>();
    }

    // Bypass for Super Admin and Owner - they have all permissions
    if (isSuperAdmin || isOrgOwner) {
      const allPermsMap = new Map<string, boolean>();
      Object.keys(MODULE_NAME_ALIASES).forEach(moduleName => {
        PERMISSION_ACTIONS.forEach(action => {
          allPermsMap.set(`${moduleName}.${action}`, true);
        });
      });
      setPermissionMap(allPermsMap);
      setLoading(false);
      console.log('[EffectivePermissions] Super Admin/Owner bypass - all permissions enabled');
      return allPermsMap;
    }

    // Check cache
    if (
      !forceRefresh &&
      permissionCache?.orgId === organization.id &&
      permissionCache?.role === orgRole &&
      Date.now() - permissionCache.timestamp < CACHE_DURATION
    ) {
      setPermissionMap(permissionCache.map);
      setLoading(false);
      return permissionCache.map;
    }

    if (!orgRole) {
      setPermissionMap(new Map());
      setLoading(false);
      return new Map<string, boolean>();
    }

    try {
      console.log(`[EffectivePermissions] Fetching effective permissions for org: ${organization.id}, role: ${orgRole}`);

      const [globalRes, orgRes] = await Promise.all([
        supabase
          .from('org_role_permissions')
          .select('permission_key, is_enabled')
          .eq('role', orgRole),
        supabase
          .from('org_specific_permissions')
          .select('permission_key, is_enabled')
          .eq('organization_id', organization.id)
          .eq('role', orgRole),
      ]);

      if (globalRes.error) throw globalRes.error;
      if (orgRes.error) throw orgRes.error;

      const normalizedMap = new Map<string, boolean>();

      // 1) Global role permissions first
      (globalRes.data || []).forEach((perm) => {
        const [moduleRaw, action] = perm.permission_key.split('.');
        if (!moduleRaw || !action) return;

        const canonicalModule = normalizeModuleName(moduleRaw);
        normalizedMap.set(`${canonicalModule}.${action}`, perm.is_enabled);
        normalizedMap.set(perm.permission_key, perm.is_enabled);
      });

      // 2) Org-specific overrides overwrite global
      (orgRes.data || []).forEach((perm) => {
        const [moduleRaw, action] = perm.permission_key.split('.');
        if (!moduleRaw || !action) return;

        const canonicalModule = normalizeModuleName(moduleRaw);
        normalizedMap.set(`${canonicalModule}.${action}`, perm.is_enabled);
        normalizedMap.set(perm.permission_key, perm.is_enabled);
      });

      // Update cache
      permissionCache = {
        orgId: organization.id,
        role: orgRole,
        map: normalizedMap,
        timestamp: Date.now(),
      };

      if (isMountedRef.current) {
        setPermissionMap(normalizedMap);
        setLastFetch(Date.now());
        setError(null);
        setLoading(false);
      }

      console.log(
        `[EffectivePermissions] Loaded effective permissions: global=${globalRes.data?.length || 0}, overrides=${orgRes.data?.length || 0}`
      );

      return normalizedMap;
    } catch (err) {
      console.error('[EffectivePermissions] Error fetching:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        setLoading(false);
      }
      return new Map<string, boolean>();
    }
  }, [organization?.id, orgRole, isSuperAdmin, isOrgOwner, orgLoading]);

  // Initial fetch and refetch on org/role change
  useEffect(() => {
    isMountedRef.current = true;

    if (!orgLoading) {
      fetchPermissions();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPermissions, orgLoading]);

  /**
   * Check if user has a specific permission
   * @param permissionKey - Full key (e.g., "invoices.view")
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
    // Bypass for privileged users
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    return permissionMap.get(permissionKey) === true;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Check if user has ANY permission for a sidebar module
   * This is the key function for sidebar visibility
   *
   * @param sidebarKey - Sidebar permission key (e.g., "main.invoices", "business.customers")
   */
  const hasModuleAccess = useCallback((sidebarKey: string): boolean => {
    // Bypass for privileged users
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    // Extract module name from sidebar key
    const moduleName = extractModuleFromSidebarKey(sidebarKey);
    const canonicalName = normalizeModuleName(moduleName);

    // Get all possible database aliases for this module
    const aliases = getModuleAliases(canonicalName);

    // Check if ANY action is enabled for ANY alias
    for (const alias of aliases) {
      for (const action of PERMISSION_ACTIONS) {
        const key = `${alias}.${action}`;
        if (permissionMap.get(key) === true) {
          return true;
        }
      }
    }

    // Also check canonical form
    for (const action of PERMISSION_ACTIONS) {
      const key = `${canonicalName}.${action}`;
      if (permissionMap.get(key) === true) {
        return true;
      }
    }

    return false;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Check if user has at least one permission anywhere (for dashboard access)
   */
  const hasAnyPermission = useMemo((): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    // Check if any permission is enabled
    for (const enabled of permissionMap.values()) {
      if (enabled) return true;
    }
    return false;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Get all enabled modules (for debugging)
   */
  const getEnabledModules = useCallback((): string[] => {
    const modules = new Set<string>();

    permissionMap.forEach((enabled, key) => {
      if (enabled) {
        const [moduleName] = key.split('.');
        if (moduleName) {
          modules.add(normalizeModuleName(moduleName));
        }
      }
    });

    return Array.from(modules);
  }, [permissionMap]);

  /**
   * Force refresh permissions
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[EffectivePermissions] Force refreshing...');
    invalidateEffectivePermissions();
    return fetchPermissions(true);
  }, [fetchPermissions]);

  /**
   * Debug: Log current permission state
   */
  const debugPermissions = useCallback(() => {
    console.log('=== EFFECTIVE PERMISSIONS DEBUG ===');
    console.log('User ID:', user?.id);
    console.log('Org ID:', organization?.id);
    console.log('Org Role:', orgRole);
    console.log('Is Super Admin:', isSuperAdmin);
    console.log('Is Org Owner:', isOrgOwner);
    console.log('Loading:', loading);
    console.log('Permission Map Size:', permissionMap.size);
    console.log('Enabled Modules:', getEnabledModules());
    console.log('Has Any Permission:', hasAnyPermission);
    console.log('=== END DEBUG ===');
  }, [user?.id, organization?.id, orgRole, isSuperAdmin, isOrgOwner, loading, permissionMap.size, getEnabledModules, hasAnyPermission]);

  return {
    // Core permission checks
    hasPermission,
    hasModuleAccess,
    hasAnyPermission,

    // Raw data
    permissionMap,

    // State
    loading: loading || orgLoading,
    error,
    lastFetch,

    // Actions
    refreshPermissions,

    // Debug
    getEnabledModules,
    debugPermissions,

    // Context info
    orgRole,
    organizationId: organization?.id,
    isOrgOwner,
    isSuperAdmin,
  };

  /**
   * Check if user has at least one permission anywhere (for dashboard access)
   */
  const hasAnyPermission = useMemo((): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    // Check if any permission is enabled
    for (const enabled of permissionMap.values()) {
      if (enabled) return true;
    }
    return false;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Get all enabled modules (for debugging)
   */
  const getEnabledModules = useCallback((): string[] => {
    const modules = new Set<string>();
    
    permissionMap.forEach((enabled, key) => {
      if (enabled) {
        const [moduleName] = key.split('.');
        if (moduleName) {
          modules.add(normalizeModuleName(moduleName));
        }
      }
    });
    
    return Array.from(modules);
  }, [permissionMap]);

  /**
   * Force refresh permissions
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[EffectivePermissions] Force refreshing...');
    invalidateEffectivePermissions();
    return fetchPermissions(true);
  }, [fetchPermissions]);

  /**
   * Debug: Log current permission state
   */
  const debugPermissions = useCallback(() => {
    console.log('=== EFFECTIVE PERMISSIONS DEBUG ===');
    console.log('User ID:', user?.id);
    console.log('Org ID:', organization?.id);
    console.log('Org Role:', orgRole);
    console.log('Is Super Admin:', isSuperAdmin);
    console.log('Is Org Owner:', isOrgOwner);
    console.log('Loading:', loading);
    console.log('Permission Map Size:', permissionMap.size);
    console.log('Enabled Modules:', getEnabledModules());
    console.log('Has Any Permission:', hasAnyPermission);
    console.log('=== END DEBUG ===');
  }, [user?.id, organization?.id, orgRole, isSuperAdmin, isOrgOwner, loading, permissionMap.size, getEnabledModules, hasAnyPermission]);

  return {
    // Core permission checks
    hasPermission,
    hasModuleAccess,
    hasAnyPermission,
    
    // Raw data
    permissionMap,
    
    // State
    loading: loading || orgLoading,
    error,
    lastFetch,
    
    // Actions
    refreshPermissions,
    
    // Debug
    getEnabledModules,
    debugPermissions,
    
    // Context info
    orgRole,
    organizationId: organization?.id,
    isOrgOwner,
    isSuperAdmin,
  };
}

export default useEffectivePermissions;
