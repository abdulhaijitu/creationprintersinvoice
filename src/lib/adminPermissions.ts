import type { AppRole } from '@/contexts/AuthContext';

export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminNavItem {
  id: string;
  label: string;
  readOnly?: boolean;
}

// Map app roles to admin roles
export const getAdminRole = (role: AppRole | null): AdminRole | null => {
  switch (role) {
    case 'super_admin':
      return 'super_admin';
    case 'admin':
      return 'admin';
    case 'manager':
    case 'accounts':
      return 'support'; // Treat as read-only/support role
    default:
      return null;
  }
};

// Define which sections each admin role can access
const rolePermissions: Record<AdminRole, { sections: string[]; readOnlySections: string[] }> = {
  super_admin: {
    sections: ['dashboard', 'organizations', 'users', 'role-permissions', 'upgrade-requests', 'analytics', 'billing', 'whitelabel', 'notifications', 'audit', 'investor'],
    readOnlySections: [],
  },
  admin: {
    sections: ['dashboard', 'organizations', 'analytics', 'billing', 'notifications'],
    readOnlySections: [],
  },
  support: {
    sections: ['dashboard', 'organizations', 'analytics'],
    readOnlySections: ['organizations', 'analytics'],
  },
};

// Check if a role can access a section
export const canAccessSection = (adminRole: AdminRole | null, section: string): boolean => {
  if (!adminRole) return false;
  return rolePermissions[adminRole]?.sections.includes(section) ?? false;
};

// Check if a section is read-only for a role
export const isSectionReadOnly = (adminRole: AdminRole | null, section: string): boolean => {
  if (!adminRole) return true;
  return rolePermissions[adminRole]?.readOnlySections.includes(section) ?? false;
};

// Get allowed sections for a role
export const getAllowedSections = (adminRole: AdminRole | null): string[] => {
  if (!adminRole) return [];
  return rolePermissions[adminRole]?.sections ?? [];
};

// Get role display name
export const getAdminRoleDisplayName = (adminRole: AdminRole | null): string => {
  switch (adminRole) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'support':
      return 'Support';
    default:
      return 'Unknown';
  }
};

// Check if role has any admin access
export const hasAdminAccess = (role: AppRole | null): boolean => {
  const adminRole = getAdminRole(role);
  return adminRole !== null;
};
