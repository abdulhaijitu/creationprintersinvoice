/**
 * LEGACY PERMISSIONS - For backward compatibility with old system role-based code
 * 
 * NOTE: This file is being deprecated. Use src/lib/permissions/constants.ts instead.
 * The organization-level role system (OrgRole) is the primary permission system.
 * 
 * This file maps the old AppRole-based permissions to the new system.
 */

import { OrgRole, PermissionModule, PermissionAction, canRolePerform, PERMISSION_MATRIX, ORG_ROLE_DISPLAY, ALL_ORG_ROLES, MODULE_DISPLAY } from './permissions/constants';
import type { AppRole } from '@/contexts/AuthContext';

// Re-export types for backward compatibility
export type Module = PermissionModule | 'performance' | 'user_roles';
export type Action = 'view' | 'create' | 'edit' | 'delete';

// Map legacy AppRole to OrgRole
function mapAppRoleToOrgRole(role: AppRole | null): OrgRole | null {
  if (!role) return null;
  if (role === 'super_admin') return 'owner'; // Super admin gets owner-level permissions when checking
  return role as OrgRole;
}

// Legacy permission matrix for modules not in the new system
const legacyPermissions: Record<string, Partial<Record<Action, AppRole[]>>> = {
  performance: {
    view: ['super_admin', 'owner', 'manager'],
    create: ['super_admin', 'owner', 'manager'],
    edit: ['super_admin', 'owner', 'manager'],
    delete: ['super_admin', 'owner'],
  },
  user_roles: {
    view: ['super_admin', 'owner'],
    create: ['super_admin', 'owner'],
    edit: ['super_admin', 'owner'],
    delete: ['super_admin', 'owner'],
  },
};

/**
 * Check if a role has permission for a module/action
 * @deprecated Use canRolePerform from src/lib/permissions/constants.ts instead
 */
export const hasPermission = (role: AppRole | null, module: Module, action: Action): boolean => {
  if (!role) return false;
  
  // Super admin has all permissions
  if (role === 'super_admin') return true;
  
  // Check legacy modules first
  if (module in legacyPermissions) {
    return legacyPermissions[module]?.[action]?.includes(role) ?? false;
  }
  
  // Map to new system
  const orgRole = mapAppRoleToOrgRole(role);
  if (!orgRole) return false;
  
  // Check if module exists in new permission matrix
  if (module in PERMISSION_MATRIX) {
    return canRolePerform(orgRole, module as PermissionModule, action);
  }
  
  return false;
};

/**
 * Get display name for a role
 * @deprecated Use ORG_ROLE_DISPLAY from src/lib/permissions/constants.ts instead
 */
export const getRoleDisplayName = (role: AppRole): string => {
  if (role === 'super_admin') return 'Super Admin';
  if (role in ORG_ROLE_DISPLAY) {
    return ORG_ROLE_DISPLAY[role as OrgRole];
  }
  return role;
};

/**
 * All available roles for role management UI
 * @deprecated Use ALL_ORG_ROLES from src/lib/permissions/constants.ts instead
 */
export const allRoles: AppRole[] = ['super_admin', 'owner', 'manager', 'accounts', 'sales_staff', 'designer', 'employee'];

/**
 * Get module display name
 */
export const getModuleDisplayName = (module: Module): string => {
  if (module in MODULE_DISPLAY) {
    return MODULE_DISPLAY[module as PermissionModule];
  }
  const legacyModuleNames: Record<string, string> = {
    performance: 'Performance',
    user_roles: 'User Roles',
  };
  return legacyModuleNames[module] || module;
};

/**
 * Get all modules with their permissions for role management UI
 */
export const getModulesWithPermissions = () => {
  const modules = Object.entries(PERMISSION_MATRIX).map(([module, actions]) => ({
    module: module as Module,
    moduleName: MODULE_DISPLAY[module as PermissionModule],
    actions: {
      view: (actions.view || []) as string[],
      create: (actions.create || []) as string[],
      edit: (actions.edit || []) as string[],
      delete: (actions.delete || []) as string[],
    },
  }));
  
  // Add legacy modules
  Object.entries(legacyPermissions).forEach(([module, actions]) => {
    modules.push({
      module: module as Module,
      moduleName: getModuleDisplayName(module as Module),
      actions: {
        view: (actions.view || []) as string[],
        create: (actions.create || []) as string[],
        edit: (actions.edit || []) as string[],
        delete: (actions.delete || []) as string[],
      },
    });
  });
  
  return modules;
};

// Re-export from new system for convenience
export { PERMISSION_MATRIX, ORG_ROLE_DISPLAY, ALL_ORG_ROLES, canRolePerform };
export type { AppRole };
