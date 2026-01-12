/**
 * Module Permissions Hook
 * 
 * Provides module-based permission checking for the application.
 * This is the SINGLE SOURCE OF TRUTH for permission checks.
 * 
 * CRITICAL RULES:
 * - Super Admin always has all permissions (locked ON)
 * - Owner role always has all permissions (locked ON)
 * - Other roles check org_specific_permissions table
 * - Permissions are loaded from database, NOT hardcoded
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ALL_MODULE_PERMISSIONS, PERMISSIONS_BY_CATEGORY, type PermissionCategory } from '@/lib/permissions/modulePermissions';

interface OrgModulePermission {
  id: string;
  organization_id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

// Cache configuration
const CACHE_DURATION = 30000; // 30 seconds

// Module-level cache
let permissionCache: {
  orgId: string;
  permissions: OrgModulePermission[];
  timestamp: number;
} | null = null;

/**
 * Invalidate the permission cache
 */
export const invalidateModulePermissionCache = (organizationId?: string) => {
  if (organizationId && permissionCache?.orgId === organizationId) {
    permissionCache = null;
  } else if (!organizationId) {
    permissionCache = null;
  }
  console.log('[ModulePermissions] Cache invalidated');
};

export function useModulePermissions() {
  const { isSuperAdmin } = useAuth();
  const { orgRole, organization, isOrgOwner } = useOrganization();
  
  const [permissions, setPermissions] = useState<OrgModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);

  /**
   * Fetch permissions from database
   */
  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    if (!organization?.id) {
      setPermissions([]);
      setLoading(false);
      return [];
    }

    // Check cache
    if (
      !forceRefresh &&
      permissionCache?.orgId === organization.id &&
      Date.now() - permissionCache.timestamp < CACHE_DURATION
    ) {
      setPermissions(permissionCache.permissions);
      setLoading(false);
      return permissionCache.permissions;
    }

    try {
      console.log(`[ModulePermissions] Fetching permissions for org: ${organization.id}`);
      const { data, error: fetchError } = await supabase
        .from('org_specific_permissions')
        .select('id, organization_id, role, permission_key, is_enabled')
        .eq('organization_id', organization.id);

      if (fetchError) throw fetchError;

      const perms = data || [];
      
      // Update cache
      permissionCache = {
        orgId: organization.id,
        permissions: perms,
        timestamp: Date.now(),
      };

      if (isMountedRef.current) {
        setPermissions(perms);
        lastFetchRef.current = Date.now();
        setError(null);
      }
      
      console.log(`[ModulePermissions] Loaded ${perms.length} permissions`);
      return perms;
    } catch (err) {
      console.error('[ModulePermissions] Error fetching permissions:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organization?.id]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchPermissions();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPermissions]);

  /**
   * Check if user has a specific module permission
   * 
   * @param permissionKey - The module permission key (e.g., "main.dashboard", "business.customers")
   * @returns boolean - true if user has permission, false otherwise
   */
  const hasModulePermission = useCallback((permissionKey: string): boolean => {
    // Super Admin always has all permissions
    if (isSuperAdmin) return true;
    
    // Owner always has all permissions
    if (isOrgOwner) return true;
    
    // No role means no permission
    if (!orgRole) return false;

    // Check org-specific permission from database
    const orgPerm = permissions.find(
      p => p.role === orgRole && p.permission_key === permissionKey
    );

    // If we have an explicit override, use it
    if (orgPerm !== undefined) {
      return orgPerm.is_enabled;
    }

    // Default: if no explicit permission, check if the module exists
    // and grant access based on role defaults
    // For now, if no explicit permission is set, we default to false for safety
    // This means permissions MUST be explicitly granted
    return false;
  }, [isSuperAdmin, isOrgOwner, orgRole, permissions]);

  /**
   * Check if user has at least one module permission (for dashboard access)
   */
  const hasAnyModulePermission = useMemo((): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    // Check if user has at least one enabled permission
    return permissions.some(
      p => p.role === orgRole && p.is_enabled
    );
  }, [isSuperAdmin, isOrgOwner, orgRole, permissions]);

  /**
   * Get all enabled modules for current user
   */
  const enabledModules = useMemo((): string[] => {
    if (isSuperAdmin || isOrgOwner) {
      return ALL_MODULE_PERMISSIONS.map(p => p.key);
    }
    
    if (!orgRole) return [];

    return permissions
      .filter(p => p.role === orgRole && p.is_enabled)
      .map(p => p.permission_key);
  }, [isSuperAdmin, isOrgOwner, orgRole, permissions]);

  /**
   * Get permissions grouped by category for the current role
   */
  const getPermissionsByCategory = useCallback((): Record<PermissionCategory, { key: string; label: string; enabled: boolean }[]> => {
    const result: Record<PermissionCategory, { key: string; label: string; enabled: boolean }[]> = {
      main: [],
      business: [],
      hr_ops: [],
      system: [],
    };

    for (const [category, modules] of Object.entries(PERMISSIONS_BY_CATEGORY)) {
      result[category as PermissionCategory] = modules.map(mod => ({
        key: mod.key,
        label: mod.label,
        enabled: hasModulePermission(mod.key),
      }));
    }

    return result;
  }, [hasModulePermission]);

  /**
   * Force refresh permissions from database
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[ModulePermissions] Force refreshing...');
    invalidateModulePermissionCache(organization?.id);
    return fetchPermissions(true);
  }, [fetchPermissions, organization?.id]);

  return {
    // Permission checks
    hasModulePermission,
    hasAnyModulePermission,
    enabledModules,
    getPermissionsByCategory,
    
    // State
    permissions,
    loading,
    error,
    
    // Actions
    refreshPermissions,
    
    // Context info
    orgRole,
    organizationId: organization?.id,
    isOrgOwner,
    isSuperAdmin,
  };
}

export default useModulePermissions;
