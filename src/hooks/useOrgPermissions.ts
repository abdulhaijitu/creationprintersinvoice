import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionKey, MenuPermissionKey, SubMenuPermissionKey, permissionToMenu } from '@/lib/orgPermissions';

interface Permission {
  permission_key: string;
  is_enabled: boolean;
}

interface CachedPermissions {
  global: Permission[];
  planPresets: Permission[];
  timestamp: number;
}

let permissionCache: CachedPermissions | null = null;
const CACHE_DURATION = 60000; // 1 minute

export const useOrgPermissions = () => {
  const { organization, orgRole, subscription } = useOrganization();
  const { isSuperAdmin } = useAuth();
  const organizationId = organization?.id;
  const subscriptionPlan = subscription?.plan || 'free';

  const [globalPermissions, setGlobalPermissions] = useState<Permission[]>([]);
  const [planPresets, setPlanPresets] = useState<Permission[]>([]);
  const [orgOverrides, setOrgOverrides] = useState<Permission[]>([]);
  const [settings, setSettings] = useState<{ useGlobal: boolean; overridePlan: boolean }>({ 
    useGlobal: true, 
    overridePlan: false 
  });
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!organizationId || isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      // Use cache for global and plan presets
      const now = Date.now();
      if (permissionCache && now - permissionCache.timestamp < CACHE_DURATION) {
        setGlobalPermissions(permissionCache.global);
        setPlanPresets(permissionCache.planPresets);
      } else {
        const [globalRes, planRes] = await Promise.all([
          supabase
            .from('org_role_permissions')
            .select('permission_key, is_enabled')
            .eq('role', orgRole || 'staff'),
          supabase
            .from('plan_permission_presets')
            .select('permission_key, is_enabled')
            .eq('plan_name', subscriptionPlan)
            .eq('role', orgRole || 'staff'),
        ]);

        const global = globalRes.data || [];
        const presets = planRes.data || [];

        permissionCache = {
          global,
          planPresets: presets,
          timestamp: now,
        };

        setGlobalPermissions(global);
        setPlanPresets(presets);
      }

      // Fetch org-specific overrides
      const [orgRes, settingsRes] = await Promise.all([
        supabase
          .from('org_specific_permissions')
          .select('permission_key, is_enabled')
          .eq('organization_id', organizationId)
          .eq('role', orgRole || 'staff'),
        supabase
          .from('org_permission_settings')
          .select('use_global_permissions, override_plan_permissions')
          .eq('organization_id', organizationId)
          .maybeSingle(),
      ]);

      setOrgOverrides(orgRes.data || []);
      setSettings({
        useGlobal: settingsRes.data?.use_global_permissions ?? true,
        overridePlan: settingsRes.data?.override_plan_permissions ?? false,
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, orgRole, subscriptionPlan, isSuperAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Check if a permission is enabled
   * Resolution order:
   * 1. Organization-specific override (if not using global)
   * 2. Plan preset (if not overriding plan)
   * 3. Global default
   */
  const hasPermission = useCallback(
    (permissionKey: PermissionKey): boolean => {
      // Super admin has all permissions
      if (isSuperAdmin) return true;
      if (!orgRole) return false;

      // Check org-specific override first (if not using global)
      if (!settings.useGlobal) {
        const orgPerm = orgOverrides.find(p => p.permission_key === permissionKey);
        if (orgPerm) return orgPerm.is_enabled;
      }

      // Check plan preset (if not overriding plan)
      if (!settings.overridePlan) {
        const planPerm = planPresets.find(p => p.permission_key === permissionKey);
        if (planPerm) return planPerm.is_enabled;
      }

      // Fallback to global
      const globalPerm = globalPermissions.find(p => p.permission_key === permissionKey);
      return globalPerm?.is_enabled ?? false;
    },
    [isSuperAdmin, orgRole, settings, orgOverrides, planPresets, globalPermissions]
  );

  /**
   * Check if user has access to a menu (menu.access permission)
   */
  const hasMenuAccess = useCallback(
    (menuKey: MenuPermissionKey): boolean => {
      return hasPermission(menuKey);
    },
    [hasPermission]
  );

  /**
   * Check if user has access to a sub-menu
   * Both menu AND sub-menu permission must be enabled
   */
  const hasSubMenuAccess = useCallback(
    (subMenuKey: SubMenuPermissionKey): boolean => {
      const menuKey = permissionToMenu[subMenuKey];
      if (!menuKey) return false;

      // Must have both menu access and sub-menu permission
      return hasPermission(menuKey) && hasPermission(subMenuKey);
    },
    [hasPermission]
  );

  /**
   * Check if any of the provided permissions are enabled
   */
  const hasAnyPermission = useCallback(
    (permissionKeys: PermissionKey[]): boolean => {
      return permissionKeys.some(key => hasPermission(key));
    },
    [hasPermission]
  );

  /**
   * Check if all of the provided permissions are enabled
   */
  const hasAllPermissions = useCallback(
    (permissionKeys: PermissionKey[]): boolean => {
      return permissionKeys.every(key => hasPermission(key));
    },
    [hasPermission]
  );

  /**
   * Refresh permissions from database
   */
  const refreshPermissions = useCallback(async () => {
    permissionCache = null;
    await fetchPermissions();
  }, [fetchPermissions]);

  // Computed permission flags for common checks
  const permissions = useMemo(() => ({
    // Menu access
    dashboard: hasPermission('dashboard.access'),
    salesBilling: hasPermission('sales_billing.access'),
    expenses: hasPermission('expenses.access'),
    hrWorkforce: hasPermission('hr_workforce.access'),
    reports: hasPermission('reports.access'),
    settings: hasPermission('settings.access'),

    // Sales sub-menus
    customers: hasSubMenuAccess('sales.customers'),
    invoices: hasSubMenuAccess('sales.invoices'),
    quotations: hasSubMenuAccess('sales.quotations'),
    deliveryChallans: hasSubMenuAccess('sales.delivery_challans'),
    priceCalculations: hasSubMenuAccess('sales.price_calculations'),

    // Expenses sub-menus
    vendors: hasSubMenuAccess('expenses.vendors'),
    expensesList: hasSubMenuAccess('expenses.expenses'),

    // HR sub-menus
    employees: hasSubMenuAccess('hr.employees'),
    attendance: hasSubMenuAccess('hr.attendance'),
    leaveManagement: hasSubMenuAccess('hr.leave_management'),
    payroll: hasSubMenuAccess('hr.payroll'),
    performance: hasSubMenuAccess('hr.performance'),
    tasks: hasSubMenuAccess('hr.tasks'),

    // Reports sub-menus
    financialReports: hasSubMenuAccess('reports.financial'),
    hrReports: hasSubMenuAccess('reports.hr'),

    // Settings sub-menus
    roleManagement: hasSubMenuAccess('settings.role_management'),
    organizationSettings: hasSubMenuAccess('settings.organization_settings'),
    teamMembers: hasSubMenuAccess('settings.team_members'),
    usageLimits: hasSubMenuAccess('settings.usage_limits'),
    notifications: hasSubMenuAccess('settings.notifications'),
    whiteLabel: hasSubMenuAccess('settings.white_label'),
    billing: hasSubMenuAccess('settings.billing'),
    platformAdmin: hasSubMenuAccess('settings.platform_admin'),
  }), [hasPermission, hasSubMenuAccess]);

  return {
    hasPermission,
    hasMenuAccess,
    hasSubMenuAccess,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    loading,
    orgRole,
    subscriptionPlan,
    refreshPermissions,
    hasCustomPermissions: !settings.useGlobal || settings.overridePlan,
    usesPlanPresets: !settings.overridePlan,
  };
};

// Clear permission cache (call when plan/role changes)
export const clearPermissionCache = () => {
  permissionCache = null;
};
