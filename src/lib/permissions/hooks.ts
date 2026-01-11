import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  PermissionModule,
  PermissionAction,
  canRolePerform,
  isRoleAtLeast,
  getAccessibleModules,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
  OrgRole,
} from './constants';

/**
 * Main permissions hook for checking user capabilities
 */
export function usePermissions() {
  const { isAdmin } = useAuth();
  const { orgRole, isOrgOwner, isOrgManager, isOrgAdmin, organization } = useOrganization();

  const canPerform = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      if (isAdmin) return true;
      return canRolePerform(orgRole as OrgRole | null, module, action);
    },
    [orgRole, isAdmin]
  );

  const hasMinRole = useCallback(
    (minRole: OrgRole): boolean => {
      if (isAdmin) return true;
      return isRoleAtLeast(orgRole as OrgRole | null, minRole);
    },
    [orgRole, isAdmin]
  );

  const accessibleModules = useMemo(() => {
    if (isAdmin) return getAccessibleModules('owner');
    return getAccessibleModules(orgRole as OrgRole | null);
  }, [orgRole, isAdmin]);

  const ui = useMemo(() => ({
    showTeamManagement: isOrgAdmin || isAdmin,
    showAdvancedSettings: isOrgOwner || isAdmin,
    showReports: hasMinRole('accounts'),
    showEmployees: hasMinRole('manager'),
  }), [isOrgOwner, isOrgAdmin, isAdmin, hasMinRole]);

  const showDelete = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'delete'),
    [canPerform]
  );

  const showCreate = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'create'),
    [canPerform]
  );

  const showEdit = useCallback(
    (module: PermissionModule): boolean => canPerform(module, 'edit'),
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

export function useIsOwner(): boolean {
  const { isOrgOwner } = useOrganization();
  return isOrgOwner;
}

export function useCanManageTeam(): { canView: boolean; canEdit: boolean } {
  const { canPerform } = usePermissions();
  return {
    canView: canPerform('team_members', 'view'),
    canEdit: canPerform('team_members', 'edit'),
  };
}

export function useCanBulkAction(module: PermissionModule): boolean {
  const { canPerform } = usePermissions();
  return canPerform(module, 'bulk');
}

export function useCanImportExport(module: PermissionModule): { canImport: boolean; canExport: boolean } {
  const { canPerform } = usePermissions();
  return {
    canImport: canPerform(module, 'import'),
    canExport: canPerform(module, 'export'),
  };
}
