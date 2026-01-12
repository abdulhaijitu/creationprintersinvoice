import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgRolePermissions } from './useOrgRolePermissions';

/**
 * Settings tab permission keys
 * Each tab has view and manage permissions
 */
export const SETTINGS_TAB_PERMISSIONS = {
  company: {
    view: 'settings.company.view',
    manage: 'settings.company.manage',
  },
  logo: {
    view: 'settings.logo.view',
    manage: 'settings.logo.manage',
  },
  bank: {
    view: 'settings.bank.view',
    manage: 'settings.bank.manage',
  },
  invoice: {
    view: 'settings.invoice.view',
    manage: 'settings.invoice.manage',
  },
  attendance: {
    view: 'settings.attendance.view',
    manage: 'settings.attendance.manage',
  },
} as const;

export type SettingsTabKey = keyof typeof SETTINGS_TAB_PERMISSIONS;

export interface TabPermission {
  canView: boolean;
  canManage: boolean;
  isReadOnly: boolean;
}

export interface SettingsTabPermissions {
  company: TabPermission;
  logo: TabPermission;
  bank: TabPermission;
  invoice: TabPermission;
  attendance: TabPermission;
  /** List of tabs the user can see */
  visibleTabs: SettingsTabKey[];
  /** Whether user can view at least one tab */
  canViewAnyTab: boolean;
  /** Whether user can manage at least one tab */
  canManageAnyTab: boolean;
  /** Whether user has full access (Super Admin or Owner) */
  hasFullAccess: boolean;
  loading: boolean;
}

/**
 * Hook for granular settings tab permissions
 * 
 * Super Admin & Owner: Full access to all tabs
 * Other roles: Based on org_role_permissions for each tab
 * 
 * If permission not found in DB, falls back to role-based defaults:
 * - manager/admin: can view and manage all tabs
 * - accounts: can view company and invoice tabs only
 * - employee/staff: cannot view settings
 */
export const useSettingsTabPermissions = (): SettingsTabPermissions => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const { isOrgOwner, isOrgManager, orgRole } = useOrganization();
  const { hasPermission, loading } = useOrgRolePermissions();

  const permissions = useMemo(() => {
    // Super Admin and Owner always have full access
    const hasFullAccess = isSuperAdmin || isOrgOwner;

    // Helper to check tab permission with fallback
    const getTabPermission = (tabKey: SettingsTabKey): TabPermission => {
      if (hasFullAccess) {
        return { canView: true, canManage: true, isReadOnly: false };
      }

      const tabPerms = SETTINGS_TAB_PERMISSIONS[tabKey];
      
      // Check database permissions first
      let canView = hasPermission(tabPerms.view);
      let canManage = hasPermission(tabPerms.manage);

      // Role-based fallback if no specific permissions found
      // This handles cases where tab-specific permissions aren't set up yet
      if (!canView && !canManage) {
        if (isOrgManager || isAdmin) {
          // Managers and admins can view and manage all tabs by default
          canView = true;
          canManage = true;
        } else if (orgRole === 'accounts') {
          // Accounts can view company and invoice tabs by default
          if (tabKey === 'company' || tabKey === 'invoice') {
            canView = true;
            canManage = false;
          }
        }
        // employees/staff get no access by default
      }

      return {
        canView,
        canManage,
        isReadOnly: canView && !canManage,
      };
    };

    const company = getTabPermission('company');
    const logo = getTabPermission('logo');
    const bank = getTabPermission('bank');
    const invoice = getTabPermission('invoice');
    const attendance = getTabPermission('attendance');

    // Determine visible tabs
    const visibleTabs: SettingsTabKey[] = [];
    if (company.canView) visibleTabs.push('company');
    if (logo.canView) visibleTabs.push('logo');
    if (bank.canView) visibleTabs.push('bank');
    if (invoice.canView) visibleTabs.push('invoice');
    if (attendance.canView) visibleTabs.push('attendance');

    const canViewAnyTab = visibleTabs.length > 0;
    const canManageAnyTab = company.canManage || logo.canManage || bank.canManage || invoice.canManage || attendance.canManage;

    return {
      company,
      logo,
      bank,
      invoice,
      attendance,
      visibleTabs,
      canViewAnyTab,
      canManageAnyTab,
      hasFullAccess,
      loading,
    };
  }, [isSuperAdmin, isOrgOwner, isOrgManager, isAdmin, orgRole, hasPermission, loading]);

  return permissions;
};
