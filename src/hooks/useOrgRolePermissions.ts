import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface OrgRolePermission {
  role: string;
  permission_key: string;
  is_enabled: boolean;
  is_protected: boolean;
}

// Cache for permissions to avoid repeated fetches
let permissionCache: OrgRolePermission[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

export const useOrgRolePermissions = () => {
  const { orgRole } = useOrganization();
  const [permissions, setPermissions] = useState<OrgRolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    // Use cache if valid
    if (!forceRefresh && permissionCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setPermissions(permissionCache);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('org_role_permissions')
        .select('role, permission_key, is_enabled, is_protected');

      if (error) throw error;

      permissionCache = data || [];
      cacheTimestamp = Date.now();
      setPermissions(permissionCache);
    } catch (error) {
      console.error('Error fetching org role permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (!orgRole) return false;
    
    const perm = permissions.find(
      p => p.role === orgRole && p.permission_key === permissionKey
    );
    
    return perm?.is_enabled ?? false;
  }, [permissions, orgRole]);

  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.every(key => hasPermission(key));
  }, [hasPermission]);

  const getPermissionsForRole = useCallback((role: string): OrgRolePermission[] => {
    return permissions.filter(p => p.role === role);
  }, [permissions]);

  const refreshPermissions = useCallback(() => {
    return fetchPermissions(true);
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsForRole,
    refreshPermissions,
    orgRole,
  };
};

// Utility function for non-hook contexts
export const checkOrgRolePermission = async (
  role: string,
  permissionKey: string
): Promise<boolean> => {
  try {
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
