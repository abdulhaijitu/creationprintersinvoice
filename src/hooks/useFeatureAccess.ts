import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PlanFeature, planHasFeature, getPlanLimits, getMinimumPlanForFeature, getPlanDisplayName } from '@/lib/planFeatures';
import { OrgModule, OrgAction, hasOrgPermission } from '@/lib/orgPermissions';

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
    isSubscriptionActive, 
    isTrialExpired 
  } = useOrganization();

  const currentPlan = subscription?.plan ?? null;

  // Super Admin bypasses all checks
  const isSuperAdminUser = isSuperAdmin;

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

  // Check organization role permission
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
    
    // Quick access flags
    canAccessReports,
    canAccessAnalytics,
    canAccessAuditLogs,
    canManageTeam,
    canAccessBilling,
    canAccessSettings,
  };
};
