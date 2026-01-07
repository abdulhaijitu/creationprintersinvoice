import { ReactNode } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { OrgModule, OrgAction, getOrgRoleDisplayName, PermissionKey } from '@/lib/orgPermissions';
import { OrgRole } from '@/contexts/OrganizationContext';
import { ShieldAlert, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RoleGateProps {
  children: ReactNode;
  /** Permission key for new permission system */
  permissionKey?: PermissionKey;
  /** Organization module for legacy permission check */
  module?: OrgModule;
  /** Action type for permission check */
  action?: OrgAction;
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

const roleHierarchy: OrgRole[] = ['staff', 'accounts', 'manager', 'owner'];

export const RoleGate = ({
  children,
  permissionKey,
  module,
  action = 'view',
  minRole,
  hideWhenBlocked = false,
  inline = false,
  className,
  fallback,
}: RoleGateProps) => {
  const { checkOrgPermission, checkPermissionKey, orgRole, isSuperAdmin, hasCustomPermissions } = useFeatureAccess();

  // Super Admin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check using new permission key if provided
  if (permissionKey) {
    const result = checkPermissionKey(permissionKey);
    if (result.hasAccess) {
      return <>{children}</>;
    }
  } else if (minRole && orgRole) {
    // Check minimum role if specified
    const currentRoleIndex = roleHierarchy.indexOf(orgRole);
    const requiredRoleIndex = roleHierarchy.indexOf(minRole);
    
    if (currentRoleIndex >= requiredRoleIndex) {
      return <>{children}</>;
    }
  } else if (module) {
    // Check legacy module permission
    const result = checkOrgPermission(module, action);
    if (result.hasAccess) {
      return <>{children}</>;
    }
  }

  // Blocked
  if (hideWhenBlocked) return null;
  if (fallback) return <>{fallback}</>;

  const requiredRole = minRole ? getOrgRoleDisplayName(minRole) : 'higher';
  const message = hasCustomPermissions 
    ? 'Access restricted by organization permissions.'
    : `This requires ${requiredRole} access or above.`;

  if (inline) {
    return (
      <span className={cn("text-muted-foreground text-sm flex items-center gap-1", className)}>
        <ShieldAlert className="h-3 w-3" />
        {message}
        {hasCustomPermissions && (
          <Badge variant="secondary" className="text-[10px] ml-1 gap-0.5 px-1 py-0">
            <Building2 className="h-2.5 w-2.5" />
            Custom
          </Badge>
        )}
      </span>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/30 rounded-md",
      className
    )}>
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span className="flex items-center gap-2">
        {message}
        {hasCustomPermissions && (
          <Badge variant="secondary" className="text-[10px] gap-0.5 px-1 py-0">
            <Building2 className="h-2.5 w-2.5" />
            Custom
          </Badge>
        )}
      </span>
    </div>
  );
};

// Simple hook alternative for conditional rendering
export const useRoleCheck = (permissionKey?: PermissionKey, module?: OrgModule, action: OrgAction = 'view'): boolean => {
  const { checkOrgPermission, checkPermissionKey, isSuperAdmin } = useFeatureAccess();
  
  if (isSuperAdmin) return true;
  
  if (permissionKey) {
    return checkPermissionKey(permissionKey).hasAccess;
  }
  
  if (module) {
    return checkOrgPermission(module, action).hasAccess;
  }
  
  return false;
};
