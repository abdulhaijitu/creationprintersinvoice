import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface GlobalPermission {
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

interface PlanPreset {
  plan_name: string;
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
  override_plan_permissions: boolean;
}

// Cache for permissions
let globalPermissionCache: GlobalPermission[] | null = null;
let planPresetCache: PlanPreset[] | null = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

export const useOrgPermissionResolver = () => {
  const { organization, orgRole, subscription } = useOrganization();
  const organizationId = organization?.id;
  const subscriptionPlan = subscription?.plan || 'free';

  const [globalPermissions, setGlobalPermissions] = useState<GlobalPermission[]>([]);
  const [planPresets, setPlanPresets] = useState<PlanPreset[]>([]);
  const [orgPermissions, setOrgPermissions] = useState<OrgSpecificPermission[]>([]);
  const [settings, setSettings] = useState<OrgPermissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);
  const [usesPlanPresets, setUsesPlanPresets] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch global permissions and plan presets (with cache)
      if (!globalPermissionCache || !planPresetCache || Date.now() - globalCacheTimestamp > CACHE_DURATION) {
        const [globalRes, planRes] = await Promise.all([
          supabase.from('org_role_permissions').select('role, permission_key, is_enabled'),
          supabase.from('plan_permission_presets').select('plan_name, role, permission_key, is_enabled'),
        ]);

        globalPermissionCache = globalRes.data || [];
        planPresetCache = planRes.data || [];
        globalCacheTimestamp = Date.now();
      }
      setGlobalPermissions(globalPermissionCache);
      setPlanPresets(planPresetCache);

      // Fetch org-specific permissions
      const { data: orgData } = await supabase
        .from('org_specific_permissions')
        .select('role, permission_key, is_enabled')
        .eq('organization_id', organizationId);

      setOrgPermissions(orgData || []);

      // Fetch org permission settings
      const { data: settingsData } = await supabase
        .from('org_permission_settings')
        .select('use_global_permissions, override_plan_permissions')
        .eq('organization_id', organizationId)
        .maybeSingle();

      setSettings(settingsData);
      setHasCustomPermissions(settingsData?.use_global_permissions === false || settingsData?.override_plan_permissions === true);
      setUsesPlanPresets(!(settingsData?.override_plan_permissions === true));
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
   * Resolution order (highest priority first):
   * 1. Organization-specific override
   * 2. Plan preset (if not overriding plan)
   * 3. Global default
   */
  const hasPermission = useCallback(
    (permissionKey: string, role?: string): boolean => {
      const checkRole = role || orgRole;
      if (!checkRole) return false;

      const useGlobal = settings?.use_global_permissions ?? true;
      const overridePlan = settings?.override_plan_permissions ?? false;

      // If using custom org permissions (not global)
      if (!useGlobal) {
        // Check org-specific override first
        const orgPerm = orgPermissions.find(
          (p) => p.role === checkRole && p.permission_key === permissionKey
        );

        if (orgPerm) {
          return orgPerm.is_enabled;
        }
      }

      // If not overriding plan, check plan preset
      if (!overridePlan) {
        const planPerm = planPresets.find(
          (p) => p.plan_name === subscriptionPlan && p.role === checkRole && p.permission_key === permissionKey
        );

        if (planPerm) {
          return planPerm.is_enabled;
        }
      }

      // Fallback to global
      const globalPerm = globalPermissions.find(
        (p) => p.role === checkRole && p.permission_key === permissionKey
      );
      return globalPerm?.is_enabled ?? false;
    },
    [globalPermissions, planPresets, orgPermissions, settings, orgRole, subscriptionPlan]
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
    globalPermissionCache = null;
    planPresetCache = null;
    await fetchPermissions();
  }, [fetchPermissions]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasCustomPermissions,
    usesPlanPresets,
    loading,
    orgRole,
    subscriptionPlan,
    refreshPermissions,
  };
};

/**
 * Utility function for non-hook contexts (edge functions, etc.)
 * Resolves permission considering org-specific overrides and plan presets
 */
export const resolveOrgPermission = async (
  organizationId: string,
  role: string,
  permissionKey: string,
  subscriptionPlan: string = 'free'
): Promise<boolean> => {
  try {
    // Check if org uses custom permissions
    const { data: settings } = await supabase
      .from('org_permission_settings')
      .select('use_global_permissions, override_plan_permissions')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const useGlobal = settings?.use_global_permissions ?? true;
    const overridePlan = settings?.override_plan_permissions ?? false;

    // If not using global, check org-specific override
    if (!useGlobal) {
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

    // If not overriding plan, check plan preset
    if (!overridePlan) {
      const { data: planPerm } = await supabase
        .from('plan_permission_presets')
        .select('is_enabled')
        .eq('plan_name', subscriptionPlan)
        .eq('role', role)
        .eq('permission_key', permissionKey)
        .maybeSingle();

      if (planPerm) {
        return planPerm.is_enabled;
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
