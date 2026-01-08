/**
 * Permission Hooks
 * 
 * React hooks for checking permissions in components.
 * These are for UI/UX purposes only - Edge Functions enforce actual security.
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  OrgRole,
  PermissionModule,
  PermissionAction,
  canRolePerform,
  isRoleAtLeast,
  getAccessibleModules,
  UI_VISIBILITY_RULES,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
} from './constants';

export interface PermissionCheckResult {
  hasAccess: boolean;
  reason?: string;
}

/**
 * Primary hook for permission checks
 * Use this for all permission-related UI decisions
 */
export function usePermissions() {
  const { isSuperAdmin } = useAuth();
  const { orgRole, isOrgOwner, isOrgManager, organization } = useOrganization();

  /**
   * Check if user can perform an action on a module
   */
  const canPerform = useCallback((
    module: PermissionModule,
    action: PermissionAction
  ): PermissionCheckResult => {
    // Super admin impersonating gets owner access
    if (isSuperAdmin) {
      return { hasAccess: true };
    }

    if (!orgRole) {
      return { hasAccess: false, reason: 'No organization role assigned' };
    }

    const hasAccess = canRolePerform(orgRole, module, action);
    return {
      hasAccess,
      reason: hasAccess 
        ? undefined 
        : `Your role (${ORG_ROLE_DISPLAY[orgRole]}) cannot ${action} ${module.replace('_', ' ')}`,
    };
  }, [orgRole, isSuperAdmin]);

  /**
   * Check if user has at least a minimum role
   */
  const hasMinRole = useCallback((minRole: OrgRole): boolean => {
    if (isSuperAdmin) return true;
    return isRoleAtLeast(orgRole, minRole);
  }, [orgRole, isSuperAdmin]);

  /**
   * Get all modules the user can access
   */
  const accessibleModules = useMemo(() => {
    if (isSuperAdmin) return getAccessibleModules('owner');
    return getAccessibleModules(orgRole);
  }, [orgRole, isSuperAdmin]);

  // Quick access UI visibility checks
  const ui = useMemo(() => ({
    showBilling: UI_VISIBILITY_RULES.showBillingSection(orgRole),
    showTeamManagement: UI_VISIBILITY_RULES.showTeamManagement(orgRole),
    canEditTeamRoles: UI_VISIBILITY_RULES.canEditTeamRoles(orgRole),
    showWhiteLabel: UI_VISIBILITY_RULES.showWhiteLabelSettings(orgRole),
    showOwnershipTransfer: UI_VISIBILITY_RULES.showOwnershipTransfer(orgRole),
    showBulkActions: UI_VISIBILITY_RULES.showBulkActions(orgRole),
    showImportExport: UI_VISIBILITY_RULES.showImportExport(orgRole),
    showSuperAdminPanel: UI_VISIBILITY_RULES.showSuperAdminPanel(isSuperAdmin),
  }), [orgRole, isSuperAdmin]);

  // Module-specific button visibility
  const showDelete = useCallback((module: PermissionModule) => 
    UI_VISIBILITY_RULES.showDeleteButton(orgRole, module), [orgRole]);
  
  const showCreate = useCallback((module: PermissionModule) => 
    UI_VISIBILITY_RULES.showCreateButton(orgRole, module), [orgRole]);
  
  const showEdit = useCallback((module: PermissionModule) => 
    UI_VISIBILITY_RULES.showEditButton(orgRole, module), [orgRole]);

  return {
    // Role info
    orgRole,
    isSuperAdmin,
    isOrgOwner,
    isOrgManager,
    organizationId: organization?.id,
    roleDisplayName: orgRole ? ORG_ROLE_DISPLAY[orgRole] : 'Unknown',
    roleDescription: orgRole ? ORG_ROLE_DESCRIPTIONS[orgRole] : '',

    // Core check functions
    canPerform,
    hasMinRole,
    
    // Computed access
    accessibleModules,
    
    // UI visibility helpers
    ui,
    showDelete,
    showCreate,
    showEdit,
  };
}

/**
 * Hook for checking if current user is the organization owner
 */
export function useIsOwner(): boolean {
  const { orgRole } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  // Super admin impersonating has owner access
  if (isSuperAdmin) return true;
  return orgRole === 'owner';
}

/**
 * Hook for checking if current user can manage team
 */
export function useCanManageTeam(): { canView: boolean; canEdit: boolean } {
  const { orgRole } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  if (isSuperAdmin) return { canView: true, canEdit: true };
  
  return {
    canView: isRoleAtLeast(orgRole, 'manager'),
    canEdit: orgRole === 'owner',
  };
}

/**
 * Hook for checking bulk action permissions
 */
export function useCanBulkAction(module: PermissionModule): boolean {
  const { orgRole } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  if (isSuperAdmin) return true;
  return canRolePerform(orgRole, module, 'bulk');
}

/**
 * Hook for checking import/export permissions
 */
export function useCanImportExport(module: PermissionModule): { canImport: boolean; canExport: boolean } {
  const { orgRole } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  if (isSuperAdmin) return { canImport: true, canExport: true };
  
  return {
    canImport: canRolePerform(orgRole, module, 'import'),
    canExport: canRolePerform(orgRole, module, 'export'),
  };
}
