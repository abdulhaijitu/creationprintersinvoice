/**
 * Module Permission Guard Component
 * 
 * Protects routes and components based on module permissions.
 * Supports action-based permissions: view, create, edit, delete
 * 
 * CRITICAL RULES:
 * - No disabled or greyed-out content - completely hidden
 * - Direct URL access without permission is blocked
 * - Super Admin and Owner always have access
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { getPermissionForRoute } from '@/lib/permissions/modulePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Ban, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

interface ModulePermissionGuardProps {
  children: React.ReactNode;
  /** The module permission key (e.g., "main.dashboard", "business.customers", or "customers") */
  permissionKey?: string;
  /** The action to check (default: "view") */
  action?: PermissionAction;
  /** If true, auto-detect permission from current route */
  autoDetect?: boolean;
  /** Fallback to show when permission denied (instead of redirect) */
  fallback?: React.ReactNode;
  /** Redirect path when permission denied (default: "/") */
  redirectTo?: string;
  /** If true, shows nothing when denied (silent hide) */
  silent?: boolean;
}

/**
 * Access Denied Fallback Component - Premium Design
 */
const AccessDeniedFallback: React.FC<{ moduleName?: string; action?: string }> = ({ 
  moduleName,
  action = 'access'
}) => (
  <div className="flex items-center justify-center min-h-[400px] p-6 animate-fade-in">
    <div className="max-w-md w-full space-y-6 text-center">
      {/* Icon */}
      <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/50 dark:to-rose-950/50 flex items-center justify-center shadow-lg">
        <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      
      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to {action} {moduleName ? `the ${moduleName} module` : 'this content'}.
        </p>
      </div>
      
      {/* Alert */}
      <Alert variant="destructive" className="text-left bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle className="text-sm font-medium">Permission Required</AlertTitle>
        <AlertDescription className="text-xs mt-1">
          Contact your organization administrator to request access.
        </AlertDescription>
      </Alert>
      
      {/* Action Button */}
      <Button
        variant="outline"
        onClick={() => window.history.back()}
        className="gap-2 min-w-[140px]"
      >
        <ArrowLeft className="h-4 w-4" />
        Go Back
      </Button>
    </div>
  </div>
);

/**
 * Loading State Component
 */
const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px] p-6">
    <div className="space-y-4 w-full max-w-md">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4 mx-auto" />
    </div>
  </div>
);

/**
 * Module Permission Guard - Protects content based on module permissions
 */
export const ModulePermissionGuard: React.FC<ModulePermissionGuardProps> = ({
  children,
  permissionKey,
  action = 'view',
  autoDetect = false,
  fallback,
  redirectTo,
  silent = false,
}) => {
  const location = useLocation();
  const { canView, canCreate, canEdit, canDelete, loading, isSuperAdmin, isOrgOwner } = useModulePermissions();

  // Determine which permission key to check
  let keyToCheck = permissionKey;
  let moduleName: string | undefined;
  
  if (autoDetect && !keyToCheck) {
    const permission = getPermissionForRoute(location.pathname);
    if (permission) {
      keyToCheck = permission.key;
      moduleName = permission.label;
    }
  }

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Super Admin and Owner always have access
  if (isSuperAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  // If no permission key specified and not auto-detecting, allow access
  if (!keyToCheck) {
    return <>{children}</>;
  }

  // Check permission based on action
  let hasPermission = false;
  switch (action) {
    case 'view':
      hasPermission = canView(keyToCheck);
      break;
    case 'create':
      hasPermission = canCreate(keyToCheck);
      break;
    case 'edit':
      hasPermission = canEdit(keyToCheck);
      break;
    case 'delete':
      hasPermission = canDelete(keyToCheck);
      break;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  // Permission denied - handle based on configuration

  // Silent mode - render nothing
  if (silent) {
    return null;
  }

  // Redirect mode
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback
  return <AccessDeniedFallback moduleName={moduleName} action={action} />;
};

/**
 * Route Permission Guard - For protecting entire routes
 * Automatically detects permission from current route
 */
export const RoutePermissionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ModulePermissionGuard autoDetect redirectTo="/">
      {children}
    </ModulePermissionGuard>
  );
};

/**
 * Action Guard - For protecting specific actions (create, edit, delete buttons)
 */
interface ActionGuardProps {
  children: React.ReactNode;
  permissionKey: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
}

export const ActionGuard: React.FC<ActionGuardProps> = ({
  children,
  permissionKey,
  action,
  fallback = null,
}) => {
  const { canView, canCreate, canEdit, canDelete, isSuperAdmin, isOrgOwner } = useModulePermissions();

  // Super Admin and Owner always have access
  if (isSuperAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  let hasPermission = false;
  switch (action) {
    case 'view':
      hasPermission = canView(permissionKey);
      break;
    case 'create':
      hasPermission = canCreate(permissionKey);
      break;
    case 'edit':
      hasPermission = canEdit(permissionKey);
      break;
    case 'delete':
      hasPermission = canDelete(permissionKey);
      break;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook to check if a module action is accessible
 */
export function useModuleAccess(permissionKey: string, action: PermissionAction = 'view'): {
  hasAccess: boolean;
  loading: boolean;
} {
  const { canView, canCreate, canEdit, canDelete, loading, isSuperAdmin, isOrgOwner } = useModulePermissions();
  
  if (isSuperAdmin || isOrgOwner) {
    return { hasAccess: true, loading };
  }
  
  let hasAccess = false;
  switch (action) {
    case 'view':
      hasAccess = canView(permissionKey);
      break;
    case 'create':
      hasAccess = canCreate(permissionKey);
      break;
    case 'edit':
      hasAccess = canEdit(permissionKey);
      break;
    case 'delete':
      hasAccess = canDelete(permissionKey);
      break;
  }
  
  return { hasAccess, loading };
}

/**
 * Hook for all CRUD permissions for a module
 */
export function useModuleCRUD(permissionKey: string): {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  loading: boolean;
} {
  const permissions = useModulePermissions();
  
  if (permissions.isSuperAdmin || permissions.isOrgOwner) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      loading: permissions.loading,
    };
  }
  
  return {
    canView: permissions.canView(permissionKey),
    canCreate: permissions.canCreate(permissionKey),
    canEdit: permissions.canEdit(permissionKey),
    canDelete: permissions.canDelete(permissionKey),
    loading: permissions.loading,
  };
}

/**
 * HOC to wrap components with module permission guard
 */
export function withModulePermission<P extends object>(
  Component: React.ComponentType<P>,
  permissionKey: string,
  action: PermissionAction = 'view'
) {
  return function WrappedComponent(props: P) {
    return (
      <ModulePermissionGuard permissionKey={permissionKey} action={action}>
        <Component {...props} />
      </ModulePermissionGuard>
    );
  };
}

export default ModulePermissionGuard;
