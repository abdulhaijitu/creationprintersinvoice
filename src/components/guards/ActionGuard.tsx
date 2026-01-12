/**
 * ACTION GUARD COMPONENT
 * 
 * Controls visibility of action buttons (Create, Edit, Delete) based on permissions.
 * 
 * RULES:
 * - View permission: Can see read-only data
 * - Create permission: Can see "New/Create" buttons
 * - Edit permission: Can see "Edit" icons/buttons
 * - Delete permission: Can see "Delete" icons/buttons
 * 
 * If permission is missing, the component renders NOTHING (fully hidden, not disabled).
 */

import React from 'react';
import { usePermissionContext, type PermissionAction } from '@/contexts/PermissionContext';

interface ActionGuardProps {
  children: React.ReactNode;
  /** The module key (e.g., "invoices", "customers", "main.invoices") */
  module: string;
  /** The action to check (view, create, edit, delete) */
  action: PermissionAction;
  /** Optional: Fallback content to show if permission denied (default: null) */
  fallback?: React.ReactNode;
}

/**
 * ActionGuard - Conditionally renders children based on action permission
 * 
 * Usage:
 * ```tsx
 * <ActionGuard module="invoices" action="create">
 *   <Button>Create Invoice</Button>
 * </ActionGuard>
 * 
 * <ActionGuard module="customers" action="edit">
 *   <EditIcon />
 * </ActionGuard>
 * 
 * <ActionGuard module="expenses" action="delete">
 *   <DeleteButton />
 * </ActionGuard>
 * ```
 */
export const ActionGuard: React.FC<ActionGuardProps> = ({
  children,
  module,
  action,
  fallback = null,
}) => {
  const { canView, canCreate, canEdit, canDelete, isSuperAdmin, isOrgOwner, permissionsReady } = usePermissionContext();

  // Super Admin and Owner always have access
  if (isSuperAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  // Wait for permissions to load
  if (!permissionsReady) {
    return null;
  }

  // Check specific action permission
  let hasPermission = false;
  switch (action) {
    case 'view':
      hasPermission = canView(module);
      break;
    case 'create':
      hasPermission = canCreate(module);
      break;
    case 'edit':
      hasPermission = canEdit(module);
      break;
    case 'delete':
      hasPermission = canDelete(module);
      break;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * ManageGuard - Shows content if user has ANY manage permission (create OR edit OR delete)
 */
interface ManageGuardProps {
  children: React.ReactNode;
  module: string;
  fallback?: React.ReactNode;
}

export const ManageGuard: React.FC<ManageGuardProps> = ({
  children,
  module,
  fallback = null,
}) => {
  const { canManage, isSuperAdmin, isOrgOwner, permissionsReady } = usePermissionContext();

  if (isSuperAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  if (!permissionsReady) {
    return null;
  }

  if (canManage(module)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * ViewGuard - Shows content only if user has view permission
 */
interface ViewGuardProps {
  children: React.ReactNode;
  module: string;
  fallback?: React.ReactNode;
}

export const ViewGuard: React.FC<ViewGuardProps> = ({
  children,
  module,
  fallback = null,
}) => {
  return (
    <ActionGuard module={module} action="view" fallback={fallback}>
      {children}
    </ActionGuard>
  );
};

/**
 * CreateGuard - Shows content only if user has create permission
 */
export const CreateGuard: React.FC<ViewGuardProps> = ({
  children,
  module,
  fallback = null,
}) => {
  return (
    <ActionGuard module={module} action="create" fallback={fallback}>
      {children}
    </ActionGuard>
  );
};

/**
 * EditGuard - Shows content only if user has edit permission
 */
export const EditGuard: React.FC<ViewGuardProps> = ({
  children,
  module,
  fallback = null,
}) => {
  return (
    <ActionGuard module={module} action="edit" fallback={fallback}>
      {children}
    </ActionGuard>
  );
};

/**
 * DeleteGuard - Shows content only if user has delete permission
 */
export const DeleteGuard: React.FC<ViewGuardProps> = ({
  children,
  module,
  fallback = null,
}) => {
  return (
    <ActionGuard module={module} action="delete" fallback={fallback}>
      {children}
    </ActionGuard>
  );
};

/**
 * Hook for checking action permissions in components
 */
export function useActionPermission(module: string) {
  const { canView, canCreate, canEdit, canDelete, canManage, isSuperAdmin, isOrgOwner, permissionsReady } = usePermissionContext();

  return {
    canView: isSuperAdmin || isOrgOwner || canView(module),
    canCreate: isSuperAdmin || isOrgOwner || canCreate(module),
    canEdit: isSuperAdmin || isOrgOwner || canEdit(module),
    canDelete: isSuperAdmin || isOrgOwner || canDelete(module),
    canManage: isSuperAdmin || isOrgOwner || canManage(module),
    isReady: permissionsReady,
    isPrivileged: isSuperAdmin || isOrgOwner,
  };
}

export default ActionGuard;
