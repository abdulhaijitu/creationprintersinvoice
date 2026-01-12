/**
 * Module Permissions Hook
 * 
 * Provides module-based permission checking for the application.
 * This is the SINGLE SOURCE OF TRUTH for permission checks.
 * 
 * PERMISSION KEY FORMAT: "moduleName.action"
 * Examples: "customers.view", "invoices.create", "expenses.edit", "vendors.delete"
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

// Permission actions
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

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

/**
 * Build permission key from module and action
 * Input: moduleKey (e.g., "main.dashboard" or "business.customers"), action (e.g., "view")
 * Output: "dashboard.view" or "customers.view"
 */
export const buildPermissionKey = (moduleKey: string, action: PermissionAction): string => {
  const moduleName = moduleKey.split('.')[1] || moduleKey;
  return `${moduleName}.${action}`;
};

/**
 * Extract module name from full module key
 * Input: "main.dashboard" or "business.customers"
 * Output: "dashboard" or "customers"
 */
export const extractModuleName = (moduleKey: string): string => {
  return moduleKey.split('.')[1] || moduleKey;
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
   * Check if user has a specific permission
   * 
   * @param permissionKey - Full permission key (e.g., "customers.view", "invoices.create")
   * @returns boolean - true if user has permission
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
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

    // Default: no explicit permission = no access
    return false;
  }, [isSuperAdmin, isOrgOwner, orgRole, permissions]);

  /**
   * Check if user can view a module (has view permission)
   * 
   * @param moduleKey - Full module key (e.g., "main.dashboard", "business.customers")
   *                    or short module name (e.g., "customers", "invoices")
   */
  const canView = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    return hasPermission(`${moduleName}.view`);
  }, [hasPermission]);

  /**
   * Check if user can create in a module
   */
  const canCreate = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    return hasPermission(`${moduleName}.create`);
  }, [hasPermission]);

  /**
   * Check if user can edit in a module
   */
  const canEdit = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    return hasPermission(`${moduleName}.edit`);
  }, [hasPermission]);

  /**
   * Check if user can delete in a module
   */
  const canDelete = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    return hasPermission(`${moduleName}.delete`);
  }, [hasPermission]);

  /**
   * Check if user has any permission for a module
   */
  const hasAnyModuleAccess = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    return PERMISSION_ACTIONS.some(action => 
      hasPermission(`${moduleName}.${action}`)
    );
  }, [hasPermission]);

  /**
   * Legacy compatibility: Check if user has module permission
   * Maps to view permission for backward compatibility
   */
  const hasModulePermission = useCallback((permissionKey: string): boolean => {
    // If it already has an action, check directly
    if (permissionKey.includes('.view') || 
        permissionKey.includes('.create') || 
        permissionKey.includes('.edit') || 
        permissionKey.includes('.delete')) {
      return hasPermission(permissionKey);
    }
    // Otherwise, check for view permission
    return canView(permissionKey);
  }, [hasPermission, canView]);

  /**
   * Check if user has at least one permission (for dashboard access)
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
   * Get all enabled permission keys for current user
   */
  const enabledPermissions = useMemo((): string[] => {
    if (isSuperAdmin || isOrgOwner) {
      // Return all possible permissions
      const allPerms: string[] = [];
      for (const mod of ALL_MODULE_PERMISSIONS) {
        const moduleName = extractModuleName(mod.key);
        for (const action of PERMISSION_ACTIONS) {
          allPerms.push(`${moduleName}.${action}`);
        }
      }
      return allPerms;
    }
    
    if (!orgRole) return [];

    return permissions
      .filter(p => p.role === orgRole && p.is_enabled)
      .map(p => p.permission_key);
  }, [isSuperAdmin, isOrgOwner, orgRole, permissions]);

  /**
   * Get enabled modules (that user can at least view)
   */
  const enabledModules = useMemo((): string[] => {
    if (isSuperAdmin || isOrgOwner) {
      return ALL_MODULE_PERMISSIONS.map(p => p.key);
    }
    
    if (!orgRole) return [];

    const modules = new Set<string>();
    permissions
      .filter(p => p.role === orgRole && p.is_enabled && p.permission_key.endsWith('.view'))
      .forEach(p => {
        const moduleName = p.permission_key.replace('.view', '');
        // Find the full module key
        const fullModule = ALL_MODULE_PERMISSIONS.find(m => extractModuleName(m.key) === moduleName);
        if (fullModule) {
          modules.add(fullModule.key);
        }
      });

    return Array.from(modules);
  }, [isSuperAdmin, isOrgOwner, orgRole, permissions]);

  /**
   * Get permissions grouped by category for the current role
   */
  const getPermissionsByCategory = useCallback((): Record<PermissionCategory, { 
    key: string; 
    label: string; 
    permissions: Record<PermissionAction, boolean>;
  }[]> => {
    const result: Record<PermissionCategory, { key: string; label: string; permissions: Record<PermissionAction, boolean> }[]> = {
      main: [],
      business: [],
      hr_ops: [],
      system: [],
    };

    for (const [category, modules] of Object.entries(PERMISSIONS_BY_CATEGORY)) {
      result[category as PermissionCategory] = modules.map(mod => {
        const moduleName = extractModuleName(mod.key);
        return {
          key: mod.key,
          label: mod.label,
          permissions: {
            view: hasPermission(`${moduleName}.view`),
            create: hasPermission(`${moduleName}.create`),
            edit: hasPermission(`${moduleName}.edit`),
            delete: hasPermission(`${moduleName}.delete`),
          },
        };
      });
    }

    return result;
  }, [hasPermission]);

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
    hasPermission,
    hasModulePermission, // Legacy compatibility
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAnyModuleAccess,
    hasAnyModulePermission,
    
    // Permission data
    permissions,
    enabledPermissions,
    enabledModules,
    getPermissionsByCategory,
    
    // State
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
