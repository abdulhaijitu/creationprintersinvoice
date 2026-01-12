import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';
import {
  PermissionModule,
  PermissionAction,
  canRolePerform,
  isRoleAtLeast,
  getAccessibleModules,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
  OrgRole,
  hasAnyPermission,
  PERMISSION_DEFINITIONS,
} from './constants';

/**
 * Main permissions hook for checking user capabilities
 * Integrates with org-specific permission overrides from the database
 */
export function usePermissions() {
  const { isAdmin } = useAuth();
  const { orgRole, isOrgOwner, isOrgManager, isOrgAdmin, organization } = useOrganization();
  const { hasPermission: hasOrgSpecificPermission, loading: permissionsLoading } = useOrgRolePermissions();

  /**
   * Check if user can perform an action on a module
   * Order of precedence:
   * 1. Super admin bypass
   * 2. Owner always has all permissions
   * 3. Org-specific permission override (from database)
   * 4. Default role-based permission matrix
   */
  const canPerform = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      // Super admin bypass
      if (isAdmin) return true;
      
      // Owner always has all permissions
      if (isOrgOwner) return true;
      
      // Check org-specific permission override first
      const permissionKey = `${module}.${action}`;
      if (hasOrgSpecificPermission(permissionKey)) {
        return true;
      }
      
      // Fall back to default role-based permission
      return canRolePerform(orgRole as OrgRole | null, module, action);
    },
    [orgRole, isAdmin, isOrgOwner, hasOrgSpecificPermission]
  );

  /**
   * Check if user has minimum role level
   */
  const hasMinRole = useCallback(
    (minRole: OrgRole): boolean => {
      if (isAdmin) return true;
      return isRoleAtLeast(orgRole as OrgRole | null, minRole);
    },
    [orgRole, isAdmin]
  );

  /**
   * Get all modules user can view
   */
  const accessibleModules = useMemo(() => {
    if (isAdmin || isOrgOwner) return getAccessibleModules('owner');
    return getAccessibleModules(orgRole as OrgRole | null);
  }, [orgRole, isAdmin, isOrgOwner]);

  /**
   * Check if user has at least one permission (for dashboard visibility)
   */
  const hasAnyViewPermission = useMemo(() => {
    if (isAdmin || isOrgOwner) return true;
    return hasAnyPermission(orgRole as OrgRole | null);
  }, [orgRole, isAdmin, isOrgOwner]);

  /**
   * UI visibility helpers
   */
  const ui = useMemo(() => ({
    showTeamManagement: canPerform('team_members', 'view'),
    showAdvancedSettings: isOrgOwner || isAdmin,
    showReports: canPerform('reports', 'view'),
    showEmployees: canPerform('employees', 'view'),
    showBilling: isOrgOwner || isAdmin,
    showDashboard: hasAnyViewPermission,
  }), [canPerform, isOrgOwner, isAdmin, hasAnyViewPermission]);

  /**
   * Action-specific permission checks
   */
  const showDelete = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'delete'),
    [canPerform]
  );

  const showCreate = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'create') || canPerform(module, 'manage'),
    [canPerform]
  );

  const showEdit = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'edit') || canPerform(module, 'manage'),
    [canPerform]
  );

  const showManage = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'manage'),
    [canPerform]
  );

  return {
    canPerform,
    hasMinRole,
    accessibleModules,
    ui,
    showDelete,
    showCreate,
    showEdit,
    showManage,
    hasAnyViewPermission,
    permissionsLoading,
    orgRole,
    isOrgOwner,
    isOrgManager,
    isOrgAdmin,
    isAdmin,
    organizationId: organization?.id,
    roleDisplayName: orgRole ? ORG_ROLE_DISPLAY[orgRole as OrgRole] : 'Unknown',
    roleDescription: orgRole ? ORG_ROLE_DESCRIPTIONS[orgRole as OrgRole] : '',
  };
}

/**
 * Check if current user is org owner
 */
export function useIsOwner(): boolean {
  const { isOrgOwner } = useOrganization();
  return isOrgOwner;
}

/**
 * Check team management permissions
 */
export function useCanManageTeam(): { canView: boolean; canEdit: boolean } {
  const { canPerform } = usePermissions();
  return {
    canView: canPerform('team_members', 'view'),
    canEdit: canPerform('team_members', 'manage'),
  };
}

/**
 * Check bulk action permission for a module
 */
export function useCanBulkAction(module: PermissionModule): boolean {
  const { canPerform } = usePermissions();
  return canPerform(module, 'bulk');
}

/**
 * Check import/export permissions for a module
 */
export function useCanImportExport(module: PermissionModule): { canImport: boolean; canExport: boolean } {
  const { canPerform } = usePermissions();
  return {
    canImport: canPerform(module, 'import'),
    canExport: canPerform(module, 'export'),
  };
}

/**
 * Get all permission definitions grouped by category
 */
export function usePermissionDefinitions() {
  return useMemo(() => {
    const grouped: Record<string, typeof PERMISSION_DEFINITIONS> = {};
    
    for (const perm of PERMISSION_DEFINITIONS) {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    }
    
    return { all: PERMISSION_DEFINITIONS, grouped };
  }, []);
}
