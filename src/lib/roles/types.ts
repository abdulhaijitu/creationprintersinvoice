/**
 * Role System Type Definitions
 * 
 * This file re-exports from the centralized permission system.
 * Use src/lib/permissions/constants.ts as the single source of truth.
 */

// Re-export everything from the permission constants
export {
  // Role types
  type SystemRole,
  type OrgRole,
  type PermissionModule as OrgModule,
  type PermissionAction as OrgAction,
  
  // Role constants
  ORG_ROLE_HIERARCHY,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
  ALL_ORG_ROLES,
  MODULE_DISPLAY as ORG_MODULE_DISPLAY,
  PERMISSION_MATRIX as ORG_PERMISSION_MATRIX,
  SUPER_ADMIN_CAPABILITIES as SYSTEM_CAPABILITIES,
  type SuperAdminCapability as SystemCapability,
  
  // Helper functions
  canRolePerform as canOrgRolePerform,
  isRoleAtLeast,
  getRolesForAction,
  getAccessibleModules,
} from '@/lib/permissions/constants';
