/**
 * useRoleAccess Hook
 * 
 * Provides a unified interface for checking role-based access in the frontend.
 * 
 * IMPORTANT: These checks are for UX only (hiding/showing UI elements).
 * All actual permission enforcement happens in Edge Functions.
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  OrgRole, 
  OrgModule, 
  OrgAction,
  canOrgRolePerform,
  isRoleAtLeast,
  getAccessibleModules,
  isSuperAdmin as checkIsSuperAdmin,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
} from '@/lib/roles';

export interface RoleAccessResult {
  hasAccess: boolean;
  reason?: string;
}

export function useRoleAccess() {
  const { role: systemRole, isSuperAdmin: authIsSuperAdmin } = useAuth();
  const { orgRole, isOrgOwner, isOrgAdmin, organization } = useOrganization();

  // Check if user is super admin (system level)
  const isSuperAdmin = useMemo(() => {
    return authIsSuperAdmin || checkIsSuperAdmin(systemRole);
  }, [authIsSuperAdmin, systemRole]);

  /**
   * Check if current user can perform an action on a module
   * NOTE: This is for UI display only - Edge Functions enforce actual permissions
   */
  const canPerform = useCallback((
    module: OrgModule,
    action: OrgAction
  ): RoleAccessResult => {
    // Super admin in impersonation mode has owner access
    if (isSuperAdmin) {
      return { hasAccess: true };
    }

    if (!orgRole) {
      return { hasAccess: false, reason: 'No organization role assigned' };
    }

    const hasAccess = canOrgRolePerform(orgRole, module, action);
    return {
      hasAccess,
      reason: hasAccess ? undefined : `Your role (${ORG_ROLE_DISPLAY[orgRole]}) cannot ${action} ${module.replace('_', ' ')}`,
    };
  }, [orgRole, isSuperAdmin]);

  /**
   * Check if current user has at least a minimum role
   */
  const hasMinRole = useCallback((minRole: OrgRole): boolean => {
    if (isSuperAdmin) return true;
    return isRoleAtLeast(orgRole, minRole);
  }, [orgRole, isSuperAdmin]);

  /**
   * Get modules the current user can view
   */
  const accessibleModules = useMemo(() => {
    if (isSuperAdmin) {
      return getAccessibleModules('owner'); // Super admin gets owner-level access when impersonating
    }
    return getAccessibleModules(orgRole);
  }, [orgRole, isSuperAdmin]);

  /**
   * Quick access checks for common scenarios
   */
  const canManageTeam = useMemo(() => 
    canPerform('team_members', 'edit').hasAccess,
    [canPerform]
  );

  const canAccessBilling = useMemo(() => 
    canPerform('billing', 'view').hasAccess,
    [canPerform]
  );

  const canAccessSettings = useMemo(() => 
    canPerform('settings', 'view').hasAccess,
    [canPerform]
  );

  const canAccessReports = useMemo(() => 
    canPerform('reports', 'view').hasAccess,
    [canPerform]
  );

  const canDeleteRecords = useMemo(() => 
    hasMinRole('manager'),
    [hasMinRole]
  );

  return {
    orgRole,
    isSuperAdmin,
    isOrgOwner,
    isOrgAdmin,
    organizationId: organization?.id,
    
    // Check functions
    canPerform,
    hasMinRole,
    
    // Computed access
    accessibleModules,
    canManageTeam,
    canAccessBilling,
    canAccessSettings,
    canAccessReports,
    canDeleteRecords,
    
    // Display helpers
    roleDisplayName: orgRole ? ORG_ROLE_DISPLAY[orgRole] : 'Unknown',
    roleDescription: orgRole ? ORG_ROLE_DESCRIPTIONS[orgRole] : '',
  };
}

// Export for backward compatibility
export { 
  type OrgRole, 
  type OrgModule, 
  type OrgAction,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
  canOrgRolePerform,
} from '@/lib/roles';
