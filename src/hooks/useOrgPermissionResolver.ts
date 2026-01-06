import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface GlobalPermission {
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

interface OrgSpecificPermission {
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

interface OrgPermissionSettings {
  use_global_permissions: boolean;
}

// Cache for permissions
let globalPermissionCache: GlobalPermission[] | null = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

export const useOrgPermissionResolver = () => {
  const { organization, orgRole } = useOrganization();
  const organizationId = organization?.id;

  const [globalPermissions, setGlobalPermissions] = useState<GlobalPermission[]>([]);
  const [orgPermissions, setOrgPermissions] = useState<OrgSpecificPermission[]>([]);
  const [settings, setSettings] = useState<OrgPermissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch global permissions (with cache)
      if (!globalPermissionCache || Date.now() - globalCacheTimestamp > CACHE_DURATION) {
        const { data: globalData } = await supabase
          .from('org_role_permissions')
          .select('role, permission_key, is_enabled');

        globalPermissionCache = globalData || [];
        globalCacheTimestamp = Date.now();
      }
      setGlobalPermissions(globalPermissionCache);

      // Fetch org-specific permissions
      const { data: orgData } = await supabase
        .from('org_specific_permissions')
        .select('role, permission_key, is_enabled')
        .eq('organization_id', organizationId);

      setOrgPermissions(orgData || []);

      // Fetch org permission settings
      const { data: settingsData } = await supabase
        .from('org_permission_settings')
        .select('use_global_permissions')
        .eq('organization_id', organizationId)
        .maybeSingle();

      setSettings(settingsData);
      setHasCustomPermissions(settingsData?.use_global_permissions === false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Resolves whether a permission is enabled for a given role.
   * Falls back to global if no org override exists.
   */
  const hasPermission = useCallback(
    (permissionKey: string, role?: string): boolean => {
      const checkRole = role || orgRole;
      if (!checkRole) return false;

      // If using global permissions (default)
      const useGlobal = settings?.use_global_permissions ?? true;

      if (useGlobal) {
        const globalPerm = globalPermissions.find(
          (p) => p.role === checkRole && p.permission_key === permissionKey
        );
        return globalPerm?.is_enabled ?? false;
      }

      // Check org-specific override first
      const orgPerm = orgPermissions.find(
        (p) => p.role === checkRole && p.permission_key === permissionKey
      );

      if (orgPerm) {
        return orgPerm.is_enabled;
      }

      // Fallback to global
      const globalPerm = globalPermissions.find(
        (p) => p.role === checkRole && p.permission_key === permissionKey
      );
      return globalPerm?.is_enabled ?? false;
    },
    [globalPermissions, orgPermissions, settings, orgRole]
  );

  /**
   * Check multiple permissions - returns true if ANY are enabled
   */
  const hasAnyPermission = useCallback(
    (permissionKeys: string[], role?: string): boolean => {
      return permissionKeys.some((key) => hasPermission(key, role));
    },
    [hasPermission]
  );

  /**
   * Check multiple permissions - returns true if ALL are enabled
   */
  const hasAllPermissions = useCallback(
    (permissionKeys: string[], role?: string): boolean => {
      return permissionKeys.every((key) => hasPermission(key, role));
    },
    [hasPermission]
  );

  /**
   * Refresh permissions from the database
   */
  const refreshPermissions = useCallback(async () => {
    globalPermissionCache = null; // Force refresh global cache
    await fetchPermissions();
  }, [fetchPermissions]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasCustomPermissions,
    loading,
    orgRole,
    refreshPermissions,
  };
};

/**
 * Utility function for non-hook contexts (edge functions, etc.)
 * Resolves permission considering org-specific overrides
 */
export const resolveOrgPermission = async (
  organizationId: string,
  role: string,
  permissionKey: string
): Promise<boolean> => {
  try {
    // Check if org uses custom permissions
    const { data: settings } = await supabase
      .from('org_permission_settings')
      .select('use_global_permissions')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const useGlobal = settings?.use_global_permissions ?? true;

    if (!useGlobal) {
      // Check org-specific override
      const { data: orgPerm } = await supabase
        .from('org_specific_permissions')
        .select('is_enabled')
        .eq('organization_id', organizationId)
        .eq('role', role)
        .eq('permission_key', permissionKey)
        .maybeSingle();

      if (orgPerm) {
        return orgPerm.is_enabled;
      }
    }

    // Fallback to global
    const { data: globalPerm } = await supabase
      .from('org_role_permissions')
      .select('is_enabled')
      .eq('role', role)
      .eq('permission_key', permissionKey)
      .maybeSingle();

    return globalPerm?.is_enabled ?? false;
  } catch (error) {
    console.error('Error resolving permission:', error);
    return false;
  }
};
