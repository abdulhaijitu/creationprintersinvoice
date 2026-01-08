/**
 * Unified Role System Export
 * 
 * This module provides a clean, simple API for role-based access control.
 * 
 * ARCHITECTURE:
 * 1. System Roles (super_admin) - Platform-level, managed in user_roles table
 * 2. Organization Roles (owner, manager, accounts, staff) - Per-org, in organization_members table
 * 
 * IMPORTANT:
 * - Frontend checks are for UX only (hiding/showing elements)
 * - All actual permission enforcement MUST happen in Edge Functions
 * - Use src/lib/permissions as the single source of truth
 */

// Re-export everything from the centralized permission system
export * from '@/lib/permissions/constants';
export * from '@/lib/permissions/hooks';

// Keep backward compatible type exports
export type {
  SystemRole,
  OrgRole,
  OrgModule,
  OrgAction,
  SystemCapability,
} from './types';

export {
  ORG_ROLE_HIERARCHY,
  ORG_ROLE_DISPLAY,
  ORG_ROLE_DESCRIPTIONS,
  ORG_MODULE_DISPLAY,
  ORG_PERMISSION_MATRIX,
  SYSTEM_CAPABILITIES,
  canOrgRolePerform,
  isRoleAtLeast,
  getRolesForAction,
  getAccessibleModules,
} from './types';

// System role utilities
export {
  isSuperAdmin,
  hasSystemCapability,
  getSystemRoleDisplayName,
  ADMIN_PANEL_SECTIONS,
} from './systemRoles';

export type { AdminPanelSection } from './systemRoles';
