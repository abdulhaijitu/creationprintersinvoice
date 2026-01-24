/**
 * COSTING PERMISSIONS HOOK
 * 
 * Centralized permission checks for Invoice Costing (Internal Only) feature.
 * This ensures consistent permission enforcement across all costing-related UI.
 * 
 * PERMISSION KEYS:
 * - invoices.costing.view - Can see costing section
 * - invoices.costing.edit - Can modify costing data
 * - invoices.costing.save - Can persist changes to DB
 * - invoices.costing.reset - Can reset costing data
 * - invoices.costing.profit_view - Can see profit/margin calculations
 * 
 * ROLE MAPPING (LOCKED):
 * - Super Admin / Owner: ALL permissions enabled
 * - Manager: VIEW, EDIT, SAVE, PROFIT_VIEW enabled; RESET UI-only
 * - Accounts: VIEW, PROFIT_VIEW enabled; EDIT/SAVE/RESET disabled (read-only)
 * - Sales/Designer/Employee: ALL disabled (completely hidden)
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrgRole } from '@/lib/permissions/constants';

export interface CostingPermissions {
  /** Can see the costing section at all */
  canView: boolean;
  /** Can edit costing data (add/remove rows, change values) */
  canEdit: boolean;
  /** Can save costing to database */
  canSave: boolean;
  /** Can reset costing data */
  canReset: boolean;
  /** Can view profit/margin calculations */
  canViewProfit: boolean;
  /** True if costing should be completely hidden */
  isHidden: boolean;
  /** True if costing should be read-only */
  isReadOnly: boolean;
  /** User's role for display purposes */
  role: OrgRole | null;
}

/**
 * Role-based costing permission matrix
 * This is the single source of truth for costing permissions
 */
const COSTING_PERMISSION_MATRIX: Record<OrgRole, {
  view: boolean;
  edit: boolean;
  save: boolean;
  reset: boolean;
  profitView: boolean;
}> = {
  owner: {
    view: true,
    edit: true,
    save: true,
    reset: true,
    profitView: true,
  },
  manager: {
    view: true,
    edit: true,
    save: true,
    reset: true, // UI-only, doesn't delete DB data unless saved
    profitView: true,
  },
  accounts: {
    view: true,
    edit: false,
    save: false,
    reset: false,
    profitView: true,
  },
  sales_staff: {
    view: false,
    edit: false,
    save: false,
    reset: false,
    profitView: false,
  },
  designer: {
    view: false,
    edit: false,
    save: false,
    reset: false,
    profitView: false,
  },
  employee: {
    view: false,
    edit: false,
    save: false,
    reset: false,
    profitView: false,
  },
};

/**
 * Hook to get costing permissions for the current user
 */
export function useCostingPermissions(): CostingPermissions {
  const { isAdmin } = useAuth();
  const { orgRole, isOrgOwner } = useOrganization();

  return useMemo(() => {
    // Super admin bypass - full access
    if (isAdmin) {
      return {
        canView: true,
        canEdit: true,
        canSave: true,
        canReset: true,
        canViewProfit: true,
        isHidden: false,
        isReadOnly: false,
        role: 'owner' as OrgRole,
      };
    }

    // Organization owner has full access
    if (isOrgOwner) {
      return {
        canView: true,
        canEdit: true,
        canSave: true,
        canReset: true,
        canViewProfit: true,
        isHidden: false,
        isReadOnly: false,
        role: 'owner' as OrgRole,
      };
    }

    // Get role from organization context
    const role = orgRole as OrgRole | null;
    
    // No role = no access
    if (!role) {
      return {
        canView: false,
        canEdit: false,
        canSave: false,
        canReset: false,
        canViewProfit: false,
        isHidden: true,
        isReadOnly: true,
        role: null,
      };
    }

    // Get permissions from matrix
    const perms = COSTING_PERMISSION_MATRIX[role];
    
    if (!perms) {
      return {
        canView: false,
        canEdit: false,
        canSave: false,
        canReset: false,
        canViewProfit: false,
        isHidden: true,
        isReadOnly: true,
        role,
      };
    }

    return {
      canView: perms.view,
      canEdit: perms.edit,
      canSave: perms.save,
      canReset: perms.reset,
      canViewProfit: perms.profitView,
      isHidden: !perms.view,
      isReadOnly: perms.view && !perms.edit,
      role,
    };
  }, [isAdmin, isOrgOwner, orgRole]);
}

/**
 * Get permission tooltip text for disabled actions
 */
export function getCostingPermissionTooltip(
  action: 'edit' | 'save' | 'reset' | 'profit',
  role: OrgRole | null
): string {
  if (!role) {
    return 'You do not have permission for this action';
  }

  const actionLabels = {
    edit: 'edit costing data',
    save: 'save costing',
    reset: 'reset costing',
    profit: 'view profit margins',
  };

  const roleLabel = {
    owner: 'Owner',
    manager: 'Manager',
    accounts: 'Accounts',
    sales_staff: 'Sales Staff',
    designer: 'Designer',
    employee: 'Employee',
  }[role] || role;

  return `${roleLabel} role cannot ${actionLabels[action]}. Contact your administrator for access.`;
}

/**
 * Check if a specific role has costing view permission
 * Useful for backend checks and conditional fetching
 */
export function canRoleViewCosting(role: OrgRole | null): boolean {
  if (!role) return false;
  return COSTING_PERMISSION_MATRIX[role]?.view ?? false;
}

/**
 * Check if a specific role has costing edit permission
 */
export function canRoleEditCosting(role: OrgRole | null): boolean {
  if (!role) return false;
  return COSTING_PERMISSION_MATRIX[role]?.edit ?? false;
}

/**
 * Check if a specific role has costing profit view permission
 */
export function canRoleViewProfit(role: OrgRole | null): boolean {
  if (!role) return false;
  return COSTING_PERMISSION_MATRIX[role]?.profitView ?? false;
}
