/**
 * System Role Utilities
 * 
 * Super Admin is a SYSTEM-LEVEL role that exists OUTSIDE any organization context.
 * Super Admins can manage the platform but CANNOT perform organization-level
 * business operations (invoices, customers, etc.) unless explicitly impersonating.
 */

import { SUPER_ADMIN_CAPABILITIES, SuperAdminCapability } from '@/lib/permissions/constants';

// All capabilities available to super_admin
const ALL_SUPER_ADMIN_CAPABILITIES: SuperAdminCapability[] = Object.values(SUPER_ADMIN_CAPABILITIES);

/**
 * Check if a user has super_admin status
 * This should be determined from the user_roles table, NOT from any org context
 */
export function isSuperAdmin(systemRole: string | null): boolean {
  return systemRole === 'super_admin';
}

/**
 * Check if a super_admin has a specific system capability
 */
export function hasSystemCapability(
  isSuper: boolean,
  capability: SuperAdminCapability
): boolean {
  if (!isSuper) return false;
  return ALL_SUPER_ADMIN_CAPABILITIES.includes(capability);
}

/**
 * Get display name for system role
 */
export function getSystemRoleDisplayName(role: string | null): string {
  if (role === 'super_admin') return 'Super Admin';
  return 'Unknown';
}

/**
 * System admin panel sections and their descriptions
 */
export const ADMIN_PANEL_SECTIONS = {
  dashboard: {
    label: 'Dashboard',
    description: 'Platform overview and metrics',
  },
  organizations: {
    label: 'Organizations',
    description: 'Manage all organizations on the platform',
  },
  analytics: {
    label: 'Analytics',
    description: 'Platform-wide analytics and insights',
  },
  billing: {
    label: 'Billing',
    description: 'Manage billing invoices for organizations',
  },
  plans: {
    label: 'Plan Management',
    description: 'Configure subscription plans and limits',
  },
  audit: {
    label: 'Audit Logs',
    description: 'View platform-wide audit logs',
  },
  users: {
    label: 'Users',
    description: 'View and manage platform users',
  },
  'ownership-transfers': {
    label: 'Ownership Transfers',
    description: 'Review and approve ownership transfer requests',
  },
} as const;

export type AdminPanelSection = keyof typeof ADMIN_PANEL_SECTIONS;
