import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PlanFeature, planHasFeature, getPlanLimits, getMinimumPlanForFeature, getPlanDisplayName } from '@/lib/planFeatures';
import { OrgModule, OrgAction, hasOrgPermission } from '@/lib/orgPermissions';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureAccessResult {
  hasAccess: boolean;
  blockedByPlan: boolean;
  blockedByRole: boolean;
  requiredPlan: string | null;
  message: string | null;
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

  const [orgSpecificPerms, setOrgSpecificPerms] = useState<Map<string, boolean>>(new Map());
  const [useGlobalPerms, setUseGlobalPerms] = useState(true);
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
        // Check if org uses custom permissions
        const { data: settings } = await supabase
          .from('org_permission_settings')
          .select('use_global_permissions')
          .eq('organization_id', organizationId)
          .maybeSingle();

        const usesGlobal = settings?.use_global_permissions ?? true;
        setUseGlobalPerms(usesGlobal);
        setHasCustomPermissions(!usesGlobal);

        if (!usesGlobal && orgRole) {
          // Fetch org-specific permissions for the user's role
          const { data: orgPerms } = await supabase
            .from('org_specific_permissions')
            .select('permission_key, is_enabled')
            .eq('organization_id', organizationId)
            .eq('role', orgRole);

          const permMap = new Map<string, boolean>();
          orgPerms?.forEach(p => {
            permMap.set(p.permission_key, p.is_enabled);
          });
          setOrgSpecificPerms(permMap);
        }
      } catch (error) {
        console.error('Error fetching org permissions:', error);
      }
    };

    fetchOrgPermissions();
  }, [organizationId, orgRole, isSuperAdminUser]);

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

  // Convert module/action to permission key
  const getPermissionKey = useCallback((module: OrgModule, action: OrgAction): string => {
    return `${module}_${action}`;
  }, []);

  // Check organization role permission with org-specific override support
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

    // If using org-specific permissions and we have an override
    if (!useGlobalPerms) {
      const permKey = getPermissionKey(module, action);
      if (orgSpecificPerms.has(permKey)) {
        const hasAccess = orgSpecificPerms.get(permKey) ?? false;
        if (!hasAccess) {
          return {
            hasAccess: false,
            blockedByPlan: false,
            blockedByRole: true,
            requiredPlan: null,
            message: 'Access restricted by organization permissions.',
          };
        }
        return {
          hasAccess: true,
          blockedByPlan: false,
          blockedByRole: false,
          requiredPlan: null,
          message: null,
        };
      }
    }

    // Fallback to global permission check
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
  }, [isSuperAdminUser, orgRole, useGlobalPerms, orgSpecificPerms, getPermissionKey]);

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

  // Quick access checks
  const canAccessReports = useMemo(
    () => checkPlanFeature('reports').hasAccess && checkOrgPermission('reports', 'view').hasAccess,
    [checkPlanFeature, checkOrgPermission]
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
    () => checkOrgPermission('team_members', 'view').hasAccess,
    [checkOrgPermission]
  );

  const canAccessBilling = useMemo(
    () => checkOrgPermission('billing', 'view').hasAccess,
    [checkOrgPermission]
  );

  const canAccessSettings = useMemo(
    () => checkOrgPermission('settings', 'view').hasAccess,
    [checkOrgPermission]
  );

  // Read-only mode when subscription expired
  const isReadOnly = !isSubscriptionActive || isTrialExpired;

  return {
    // Core check functions
    checkPlanFeature,
    checkOrgPermission,
    checkAccess,
    
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
