/**
 * Permissions Module - Centralized permission system
 * 
 * This module provides a unified API for checking permissions.
 * All permission checks should go through this module.
 */

// Legacy action-based permissions (for backwards compatibility)
export * from './constants';
export * from './hooks';

// New module-based permission system (recommended)
// Note: Use specific imports to avoid naming conflicts with legacy system
export {
  type ModulePermission,
  MAIN_PERMISSIONS,
  BUSINESS_PERMISSIONS,
  HR_OPS_PERMISSIONS,
  SYSTEM_PERMISSIONS,
  ALL_MODULE_PERMISSIONS,
  PERMISSION_BY_KEY,
  PERMISSIONS_BY_CATEGORY,
  PERMISSION_BY_ROUTE,
  CATEGORY_DISPLAY,
  getAllPermissionKeys,
  getPermissionForRoute,
  isValidPermissionKey,
  getPermissionLabel,
  getCriticalPermissions,
} from './modulePermissions';

// Re-export PermissionCategory from modulePermissions with alias to avoid conflict
export type { PermissionCategory as ModulePermissionCategory } from './modulePermissions';

// Sidebar configuration
export * from './sidebarConfig';
