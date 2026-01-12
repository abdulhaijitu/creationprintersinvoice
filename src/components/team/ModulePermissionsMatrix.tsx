/**
 * Module Permissions Matrix Component
 * 
 * Allows organization owners to configure module-based permissions for staff roles.
 * Supports View / Create / Edit / Delete actions per module.
 * 
 * CRITICAL RULES:
 * - Super Admin always has all permissions (locked ON)
 * - Owner role always has all permissions (locked ON)
 * - Changes persist to database immediately
 * - Sidebar visibility updates on next navigation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateModulePermissionCache } from '@/hooks/useModulePermissions';
import { 
  PERMISSIONS_BY_CATEGORY,
  CATEGORY_DISPLAY,
  type ModulePermission,
  type PermissionCategory,
} from '@/lib/permissions/modulePermissions';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
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
import { Button } from '@/components/ui/button';
import { 
  Lock,
  Check,
  Loader2,
  Shield,
  ShieldCheck,
  Info,
  RefreshCw,
  AlertTriangle,
  Eye,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrgModulePermission {
  id: string;
  organization_id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

// Staff roles that can have permissions configured (excluding owner)
const STAFF_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

// Permission actions
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

const ACTION_CONFIG: Record<PermissionAction, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  view: { label: 'View', icon: Eye, color: 'text-blue-600' },
  create: { label: 'Create', icon: Plus, color: 'text-green-600' },
  edit: { label: 'Edit', icon: Pencil, color: 'text-amber-600' },
  delete: { label: 'Delete', icon: Trash2, color: 'text-red-600' },
};

// Ordered categories for display
const CATEGORY_ORDER: PermissionCategory[] = ['main', 'business', 'hr_ops', 'system'];

// Build permission key: module.action (e.g., "customers.view")
const buildPermissionKey = (moduleKey: string, action: PermissionAction): string => {
  // Extract module name from key like "main.dashboard" -> "dashboard"
  const moduleName = moduleKey.split('.')[1] || moduleKey;
  return `${moduleName}.${action}`;
};

interface ModulePermissionsMatrixProps {
  className?: string;
  onPermissionsChanged?: () => void;
}

export function ModulePermissionsMatrix({ className, onPermissionsChanged }: ModulePermissionsMatrixProps) {
  const { organization, isOrgOwner } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  const [orgPermissions, setOrgPermissions] = useState<OrgModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  
  // Permission state: Map<"module.action.role", boolean>
  const [permissionState, setPermissionState] = useState<Map<string, boolean>>(new Map());

  /**
   * Build initial state - defaults to false (no access) unless explicitly enabled
   */
  const buildPermissionState = useCallback((orgPerms: OrgModulePermission[]): Map<string, boolean> => {
    const state = new Map<string, boolean>();
    
    // Initialize all permissions as false (no access by default)
    for (const category of CATEGORY_ORDER) {
      for (const perm of PERMISSIONS_BY_CATEGORY[category]) {
        for (const action of PERMISSION_ACTIONS) {
          for (const role of STAFF_ROLES) {
            const permKey = buildPermissionKey(perm.key, action);
            const stateKey = `${permKey}.${role}`;
            state.set(stateKey, false);
          }
        }
      }
    }
    
    // Override with org-specific permissions from database
    for (const perm of orgPerms) {
      for (const role of STAFF_ROLES) {
        if (perm.role === role) {
          const stateKey = `${perm.permission_key}.${role}`;
          state.set(stateKey, perm.is_enabled);
        }
      }
    }
    
    return state;
  }, []);

  /**
   * Fetch permissions from database
   */
  const fetchPermissions = useCallback(async (showToast = false) => {
    if (!organization) return;
    
    setLoading(true);
    try {
      console.log(`[ModulePermissionsMatrix] Fetching permissions for org: ${organization.id}`);
      const { data, error } = await supabase
        .from('org_specific_permissions')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      const perms = data || [];
      const state = buildPermissionState(perms);
      
      if (isMountedRef.current) {
        setOrgPermissions(perms);
        setPermissionState(state);
      }
      console.log(`[ModulePermissionsMatrix] Loaded ${perms.length} permissions`);
      if (showToast) {
        toast.success('Permissions refreshed');
      }
    } catch (error) {
      console.error('[ModulePermissionsMatrix] Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organization, buildPermissionState]);

  useEffect(() => {
    isMountedRef.current = true;
    if (organization) {
      fetchPermissions();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [organization?.id]);

  /**
   * Check if permission is enabled
   */
  const isChecked = useCallback((permissionKey: string, role: OrgRole): boolean => {
    // Owner always has all permissions
    if (role === 'owner') return true;
    return permissionState.get(`${permissionKey}.${role}`) ?? false;
  }, [permissionState]);

  /**
   * Check if permission can be toggled
   */
  const canToggle = useCallback((role: OrgRole): boolean => {
    // Only owner or super admin can edit permissions
    if (!isOrgOwner && !isSuperAdmin) return false;
    // Owner's permissions are locked
    if (role === 'owner') return false;
    return true;
  }, [isOrgOwner, isSuperAdmin]);

  /**
   * Handle permission toggle with immediate database persistence
   */
  const handleToggle = async (permissionKey: string, role: OrgRole) => {
    if (!organization || !canToggle(role)) return;

    const stateKey = `${permissionKey}.${role}`;
    const currentValue = permissionState.get(stateKey) ?? false;
    const newValue = !currentValue;
    
    // Optimistic update
    const newPermissionState = new Map(permissionState);
    newPermissionState.set(stateKey, newValue);
    setPermissionState(newPermissionState);
    
    setSavingKey(stateKey);

    try {
      // Check if we have an existing permission
      const existing = orgPermissions.find(
        p => p.permission_key === permissionKey && p.role === role
      );

      let newOrgPermissions: OrgModulePermission[];

      if (existing) {
        // Update existing permission
        console.log(`[ModulePermissionsMatrix] Updating ${permissionKey} for ${role} to ${newValue}`);
        const { error, data } = await supabase
          .from('org_specific_permissions')
          .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        newOrgPermissions = orgPermissions.map(p => 
          p.id === existing.id ? { ...p, is_enabled: newValue } : p
        );
      } else {
        // Create new permission
        console.log(`[ModulePermissionsMatrix] Creating ${permissionKey} for ${role} = ${newValue}`);
        const { data, error } = await supabase
          .from('org_specific_permissions')
          .insert({
            organization_id: organization.id,
            role,
            permission_key: permissionKey,
            is_enabled: newValue,
          })
          .select()
          .single();

        if (error) throw error;
        newOrgPermissions = [...orgPermissions, data];
      }

      setOrgPermissions(newOrgPermissions);
      
      // Invalidate cache so sidebar updates
      invalidateModulePermissionCache(organization.id);
      
      // Notify parent
      onPermissionsChanged?.();
      
      toast.success(`Permission ${newValue ? 'enabled' : 'disabled'}`, { 
        duration: 1500 
      });
    } catch (error) {
      console.error('[ModulePermissionsMatrix] Error updating permission:', error);
      // Revert on failure
      const revertedState = new Map(permissionState);
      revertedState.set(stateKey, currentValue);
      setPermissionState(revertedState);
      toast.error('Failed to save permission. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  // Access control
  if (!isOrgOwner && !isSuperAdmin) {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Module Permissions</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPermissions(true)}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Configure View / Create / Edit / Delete permissions for each module per role.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Legend */}
          <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-primary/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span>Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              <span>Owner (Locked)</span>
            </div>
            <div className="flex items-center gap-1.5 border-l pl-4">
              {PERMISSION_ACTIONS.map(action => {
                const config = ACTION_CONFIG[action];
                const Icon = config.icon;
                return (
                  <div key={action} className="flex items-center gap-1">
                    <Icon className={cn("h-3 w-3", config.color)} />
                    <span>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px] font-semibold">
                    Module
                  </TableHead>
                  <TableHead className="min-w-[80px] text-center font-semibold">Action</TableHead>
                  {STAFF_ROLES.map((role) => (
                    <TableHead key={role} className="text-center min-w-[90px]">
                      <Badge variant="outline" className="text-xs font-normal">
                        {ORG_ROLE_DISPLAY[role]}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORY_ORDER.map((category) => (
                  <React.Fragment key={category}>
                    {/* Category Header */}
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell 
                        colSpan={STAFF_ROLES.length + 2} 
                        className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-2"
                      >
                        {CATEGORY_DISPLAY[category].label}
                      </TableCell>
                    </TableRow>
                    
                    {/* Permission Rows */}
                    {PERMISSIONS_BY_CATEGORY[category].map((perm) => (
                      <React.Fragment key={perm.key}>
                        {PERMISSION_ACTIONS.map((action, actionIdx) => {
                          const permKey = buildPermissionKey(perm.key, action);
                          const ActionIcon = ACTION_CONFIG[action].icon;
                          const isFirstAction = actionIdx === 0;
                          
                          return (
                            <TableRow 
                              key={`${perm.key}-${action}`}
                              className={cn(
                                "hover:bg-muted/30 transition-colors",
                                actionIdx === PERMISSION_ACTIONS.length - 1 && "border-b-2"
                              )}
                            >
                              {/* Module name - only show on first action row */}
                              <TableCell className="sticky left-0 bg-background border-r">
                                {isFirstAction ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{perm.label}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                      {perm.description}
                                    </span>
                                  </div>
                                ) : null}
                              </TableCell>
                              
                              {/* Action */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <ActionIcon className={cn("h-3.5 w-3.5", ACTION_CONFIG[action].color)} />
                                  <span className="text-xs font-medium">{ACTION_CONFIG[action].label}</span>
                                </div>
                              </TableCell>
                              
                              {/* Role checkboxes */}
                              {STAFF_ROLES.map((role) => {
                                const stateKey = `${permKey}.${role}`;
                                const checked = isChecked(permKey, role);
                                const toggleable = canToggle(role);
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
                                                    handleToggle(permKey, role);
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
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t bg-muted/20">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Important:</strong> Changes are saved immediately. 
                Staff will see updated access after refreshing their browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ModulePermissionsMatrix;
