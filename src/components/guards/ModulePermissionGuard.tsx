/**
 * Module Permission Guard Component
 * 
 * Protects routes and components based on module permissions.
 * If user doesn't have permission for a module, content is completely hidden.
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
import { ShieldAlert, Ban, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ModulePermissionGuardProps {
  children: React.ReactNode;
  /** The module permission key to check (e.g., "main.dashboard", "business.customers") */
  permissionKey?: string;
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
 * Access Denied Fallback Component
 */
const AccessDeniedFallback: React.FC<{ moduleName?: string }> = ({ moduleName }) => (
  <div className="flex items-center justify-center min-h-[400px] p-6">
    <div className="max-w-md w-full space-y-4 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="h-8 w-8 text-destructive" />
      </div>
      <Alert variant="destructive">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle className="flex items-center gap-2">
          <Ban className="h-4 w-4" />
          Access Denied
        </AlertTitle>
        <AlertDescription className="mt-2">
          You don't have permission to access {moduleName ? `the ${moduleName} module` : 'this content'}.
          Please contact your administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
      <Button
        variant="outline"
        onClick={() => window.history.back()}
        className="gap-2"
      >
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
  autoDetect = false,
  fallback,
  redirectTo,
  silent = false,
}) => {
  const location = useLocation();
  const { hasModulePermission, loading, isSuperAdmin, isOrgOwner } = useModulePermissions();

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

  // Check permission
  const hasPermission = hasModulePermission(keyToCheck);

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
  return <AccessDeniedFallback moduleName={moduleName} />;
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
 * Hook to check if a module is accessible
 */
export function useModuleAccess(permissionKey: string): {
  hasAccess: boolean;
  loading: boolean;
} {
  const { hasModulePermission, loading } = useModulePermissions();
  
  return {
    hasAccess: hasModulePermission(permissionKey),
    loading,
  };
}

/**
 * HOC to wrap components with module permission guard
 */
export function withModulePermission<P extends object>(
  Component: React.ComponentType<P>,
  permissionKey: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ModulePermissionGuard permissionKey={permissionKey}>
        <Component {...props} />
      </ModulePermissionGuard>
    );
  };
}

export default ModulePermissionGuard;
