import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PlanFeature, planHasFeature, getPlanLimits, getMinimumPlanForFeature, getPlanDisplayName } from '@/lib/planFeatures';
import { OrgModule, OrgAction, hasOrgPermission, PermissionKey, SubMenuPermissionKey, MenuPermissionKey, permissionToMenu } from '@/lib/orgPermissions';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureAccessResult {
  hasAccess: boolean;
  blockedByPlan: boolean;
  blockedByRole: boolean;
  requiredPlan: string | null;
  message: string | null;
}

interface Permission {
  permission_key: string;
  is_enabled: boolean;
}

export const useFeatureAccess = () => {
  const { isSuperAdmin, role: appRole } = useAuth();
  const { 
    subscription, 
    orgRole, 
    organization,
    isSubscriptionActive, 
    isTrialExpired 
  } = useOrganization();

  const [globalPermissions, setGlobalPermissions] = useState<Permission[]>([]);
  const [planPresets, setPlanPresets] = useState<Permission[]>([]);
  const [orgOverrides, setOrgOverrides] = useState<Permission[]>([]);
  const [settings, setSettings] = useState<{ useGlobal: boolean; overridePlan: boolean }>({ 
    useGlobal: true, 
    overridePlan: false 
  });
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);

  const currentPlan = subscription?.plan ?? null;
  const organizationId = organization?.id;

  // Super Admin bypasses all checks
  const isSuperAdminUser = isSuperAdmin;

  // Fetch org-specific permission settings
  useEffect(() => {
    if (!organizationId || isSuperAdminUser) return;

    const fetchOrgPermissions = async () => {
      try {
        // Fetch all permissions in parallel
        const [globalRes, planRes, orgRes, settingsRes] = await Promise.all([
          supabase
            .from('org_role_permissions')
            .select('permission_key, is_enabled')
            .eq('role', orgRole || 'staff'),
          supabase
            .from('plan_permission_presets')
            .select('permission_key, is_enabled')
            .eq('plan_name', currentPlan || 'free')
            .eq('role', orgRole || 'staff'),
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

        setGlobalPermissions(globalRes.data || []);
        setPlanPresets(planRes.data || []);
        setOrgOverrides(orgRes.data || []);
        
        const usesGlobal = settingsRes.data?.use_global_permissions ?? true;
        const overridePlan = settingsRes.data?.override_plan_permissions ?? false;
        setSettings({ useGlobal: usesGlobal, overridePlan });
        setHasCustomPermissions(!usesGlobal || overridePlan);
      } catch (error) {
        console.error('Error fetching org permissions:', error);
      }
    };

    fetchOrgPermissions();
  }, [organizationId, orgRole, isSuperAdminUser, currentPlan]);

  // Check if a plan feature is accessible
  const checkPlanFeature = useCallback((feature: PlanFeature): FeatureAccessResult => {
    // Super Admin has full access
    if (isSuperAdminUser) {
      return {
        hasAccess: true,
        blockedByPlan: false,
        blockedByRole: false,
        requiredPlan: null,
        message: null,
      };
    }

    // Check subscription status first
    if (!isSubscriptionActive || isTrialExpired) {
      return {
        hasAccess: false,
        blockedByPlan: true,
        blockedByRole: false,
        requiredPlan: 'active subscription',
        message: 'Your subscription has expired. Please upgrade to continue.',
      };
    }

    // Check if plan includes the feature
    const hasFeature = planHasFeature(currentPlan, feature);
    if (!hasFeature) {
      const requiredPlan = getMinimumPlanForFeature(feature);
      return {
        hasAccess: false,
        blockedByPlan: true,
        blockedByRole: false,
        requiredPlan: getPlanDisplayName(requiredPlan),
        message: `This feature requires the ${getPlanDisplayName(requiredPlan)} plan or higher.`,
      };
    }

    return {
      hasAccess: true,
      blockedByPlan: false,
      blockedByRole: false,
      requiredPlan: null,
      message: null,
    };
  }, [isSuperAdminUser, isSubscriptionActive, isTrialExpired, currentPlan]);

  // Resolve permission from the 3-tier hierarchy
  const resolvePermission = useCallback((permissionKey: PermissionKey): boolean => {
    if (isSuperAdminUser) return true;
    if (!orgRole) return false;

    // 1. Organization-specific override (if not using global)
    if (!settings.useGlobal) {
      const orgPerm = orgOverrides.find(p => p.permission_key === permissionKey);
      if (orgPerm) return orgPerm.is_enabled;
    }

    // 2. Plan preset (if not overriding plan)
    if (!settings.overridePlan) {
      const planPerm = planPresets.find(p => p.permission_key === permissionKey);
      if (planPerm) return planPerm.is_enabled;
    }

    // 3. Global default
    const globalPerm = globalPermissions.find(p => p.permission_key === permissionKey);
    return globalPerm?.is_enabled ?? false;
  }, [isSuperAdminUser, orgRole, settings, orgOverrides, planPresets, globalPermissions]);

  // Check permission with menu + sub-menu logic
  const checkPermissionKey = useCallback((permissionKey: PermissionKey): FeatureAccessResult => {
    if (isSuperAdminUser) {
      return {
        hasAccess: true,
        blockedByPlan: false,
        blockedByRole: false,
        requiredPlan: null,
        message: null,
      };
    }

    // For sub-menu permissions, check both menu and sub-menu
    if (permissionKey in permissionToMenu) {
      const menuKey = permissionToMenu[permissionKey as SubMenuPermissionKey];
      const hasMenuAccess = resolvePermission(menuKey);
      const hasSubMenuAccess = resolvePermission(permissionKey);

      if (!hasMenuAccess || !hasSubMenuAccess) {
        return {
          hasAccess: false,
          blockedByPlan: false,
          blockedByRole: true,
          requiredPlan: null,
          message: 'Access restricted by your role permissions.',
        };
      }
    } else {
      // Menu-level permission
      const hasAccess = resolvePermission(permissionKey);
      if (!hasAccess) {
        return {
          hasAccess: false,
          blockedByPlan: false,
          blockedByRole: true,
          requiredPlan: null,
          message: 'Access restricted by your role permissions.',
        };
      }
    }

    return {
      hasAccess: true,
      blockedByPlan: false,
      blockedByRole: false,
      requiredPlan: null,
      message: null,
    };
  }, [isSuperAdminUser, resolvePermission]);

  // Check organization role permission (legacy support)
  const checkOrgPermission = useCallback((module: OrgModule, action: OrgAction): FeatureAccessResult => {
    // Super Admin has full access
    if (isSuperAdminUser) {
      return {
        hasAccess: true,
        blockedByPlan: false,
        blockedByRole: false,
        requiredPlan: null,
        message: null,
      };
    }

    // Fallback to legacy permission check
    const hasPermission = hasOrgPermission(orgRole, module, action);
    if (!hasPermission) {
      return {
        hasAccess: false,
        blockedByPlan: false,
        blockedByRole: true,
        requiredPlan: null,
        message: `You don't have permission to ${action} ${module.replace('_', ' ')}.`,
      };
    }

    return {
      hasAccess: true,
      blockedByPlan: false,
      blockedByRole: false,
      requiredPlan: null,
      message: null,
    };
  }, [isSuperAdminUser, orgRole]);

  // Combined check: plan feature + org permission
  const checkAccess = useCallback((
    feature: PlanFeature | null,
    module: OrgModule | null,
    action: OrgAction = 'view'
  ): FeatureAccessResult => {
    // Super Admin bypasses all
    if (isSuperAdminUser) {
      return {
        hasAccess: true,
        blockedByPlan: false,
        blockedByRole: false,
        requiredPlan: null,
        message: null,
      };
    }

    // Check plan feature first (plan defines what app allows)
    if (feature) {
      const planResult = checkPlanFeature(feature);
      if (!planResult.hasAccess) {
        return planResult;
      }
    }

    // Then check role permission (role defines what user can do)
    if (module) {
      const roleResult = checkOrgPermission(module, action);
      if (!roleResult.hasAccess) {
        return roleResult;
      }
    }

    return {
      hasAccess: true,
      blockedByPlan: false,
      blockedByRole: false,
      requiredPlan: null,
      message: null,
    };
  }, [isSuperAdminUser, checkPlanFeature, checkOrgPermission]);

  // Get plan limits
  const limits = useMemo(() => getPlanLimits(currentPlan), [currentPlan]);

  // Quick access checks using new permission keys
  const canAccessReports = useMemo(
    () => checkPermissionKey('reports.access').hasAccess,
    [checkPermissionKey]
  );

  const canAccessAnalytics = useMemo(
    () => checkPlanFeature('analytics').hasAccess,
    [checkPlanFeature]
  );

  const canAccessAuditLogs = useMemo(
    () => checkPlanFeature('audit_logs').hasAccess,
    [checkPlanFeature]
  );

  const canManageTeam = useMemo(
    () => checkPermissionKey('settings.team_members').hasAccess,
    [checkPermissionKey]
  );

  const canAccessBilling = useMemo(
    () => checkPermissionKey('settings.billing').hasAccess,
    [checkPermissionKey]
  );

  const canAccessSettings = useMemo(
    () => checkPermissionKey('settings.access').hasAccess,
    [checkPermissionKey]
  );

  // Read-only mode when subscription expired
  const isReadOnly = !isSubscriptionActive || isTrialExpired;

  return {
    // Core check functions
    checkPlanFeature,
    checkOrgPermission,
    checkPermissionKey,
    checkAccess,
    resolvePermission,
    
    // State
    isSuperAdmin: isSuperAdminUser,
    currentPlan,
    orgRole,
    limits,
    isReadOnly,
    hasCustomPermissions,
    
    // Quick access flags
    canAccessReports,
    canAccessAnalytics,
    canAccessAuditLogs,
    canManageTeam,
    canAccessBilling,
    canAccessSettings,
  };
};
