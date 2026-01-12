/**
 * Module Permissions Hook
 * 
 * Provides module-based permission checking for the application.
 * This hook wraps useEffectivePermissions to maintain backward compatibility.
 * 
 * PERMISSION KEY FORMAT: "moduleName.action"
 * Examples: "customers.view", "invoices.create", "expenses.edit", "vendors.delete"
 * 
 * CRITICAL RULES:
 * - Super Admin always has all permissions (locked ON)
 * - Owner role always has all permissions (locked ON)
 * - Other roles check org_specific_permissions table via useEffectivePermissions
 * - Permissions are loaded from database, NOT hardcoded
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ALL_MODULE_PERMISSIONS, PERMISSIONS_BY_CATEGORY, type PermissionCategory } from '@/lib/permissions/modulePermissions';
import { 
  useEffectivePermissions, 
  invalidateEffectivePermissions,
  normalizeModuleName,
  extractModuleFromSidebarKey,
} from './useEffectivePermissions';

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

// Re-export cache invalidation for backward compatibility
export const invalidateModulePermissionCache = invalidateEffectivePermissions;

/**
 * Build permission key from module and action
 * Input: moduleKey (e.g., "main.dashboard" or "business.customers"), action (e.g., "view")
 * Output: "dashboard.view" or "customers.view"
 */
export const buildPermissionKey = (moduleKey: string, action: PermissionAction): string => {
  const moduleName = extractModuleFromSidebarKey(moduleKey);
  return `${moduleName}.${action}`;
};

/**
 * Extract module name from full module key
 * Input: "main.dashboard" or "business.customers"
 * Output: "dashboard" or "customers"
 */
export const extractModuleName = (moduleKey: string): string => {
  return extractModuleFromSidebarKey(moduleKey);
};

export function useModulePermissions() {
  const { isSuperAdmin } = useAuth();
  const { orgRole, organization, isOrgOwner } = useOrganization();
  
  // Use the effective permissions hook as the source of truth
  const effectivePerms = useEffectivePermissions();
  
  const [permissions, setPermissions] = useState<OrgModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Sync loading state with effective permissions
  useEffect(() => {
    setLoading(effectivePerms.loading);
  }, [effectivePerms.loading]);

  /**
   * Fetch permissions from database (legacy - now uses effectivePerms internally)
   */
  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    if (!organization?.id) {
      setPermissions([]);
      setLoading(false);
      return [];
    }

    try {
      console.log(`[ModulePermissions] Fetching permissions for org: ${organization.id}`);
      const { data, error: fetchError } = await supabase
        .from('org_specific_permissions')
        .select('id, organization_id, role, permission_key, is_enabled')
        .eq('organization_id', organization.id);

      if (fetchError) throw fetchError;

      const perms = data || [];

      if (isMountedRef.current) {
        setPermissions(perms);
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
   * Uses the effective permissions hook
   * 
   * @param permissionKey - Full permission key (e.g., "customers.view", "invoices.create")
   * @returns boolean - true if user has permission
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
    return effectivePerms.hasPermission(permissionKey);
  }, [effectivePerms]);

  /**
   * Check if user can view a module (has view permission)
   * 
   * @param moduleKey - Full module key (e.g., "main.dashboard", "business.customers")
   *                    or short module name (e.g., "customers", "invoices")
   */
  const canView = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    const normalizedModule = normalizeModuleName(moduleName);
    return effectivePerms.hasPermission(`${normalizedModule}.view`);
  }, [effectivePerms]);

  /**
   * Check if user can create in a module
   */
  const canCreate = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    const normalizedModule = normalizeModuleName(moduleName);
    return effectivePerms.hasPermission(`${normalizedModule}.create`);
  }, [effectivePerms]);

  /**
   * Check if user can edit in a module
   */
  const canEdit = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    const normalizedModule = normalizeModuleName(moduleName);
    return effectivePerms.hasPermission(`${normalizedModule}.edit`);
  }, [effectivePerms]);

  /**
   * Check if user can delete in a module
   */
  const canDelete = useCallback((moduleKey: string): boolean => {
    const moduleName = extractModuleName(moduleKey);
    const normalizedModule = normalizeModuleName(moduleName);
    return effectivePerms.hasPermission(`${normalizedModule}.delete`);
  }, [effectivePerms]);

  /**
   * Check if user has any permission for a module
   * Uses the effective permissions hook's hasModuleAccess
   */
  const hasAnyModuleAccess = useCallback((moduleKey: string): boolean => {
    return effectivePerms.hasModuleAccess(moduleKey);
  }, [effectivePerms]);

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
  const hasAnyModulePermission = effectivePerms.hasAnyPermission;

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
    return effectivePerms.getEnabledModules().map(m => {
      // Find the full module key
      const fullModule = ALL_MODULE_PERMISSIONS.find(p => extractModuleName(p.key) === m);
      return fullModule?.key || m;
    });
  }, [effectivePerms]);

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
        const normalizedModule = normalizeModuleName(moduleName);
        return {
          key: mod.key,
          label: mod.label,
          permissions: {
            view: effectivePerms.hasPermission(`${normalizedModule}.view`),
            create: effectivePerms.hasPermission(`${normalizedModule}.create`),
            edit: effectivePerms.hasPermission(`${normalizedModule}.edit`),
            delete: effectivePerms.hasPermission(`${normalizedModule}.delete`),
          },
        };
      });
    }

    return result;
  }, [effectivePerms]);

  /**
   * Force refresh permissions from database
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[ModulePermissions] Force refreshing...');
    invalidateModulePermissionCache();
    await effectivePerms.refreshPermissions();
    return fetchPermissions(true);
  }, [fetchPermissions, effectivePerms]);

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
