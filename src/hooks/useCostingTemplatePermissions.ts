/**
 * COSTING TEMPLATE PERMISSIONS HOOK
 * 
 * Permission checks for Costing Item Template management.
 * 
 * PERMISSION KEYS:
 * - COSTING_TEMPLATE_VIEW - Can view template list
 * - COSTING_TEMPLATE_EDIT - Can create/edit/delete templates
 * 
 * ROLE MAPPING (LOCKED):
 * - Super Admin / Owner: VIEW + EDIT
 * - Manager: VIEW + EDIT
 * - Accounts: VIEW only
 * - Sales/Designer/Employee: No access
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrgRole } from '@/lib/permissions/constants';

export interface CostingTemplatePermissions {
  /** Can see template list and template management page */
  canView: boolean;
  /** Can create/edit/delete templates */
  canEdit: boolean;
  /** True if templates feature is hidden */
  isHidden: boolean;
  /** User's role for display */
  role: OrgRole | null;
}

/**
 * Role-based template permission matrix
 */
const TEMPLATE_PERMISSION_MATRIX: Record<OrgRole, {
  view: boolean;
  edit: boolean;
}> = {
  owner: { view: true, edit: true },
  manager: { view: true, edit: true },
  accounts: { view: true, edit: false },
  sales_staff: { view: false, edit: false },
  designer: { view: false, edit: false },
  employee: { view: false, edit: false },
};

/**
 * Hook to get costing template permissions for the current user
 */
export function useCostingTemplatePermissions(): CostingTemplatePermissions {
  const { isAdmin } = useAuth();
  const { orgRole, isOrgOwner } = useOrganization();

  return useMemo(() => {
    // Super admin bypass
    if (isAdmin) {
      return {
        canView: true,
        canEdit: true,
        isHidden: false,
        role: 'owner' as OrgRole,
      };
    }

    // Organization owner
    if (isOrgOwner) {
      return {
        canView: true,
        canEdit: true,
        isHidden: false,
        role: 'owner' as OrgRole,
      };
    }

    const role = orgRole as OrgRole | null;
    
    if (!role) {
      return {
        canView: false,
        canEdit: false,
        isHidden: true,
        role: null,
      };
    }

    const perms = TEMPLATE_PERMISSION_MATRIX[role];
    
    if (!perms) {
      return {
        canView: false,
        canEdit: false,
        isHidden: true,
        role,
      };
    }

    return {
      canView: perms.view,
      canEdit: perms.edit,
      isHidden: !perms.view,
      role,
    };
  }, [isAdmin, isOrgOwner, orgRole]);
}
