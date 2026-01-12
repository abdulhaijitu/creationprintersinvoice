/**
 * Permission Guard Component
 * 
 * Protects routes and components based on user permissions.
 * Hides content completely if user doesn't have permission.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions/hooks';
import { PermissionModule, PermissionAction } from '@/lib/permissions/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Required permission as [module, action] */
  permission: [PermissionModule, PermissionAction];
  /** Fallback to show when permission denied (instead of redirect) */
  fallback?: React.ReactNode;
  /** Redirect path when permission denied */
  redirectTo?: string;
  /** If true, shows nothing when denied (silent hide) */
  silent?: boolean;
}

/**
 * Access Denied Fallback
 */
const AccessDeniedFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[300px] p-6">
    <Alert variant="destructive" className="max-w-md">
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription>
        You don't have permission to access this content. Please contact your administrator if you
        believe this is an error.
      </AlertDescription>
    </Alert>
  </div>
);

/**
 * Permission Guard - Protects content based on permissions
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  fallback,
  redirectTo,
  silent = false,
}) => {
  const { canPerform } = usePermissions();

  const [module, action] = permission;
  const hasPermission = canPerform(module, action);

  if (hasPermission) {
    return <>{children}</>;
  }

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
  return <AccessDeniedFallback />;
};

/**
 * Hook to check if component should be visible based on permission
 */
export function useHasPermission(module: PermissionModule, action: PermissionAction): boolean {
  const { canPerform } = usePermissions();
  return canPerform(module, action);
}

export default PermissionGuard;
