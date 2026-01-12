/**
 * Staff Permissions Matrix Component
 * Allows organization owners to configure role-based permissions
 * Uses module-level caching to prevent refetch on navigation
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  OrgRole, 
  ORG_ROLE_DISPLAY, 
  PermissionModule,
  PERMISSION_MATRIX,
  MODULE_DISPLAY,
  PermissionAction,
  ORG_ROLE_HIERARCHY
} from '@/lib/permissions/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  Plus, 
  Edit, 
  Trash2,
  Lock,
  Check,
  Loader2,
  Shield,
  ShieldCheck,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrgSpecificPermission {
  id: string;
  organization_id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

// Define staff-configurable roles (excluding owner)
const STAFF_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

// Define the actions we show in the matrix
const DISPLAY_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

// Modules to display in the matrix
const DISPLAY_MODULES: PermissionModule[] = [
  'customers',
  'invoices',
  'quotations',
  'expenses',
  'vendors',
  'delivery_challans',
  'employees',
  'reports',
  'tasks',
];

const ACTION_ICONS: Partial<Record<PermissionAction, React.ComponentType<{ className?: string }>>> = {
  view: Eye,
  manage: Edit,
  create: Plus,
  edit: Edit,
  delete: Trash2,
  bulk: Trash2,
  import: Plus,
  export: Eye,
};

const ACTION_LABELS: Partial<Record<PermissionAction, string>> = {
  view: 'View',
  manage: 'Manage',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  bulk: 'Bulk',
  import: 'Import',
  export: 'Export',
};

// Build permission key
const getPermissionKey = (module: PermissionModule, action: PermissionAction): string => {
  return `${module}.${action}`;
};

// Module-level cache for permissions data
const permissionsCache = new Map<string, {
  orgPermissions: OrgSpecificPermission[];
  permissionState: Map<string, boolean>;
  fetchedAt: number;
}>();

const CACHE_TTL = 60000; // 60 seconds

interface StaffPermissionsMatrixProps {
  className?: string;
}

export function StaffPermissionsMatrix({ className }: StaffPermissionsMatrixProps) {
  const { organization, isOrgOwner } = useOrganization();
  
  // Check cache on mount
  const cachedData = organization ? permissionsCache.get(organization.id) : null;
  const isCacheValid = cachedData && (Date.now() - cachedData.fetchedAt < CACHE_TTL);
  
  const [orgPermissions, setOrgPermissions] = useState<OrgSpecificPermission[]>(
    isCacheValid ? cachedData.orgPermissions : []
  );
  const [loading, setLoading] = useState(!isCacheValid);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const hasFetchedRef = useRef(isCacheValid);
  
  // Local permission state: Map<"module.action.role", boolean>
  const [permissionState, setPermissionState] = useState<Map<string, boolean>>(
    isCacheValid ? cachedData.permissionState : new Map()
  );

  // Build initial state from PERMISSION_MATRIX and org-specific overrides
  const buildPermissionState = useCallback((orgPerms: OrgSpecificPermission[]): Map<string, boolean> => {
    const state = new Map<string, boolean>();
    
    // Initialize from PERMISSION_MATRIX (defaults)
    for (const module of DISPLAY_MODULES) {
      for (const action of DISPLAY_ACTIONS) {
        const defaultRoles = PERMISSION_MATRIX[module]?.[action] || [];
        for (const role of STAFF_ROLES) {
          const key = `${module}.${action}.${role}`;
          state.set(key, defaultRoles.includes(role));
        }
      }
    }
    
    // Override with org-specific permissions
    for (const perm of orgPerms) {
      const key = `${perm.permission_key}.${perm.role}`;
      state.set(key, perm.is_enabled);
    }
    
    return state;
  }, []);

  // Helper to update cache
  const updateCache = useCallback((orgPerms: OrgSpecificPermission[], permState: Map<string, boolean>) => {
    if (organization) {
      permissionsCache.set(organization.id, {
        orgPermissions: orgPerms,
        permissionState: permState,
        fetchedAt: Date.now(),
      });
    }
  }, [organization]);

  const fetchPermissions = useCallback(async () => {
    if (!organization) return;
    
    // Skip if we already have cached data
    if (hasFetchedRef.current) {
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_specific_permissions')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      const perms = data || [];
      const state = buildPermissionState(perms);
      
      setOrgPermissions(perms);
      setPermissionState(state);
      updateCache(perms, state);
      hasFetchedRef.current = true;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [organization, buildPermissionState, updateCache]);

  useEffect(() => {
    if (organization && !hasFetchedRef.current) {
      fetchPermissions();
    }
  }, [organization?.id]);

  // Check if permission is enabled
  const isChecked = useCallback((module: PermissionModule, action: PermissionAction, role: OrgRole): boolean => {
    // Owner always has all permissions
    if (role === 'owner') return true;
    return permissionState.get(`${module}.${action}.${role}`) ?? false;
  }, [permissionState]);

  // Check if permission can be toggled
  const canToggle = useCallback((role: OrgRole, module: PermissionModule, action: PermissionAction): boolean => {
    // Only owner can edit permissions
    if (!isOrgOwner) return false;
    // Owner's permissions are locked
    if (role === 'owner') return false;
    // Check if this module/action combination exists in the base matrix
    return !!PERMISSION_MATRIX[module]?.[action];
  }, [isOrgOwner]);

  // Handle permission toggle with optimistic update
  const handleToggle = async (module: PermissionModule, action: PermissionAction, role: OrgRole) => {
    if (!organization || !canToggle(role, module, action)) return;

    const stateKey = `${module}.${action}.${role}`;
    const permKey = getPermissionKey(module, action);
    const currentValue = permissionState.get(stateKey) ?? false;
    const newValue = !currentValue;
    
    // Optimistic update
    const newPermissionState = new Map(permissionState);
    newPermissionState.set(stateKey, newValue);
    setPermissionState(newPermissionState);
    
    setSavingKey(stateKey);

    try {
      // Check if we have an existing org-specific permission
      const existing = orgPermissions.find(
        p => p.permission_key === permKey && p.role === role
      );

      let newOrgPermissions: OrgSpecificPermission[];

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('org_specific_permissions')
          .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;

        newOrgPermissions = orgPermissions.map(p => 
          p.id === existing.id ? { ...p, is_enabled: newValue } : p
        );
      } else {
        // Create new
        const { data, error } = await supabase
          .from('org_specific_permissions')
          .insert({
            organization_id: organization.id,
            role,
            permission_key: permKey,
            is_enabled: newValue,
          })
          .select()
          .single();

        if (error) throw error;

        newOrgPermissions = [...orgPermissions, data];
      }

      setOrgPermissions(newOrgPermissions);
      updateCache(newOrgPermissions, newPermissionState);
      toast.success('Permission updated', { duration: 1500 });
    } catch (error) {
      console.error('Error updating permission:', error);
      // Revert on failure
      const revertedState = new Map(permissionState);
      revertedState.set(stateKey, currentValue);
      setPermissionState(revertedState);
      updateCache(orgPermissions, revertedState);
      toast.error('Failed to update permission');
    } finally {
      setSavingKey(null);
    }
  };

  // Group modules by category for better organization
  const groupedModules = useMemo(() => {
    return {
      'Sales & Customers': ['customers', 'invoices', 'quotations', 'delivery_challans'] as PermissionModule[],
      'Finance': ['expenses', 'vendors'] as PermissionModule[],
      'Operations': ['employees', 'tasks', 'reports'] as PermissionModule[],
    };
  }, []);

  if (!isOrgOwner) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Access Restricted</h3>
              <p className="text-sm text-muted-foreground">
                Only organization owners can manage permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Staff Permissions</CardTitle>
          </div>
          <CardDescription>
            Configure what each role can access. Changes are saved instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Legend */}
          <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-primary/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span>Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              <span>Protected</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              <span>Owner permissions are locked ON</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[160px] font-semibold">
                    Module / Action
                  </TableHead>
                  {STAFF_ROLES.map((role) => (
                    <TableHead key={role} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="text-xs font-normal">
                          {ORG_ROLE_DISPLAY[role]}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedModules).map(([category, modules]) => (
                  <>
                    {/* Category Header */}
                    <TableRow key={category} className="bg-muted/20">
                      <TableCell 
                        colSpan={STAFF_ROLES.length + 1} 
                        className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-2"
                      >
                        {category}
                      </TableCell>
                    </TableRow>
                    
                    {/* Module Rows */}
                    {modules.map((module) => {
                      const availableActions = DISPLAY_ACTIONS.filter(
                        action => PERMISSION_MATRIX[module]?.[action]
                      );

                      return availableActions.map((action, actionIdx) => {
                        const ActionIcon = ACTION_ICONS[action];
                        const isFirstAction = actionIdx === 0;
                        
                        return (
                          <TableRow 
                            key={`${module}-${action}`}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="sticky left-0 bg-background border-r">
                              <div className="flex items-center gap-3">
                                {isFirstAction && (
                                  <span className="font-medium text-sm min-w-[100px]">
                                    {MODULE_DISPLAY[module]}
                                  </span>
                                )}
                                {!isFirstAction && <span className="min-w-[100px]" />}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <ActionIcon className="h-3.5 w-3.5" />
                                  <span className="text-xs">{ACTION_LABELS[action]}</span>
                                </div>
                              </div>
                            </TableCell>
                            
                            {STAFF_ROLES.map((role) => {
                              const stateKey = `${module}.${action}.${role}`;
                              const checked = isChecked(module, action, role);
                              const toggleable = canToggle(role, module, action);
                              const isSaving = savingKey === stateKey;
                              
                              return (
                                <TableCell key={role} className="text-center py-2">
                                  <div className="flex items-center justify-center">
                                    {isSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="relative">
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={() => {
                                                if (toggleable) {
                                                  handleToggle(module, action, role);
                                                }
                                              }}
                                              disabled={!toggleable}
                                              className={cn(
                                                'transition-all duration-200',
                                                !toggleable && 'opacity-60 cursor-not-allowed'
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        {!toggleable && (
                                          <TooltipContent>
                                            <p className="text-xs">
                                              {role === 'owner' 
                                                ? 'Owner permissions are protected'
                                                : 'Only owners can edit permissions'
                                              }
                                            </p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      });
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <p>
              <strong>Note:</strong> Permission changes take effect immediately. 
              Team members may need to refresh their browser to see updated access.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}