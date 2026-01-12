import { useState, useEffect, useCallback, useMemo } from 'react';
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

// Cache for global role permissions
let globalPermissionCache: OrgRolePermission[] | null = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

// Cache for org-specific permissions per org
const orgPermissionCache = new Map<string, {
  permissions: OrgSpecificPermission[];
  timestamp: number;
}>();

export const useOrgRolePermissions = () => {
  const { orgRole, organization } = useOrganization();
  const [globalPermissions, setGlobalPermissions] = useState<OrgRolePermission[]>([]);
  const [orgPermissions, setOrgPermissions] = useState<OrgSpecificPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch global role permissions
  const fetchGlobalPermissions = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && globalPermissionCache && Date.now() - globalCacheTimestamp < CACHE_DURATION) {
      setGlobalPermissions(globalPermissionCache);
      return globalPermissionCache;
    }

    try {
      const { data, error } = await supabase
        .from('org_role_permissions')
        .select('role, permission_key, is_enabled, is_protected');

      if (error) throw error;

      globalPermissionCache = data || [];
      globalCacheTimestamp = Date.now();
      setGlobalPermissions(globalPermissionCache);
      return globalPermissionCache;
    } catch (error) {
      console.error('Error fetching global role permissions:', error);
      return [];
    }
  }, []);

  // Fetch org-specific permission overrides
  const fetchOrgPermissions = useCallback(async (forceRefresh = false) => {
    if (!organization?.id) return [];

    const cached = orgPermissionCache.get(organization.id);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOrgPermissions(cached.permissions);
      return cached.permissions;
    }

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
      setOrgPermissions(perms);
      return perms;
    } catch (error) {
      console.error('Error fetching org-specific permissions:', error);
      return [];
    }
  }, [organization?.id]);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchGlobalPermissions(), fetchOrgPermissions()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchGlobalPermissions, fetchOrgPermissions]);

  /**
   * Check if user has a specific permission
   * Checks org-specific override first, then falls back to global role permissions
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (!orgRole) return false;
    
    // Owner always has all permissions
    if (orgRole === 'owner') return true;

    // Check org-specific override first
    const orgOverride = orgPermissions.find(
      p => p.role === orgRole && p.permission_key === permissionKey
    );
    if (orgOverride) {
      return orgOverride.is_enabled;
    }

    // Fall back to global role permission
    const globalPerm = globalPermissions.find(
      p => p.role === orgRole && p.permission_key === permissionKey
    );
    return globalPerm?.is_enabled ?? false;
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
   * Force refresh permissions from database
   */
  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchGlobalPermissions(true),
      fetchOrgPermissions(true),
    ]);
    setLoading(false);
  }, [fetchGlobalPermissions, fetchOrgPermissions]);

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
  };
};

/**
 * Utility function for non-hook contexts
 * Checks permission directly against the database
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
