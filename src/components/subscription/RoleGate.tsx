/**
 * RoleGate Component
 * 
 * Conditionally renders children based on user permissions.
 * This is for UI/UX only - Edge Functions enforce actual security.
 */

import { ReactNode } from 'react';
import { usePermissions } from '@/lib/permissions/hooks';
import { 
  PermissionModule, 
  PermissionAction, 
  OrgRole, 
  ORG_ROLE_DISPLAY,
  isRoleAtLeast,
} from '@/lib/permissions/constants';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleGateProps {
  children: ReactNode;
  /** Organization module for permission check */
  module?: PermissionModule;
  /** Action type for permission check */
  action?: PermissionAction;
  /** Minimum org role required (alternative to module/action) */
  minRole?: OrgRole;
  /** Render nothing instead of blocked message */
  hideWhenBlocked?: boolean;
  /** Show inline message instead of box */
  inline?: boolean;
  /** Custom className */
  className?: string;
  /** Fallback component when blocked */
  fallback?: ReactNode;
}

export const RoleGate = ({
  children,
  module,
  action = 'view',
  minRole,
  hideWhenBlocked = false,
  inline = false,
  className,
  fallback,
}: RoleGateProps) => {
  const { canPerform, hasMinRole, isSuperAdmin, orgRole } = usePermissions();

  // Super Admin always has access when impersonating
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check minimum role if specified
  if (minRole) {
    if (hasMinRole(minRole)) {
      return <>{children}</>;
    }
  } else if (module) {
    // Check module permission
    const result = canPerform(module, action);
    if (result.hasAccess) {
      return <>{children}</>;
    }
  }

  // Blocked
  if (hideWhenBlocked) return null;
  if (fallback) return <>{fallback}</>;

  const requiredRole = minRole ? ORG_ROLE_DISPLAY[minRole] : 'higher';
  const message = `This requires ${requiredRole} access or above.`;

  if (inline) {
    return (
      <span className={cn("text-muted-foreground text-sm flex items-center gap-1", className)}>
        <ShieldAlert className="h-3 w-3" />
        {message}
      </span>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/30 rounded-md",
      className
    )}>
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
};

/**
 * Simple hook for checking permissions in conditional rendering
 */
export const useRoleCheck = (
  module?: PermissionModule, 
  action: PermissionAction = 'view',
  minRole?: OrgRole
): boolean => {
  const { canPerform, hasMinRole, isSuperAdmin } = usePermissions();
  
  if (isSuperAdmin) return true;
  
  if (minRole) {
    return hasMinRole(minRole);
  }
  
  if (module) {
    return canPerform(module, action).hasAccess;
  }
  
  return false;
};

/**
 * Hook for bulk action permission check
 */
export const useBulkActionCheck = (module: PermissionModule): boolean => {
  const { canPerform, isSuperAdmin } = usePermissions();
  if (isSuperAdmin) return true;
  return canPerform(module, 'bulk').hasAccess;
};

/**
 * Hook for import/export permission check
 */
export const useImportExportCheck = (module: PermissionModule): { canImport: boolean; canExport: boolean } => {
  const { canPerform, isSuperAdmin } = usePermissions();
  if (isSuperAdmin) return { canImport: true, canExport: true };
  return {
    canImport: canPerform(module, 'import').hasAccess,
    canExport: canPerform(module, 'export').hasAccess,
  };
};
