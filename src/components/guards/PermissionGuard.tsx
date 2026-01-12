/**
 * Permission Guard Component
 * 
 * Provides both legacy action-based permissions and new module-based permissions.
 * Use ModulePermissionGuard for the new system.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions/hooks';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { PermissionModule, PermissionAction } from '@/lib/permissions/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Lock } from 'lucide-react';

// ============= LEGACY PERMISSION GUARD (Action-based) =============

interface LegacyPermissionGuardProps {
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
 * Legacy Permission Guard - Uses action-based permissions
 * @deprecated Use ModulePermissionGuard for new code
 */
export const PermissionGuard: React.FC<LegacyPermissionGuardProps> = ({
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

  if (silent) {
    return null;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <AccessDeniedFallback />;
};

// ============= NEW MODULE PERMISSION GUARD =============

interface ModuleGuardProps {
  children: React.ReactNode;
  /** The module permission key (e.g., "main.dashboard", "business.customers") */
  permissionKey: string;
  /** Fallback to show when permission denied */
  fallback?: React.ReactNode;
  /** Redirect path when permission denied */
  redirectTo?: string;
  /** If true, shows nothing when denied */
  silent?: boolean;
}

const ModuleAccessDeniedFallback: React.FC<{ moduleName?: string }> = ({ moduleName }) => (
  <div className="flex items-center justify-center min-h-[300px] p-6">
    <div className="max-w-md w-full text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-destructive" />
      </div>
      <Alert variant="destructive">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to access {moduleName ? `the ${moduleName} module` : 'this content'}.
          Please contact your administrator.
        </AlertDescription>
      </Alert>
    </div>
  </div>
);

/**
 * Module Permission Guard - Uses module-based permissions
 * Recommended for new code
 */
export const ModuleGuard: React.FC<ModuleGuardProps> = ({
  children,
  permissionKey,
  fallback,
  redirectTo,
  silent = false,
}) => {
  const { hasModulePermission, isSuperAdmin, isOrgOwner } = useModulePermissions();

  // Super Admin and Owner always have access
  if (isSuperAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  const hasPermission = hasModulePermission(permissionKey);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (silent) {
    return null;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <ModuleAccessDeniedFallback />;
};

/**
 * Hook to check if component should be visible based on legacy permission
 * @deprecated Use useModulePermissions().hasModulePermission() instead
 */
export function useHasPermission(module: PermissionModule, action: PermissionAction): boolean {
  const { canPerform } = usePermissions();
  return canPerform(module, action);
}

/**
 * Hook to check module permission
 */
export function useHasModulePermission(permissionKey: string): boolean {
  const { hasModulePermission } = useModulePermissions();
  return hasModulePermission(permissionKey);
}

export default PermissionGuard;
